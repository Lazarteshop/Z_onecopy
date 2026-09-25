/**
 * Z-oneApp — Phase 2C Content Graph & Normalized Hashtags Engine
 * Authoritative modular helper for Normalized Hashtags, Content Graph Relationships,
 * Privacy-Preserving Discovery, Bounded Trending Calculations, and Related Content Candidates.
 */

export interface HashtagRecord {
  id: string; // Normalized name e.g. "zoneapp"
  displayName: string; // e.g. "#Z-oneApp"
  normalizedName: string; // e.g. "zoneapp"
  usageCount: number;
  postCount: number;
  reelCount: number;
  recentActivity: string; // ISO date of latest content
  createdAt: string; // ISO date of creation
}

export type ContentType = 'post' | 'reel';

export interface ContentGraphSummary {
  id: string;
  type: ContentType;
  title?: string;
  text?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'embed';
  mediaUrls?: string[];
  thumbnailUrl?: string;
  hashtags: string[];
  normalizedHashtags: string[];
  communityId?: string;
  communityName?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
}

export interface RelatedContentCandidate extends ContentGraphSummary {
  relationScore: number;
  sharedHashtags: string[];
  isSameCommunity: boolean;
  isSameAuthor: boolean;
}

// In-Memory Derived Indexes (strictly rebuildable from persistent storage on loadDB())
const hashtagCatalog = new Map<string, HashtagRecord>(); // normalizedName -> HashtagRecord
const hashtagToContentIndex = new Map<string, Set<string>>(); // normalizedName -> Set<contentKey (e.g. "post:123")>
const contentToHashtagsIndex = new Map<string, Set<string>>(); // contentKey -> Set<normalizedName>
const communityToContentIndex = new Map<string, Set<string>>(); // communityId -> Set<contentKey>
const creatorToContentIndex = new Map<string, Set<string>>(); // authorId -> Set<contentKey>

/**
 * Normalizes a single hashtag string safely according to Z-oneApp Phase 2C specs.
 * Example:
 *  "#Z-oneApp" -> display: "#Z-oneApp", normalized: "zoneapp"
 *  "#Z_oneApp" -> display: "#Z_oneApp", normalized: "zoneapp"
 *  "zoneapp"   -> display: "#zoneapp",  normalized: "zoneapp"
 */
export function normalizeHashtag(tag: string): { display: string; normalized: string } | null {
  if (!tag || typeof tag !== 'string') return null;
  const trimmed = tag.trim();
  const rawWithoutHash = trimmed.replace(/^#+/, '').trim();
  if (rawWithoutHash.length < 2 || rawWithoutHash.length > 50) return null;

  // Normalized: lowercased, stripped of hyphens and underscores, purely alphanumeric and standard unicode
  const normalized = rawWithoutHash.toLowerCase().replace(/[-_]/g, '');
  if (!normalized || normalized.length < 2) return null;

  // Preserve display form with single leading '#'
  const display = '#' + rawWithoutHash;

  return { display, normalized };
}

/**
 * Extracts and deduplicates normalized hashtags from text.
 * Enforces safe bounds:
 *  - Max 20 hashtags per item
 *  - Length: 2 to 50 characters
 *  - Case-insensitive & punctuation-insensitive deduplication
 */
export function extractHashtags(text: string): { display: string; normalized: string }[] {
  if (!text || typeof text !== 'string') return [];

  // Match hashtags supporting standard characters, unicode, underscores, and hyphens
  const regex = /(?:^|\s|[^\w#])#([a-zA-Z0-9_\u0590-\u05ff\-]+)/gu;
  const results: { display: string; normalized: string }[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (results.length >= 20) break;
    const rawTag = match[1];
    const parsed = normalizeHashtag(rawTag);
    if (!parsed) continue;

    if (!seen.has(parsed.normalized)) {
      seen.add(parsed.normalized);
      results.push(parsed);
    }
  }

  return results;
}

/**
 * Safely rebuilds all in-memory content graph indexes from persistent records.
 * Invoked during loadDB() to ensure zero index corruption across restarts.
 */
export function rebuildContentGraphIndexes(db: {
  posts?: any[];
  reels?: any[];
  communities?: any[];
  hashtags?: HashtagRecord[];
}): void {
  hashtagCatalog.clear();
  hashtagToContentIndex.clear();
  contentToHashtagsIndex.clear();
  communityToContentIndex.clear();
  creatorToContentIndex.clear();

  // 1. Seed existing persistent hashtags into catalog
  if (Array.isArray(db.hashtags)) {
    for (const h of db.hashtags) {
      if (h && h.normalizedName) {
        hashtagCatalog.set(h.normalizedName, {
          ...h,
          usageCount: 0,
          postCount: 0,
          reelCount: 0
        });
      }
    }
  }

  // 2. Index Posts
  if (Array.isArray(db.posts)) {
    for (const post of db.posts) {
      if (!post || !post.id) continue;
      const contentKey = `post:${post.id}`;

      // Extract hashtags from post.hashtags array or post.text
      const tagSet = new Map<string, { display: string; normalized: string }>();

      if (Array.isArray(post.hashtags)) {
        for (const t of post.hashtags) {
          const parsed = normalizeHashtag(String(t));
          if (parsed && !tagSet.has(parsed.normalized)) {
            tagSet.set(parsed.normalized, parsed);
          }
        }
      }

      if (post.text) {
        const textTags = extractHashtags(post.text);
        for (const parsed of textTags) {
          if (!tagSet.has(parsed.normalized)) {
            tagSet.set(parsed.normalized, parsed);
          }
        }
      }

      // Associate with graph
      const normTags = Array.from(tagSet.values());
      const postNormSet = new Set<string>();

      for (const t of normTags) {
        postNormSet.add(t.normalized);

        // Update hashtagToContentIndex
        let contentSet = hashtagToContentIndex.get(t.normalized);
        if (!contentSet) {
          contentSet = new Set<string>();
          hashtagToContentIndex.set(t.normalized, contentSet);
        }
        contentSet.add(contentKey);

        // Update or create HashtagRecord in catalog
        let rec = hashtagCatalog.get(t.normalized);
        const postTime = post.createdAt || new Date().toISOString();
        if (!rec) {
          rec = {
            id: t.normalized,
            displayName: t.display,
            normalizedName: t.normalized,
            usageCount: 1,
            postCount: 1,
            reelCount: 0,
            recentActivity: postTime,
            createdAt: postTime
          };
          hashtagCatalog.set(t.normalized, rec);
        } else {
          rec.usageCount++;
          rec.postCount++;
          if (new Date(postTime).getTime() > new Date(rec.recentActivity).getTime()) {
            rec.recentActivity = postTime;
            rec.displayName = t.display;
          }
        }
      }

      if (postNormSet.size > 0) {
        contentToHashtagsIndex.set(contentKey, postNormSet);
      }

      // Community index
      if (post.communityId) {
        let commSet = communityToContentIndex.get(post.communityId);
        if (!commSet) {
          commSet = new Set<string>();
          communityToContentIndex.set(post.communityId, commSet);
        }
        commSet.add(contentKey);
      }

      // Creator index
      if (post.userId) {
        let creatorSet = creatorToContentIndex.get(post.userId);
        if (!creatorSet) {
          creatorSet = new Set<string>();
          creatorToContentIndex.set(post.userId, creatorSet);
        }
        creatorSet.add(contentKey);
      }
    }
  }

  // 3. Index Reels
  if (Array.isArray(db.reels)) {
    for (const reel of db.reels) {
      if (!reel || !reel.id) continue;
      // Only index approved reels or reels with undefined status (legacy approved)
      if (reel.status && reel.status !== 'approved') continue;

      const contentKey = `reel:${reel.id}`;
      const tagSet = new Map<string, { display: string; normalized: string }>();

      if (Array.isArray(reel.hashtags)) {
        for (const t of reel.hashtags) {
          const parsed = normalizeHashtag(String(t));
          if (parsed && !tagSet.has(parsed.normalized)) {
            tagSet.set(parsed.normalized, parsed);
          }
        }
      }

      if (reel.title) {
        const titleTags = extractHashtags(reel.title);
        for (const parsed of titleTags) {
          if (!tagSet.has(parsed.normalized)) {
            tagSet.set(parsed.normalized, parsed);
          }
        }
      }

      const normTags = Array.from(tagSet.values());
      const reelNormSet = new Set<string>();

      for (const t of normTags) {
        reelNormSet.add(t.normalized);

        let contentSet = hashtagToContentIndex.get(t.normalized);
        if (!contentSet) {
          contentSet = new Set<string>();
          hashtagToContentIndex.set(t.normalized, contentSet);
        }
        contentSet.add(contentKey);

        let rec = hashtagCatalog.get(t.normalized);
        const reelTime = reel.createdAt || new Date().toISOString();
        if (!rec) {
          rec = {
            id: t.normalized,
            displayName: t.display,
            normalizedName: t.normalized,
            usageCount: 1,
            postCount: 0,
            reelCount: 1,
            recentActivity: reelTime,
            createdAt: reelTime
          };
          hashtagCatalog.set(t.normalized, rec);
        } else {
          rec.usageCount++;
          rec.reelCount++;
          if (new Date(reelTime).getTime() > new Date(rec.recentActivity).getTime()) {
            rec.recentActivity = reelTime;
            rec.displayName = t.display;
          }
        }
      }

      if (reelNormSet.size > 0) {
        contentToHashtagsIndex.set(contentKey, reelNormSet);
      }

      const authorId = reel.addedByUserId;
      if (authorId) {
        let creatorSet = creatorToContentIndex.get(authorId);
        if (!creatorSet) {
          creatorSet = new Set<string>();
          creatorToContentIndex.set(authorId, creatorSet);
        }
        creatorSet.add(contentKey);
      }
    }
  }

  // Synchronize persistent hashtag array with non-zero usage records
  db.hashtags = Array.from(hashtagCatalog.values()).filter(h => h.usageCount > 0);
}

/**
 * Returns raw item from persistent db given a contentKey (e.g. "post:123" or "reel:456").
 */
export function getContentItem(contentKey: string, db: any): { item: any; type: ContentType } | null {
  if (!contentKey || typeof contentKey !== 'string') return null;
  const [type, id] = contentKey.split(':');
  if (type === 'post' && Array.isArray(db.posts)) {
    const p = db.posts.find((x: any) => x && x.id === id);
    return p ? { item: p, type: 'post' } : null;
  }
  if (type === 'reel' && Array.isArray(db.reels)) {
    const r = db.reels.find((x: any) => x && x.id === id);
    return r ? { item: r, type: 'reel' } : null;
  }
  return null;
}

/**
 * CRITICAL PRIVACY & VISIBILITY FILTER:
 * Evaluates whether a post or reel is publicly viewable by requesterId.
 * Guarantees:
 *  - Excludes hidden posts
 *  - Excludes blocked user content (bidirectional block check)
 *  - Excludes muted user content
 *  - Excludes private community content if requester is NOT a member
 *  - Excludes unapproved reels
 */
export function isContentVisibleToUser(
  contentKey: string,
  db: any,
  requesterId?: string
): boolean {
  const content = getContentItem(contentKey, db);
  if (!content) return false;

  const { item, type } = content;

  // 1. Check if post is marked hidden by this requester
  if (type === 'post' && requesterId && db.userHiddenPosts?.[requesterId]?.includes(item.id)) {
    return false;
  }

  // 2. Author Block & Mute Check
  const authorId = type === 'post' ? item.userId : item.addedByUserId;
  if (authorId && requesterId) {
    if (authorId === requesterId) {
      // User can always see their own content
    } else {
      const myBlocks = db.userBlocks?.[requesterId] || [];
      const theirBlocks = db.userBlocks?.[authorId] || [];
      if (myBlocks.includes(authorId) || theirBlocks.includes(requesterId)) {
        return false;
      }
      const myMutes = db.userMutes?.[requesterId] || [];
      if (myMutes.includes(authorId)) {
        return false;
      }
    }
  }

  // 3. Reel Status Check
  if (type === 'reel') {
    if (item.status && item.status !== 'approved') {
      if (!requesterId || requesterId !== (item.addedByUserId || item.userId)) {
        return false;
      }
    }
  }

  // 4. Post Privacy Guard
  if (type === 'post') {
    if (item.privacy === 'private') {
      if (!requesterId || requesterId !== item.userId) {
        return false;
      }
    } else if (item.privacy === 'friends') {
      if (!requesterId) return false;
      if (requesterId !== item.userId) {
        const authorFriends = db.friends?.[item.userId] || [];
        if (!authorFriends.includes(requesterId)) return false;
      }
    } else if (item.privacy === 'members') {
      if (!requesterId) return false;
      if (item.communityId) {
        const comm = (db.communities || []).find((c: any) => c && c.id === item.communityId);
        if (comm) {
          const isMember = (comm.members || []).some((m: any) => {
            if (typeof m === 'string') return m === requesterId;
            return m?.userId === requesterId || m?.id === requesterId;
          });
          if (!isMember && requesterId !== comm.ownerId && requesterId !== item.userId) {
            return false;
          }
        }
      }
    }
  }

  // 5. Community Privacy Guard (Phase 2B Integration)
  // Private communities must NEVER leak content to public or non-members
  if ((type === 'post' || type === 'reel') && item.communityId) {
    const comm = (db.communities || []).find((c: any) => c && c.id === item.communityId);
    if (comm && (comm.privacy === 'private' || comm.isPrivate === true)) {
      if (!requesterId) return false; // Anonymous requests cannot view private community content
      const isMember = (comm.members || []).some((m: any) => {
        if (typeof m === 'string') return m === requesterId;
        return m?.userId === requesterId || m?.id === requesterId;
      });
      const creatorId = item.addedByUserId || item.userId;
      if (!isMember && requesterId !== comm.ownerId && requesterId !== comm.adminId && requesterId !== creatorId) {
        return false; // Must be an accepted member or creator
      }
    }
  }

  return true;
}

/**
 * Formats a post or reel into a standardized ContentGraphSummary.
 */
export function formatContentSummary(item: any, type: ContentType, db: any): ContentGraphSummary {
  if (type === 'post') {
    const rawTags = (item.hashtags || []).map((t: string) => String(t));
    const normalized = rawTags.map((t: string) => normalizeHashtag(t)?.normalized || '').filter(Boolean);
    const comm = item.communityId ? (db.communities || []).find((c: any) => c.id === item.communityId) : null;

    return {
      id: item.id,
      type: 'post',
      text: item.text || '',
      authorId: item.userId,
      authorName: item.userName || 'Ka-Zone User',
      authorAvatar: item.userAvatar || '👤',
      mediaUrl: item.mediaUrl,
      mediaType: item.mediaType,
      mediaUrls: item.mediaUrls,
      hashtags: rawTags,
      normalizedHashtags: normalized,
      communityId: item.communityId,
      communityName: comm ? comm.name : undefined,
      likesCount: Array.isArray(item.likes) ? item.likes.length : 0,
      commentsCount: Array.isArray(item.comments) ? item.comments.length : 0,
      sharesCount: item.sharesCount || 0,
      createdAt: item.createdAt || new Date().toISOString()
    };
  } else {
    // Reel
    const rawTags = (item.hashtags || []).map((t: string) => String(t));
    const normalized = rawTags.map((t: string) => normalizeHashtag(t)?.normalized || '').filter(Boolean);

    return {
      id: item.id,
      type: 'reel',
      title: item.title || 'Reel Video',
      authorId: item.addedByUserId || 'system',
      authorName: item.addedBy || 'Ka-Zone Creator',
      authorAvatar: item.authorAvatar || '👤',
      mediaUrl: item.url,
      thumbnailUrl: item.thumbnailUrl,
      hashtags: rawTags,
      normalizedHashtags: normalized,
      likesCount: typeof item.likes === 'number' ? item.likes : (Array.isArray(item.likedBy) ? item.likedBy.length : 0),
      commentsCount: Array.isArray(item.comments) ? item.comments.length : (item.commentsCount || 0),
      sharesCount: item.sharesCount || 0,
      createdAt: item.createdAt || new Date().toISOString()
    };
  }
}

/**
 * Hashtag Content Discovery:
 * Resolves content associated with a normalized hashtag with bounded pagination,
 * privacy guarantees, and deterministic sorting.
 */
export function queryHashtagContent(
  tagParam: string,
  db: any,
  requesterId?: string,
  options: {
    page?: number;
    limit?: number;
    type?: 'all' | 'post' | 'reel';
    sort?: 'recent' | 'popular';
  } = {}
) {
  const parsedTag = normalizeHashtag(tagParam);
  if (!parsedTag) {
    return {
      success: false,
      error: 'Wastong hashtag ang kinakailangan (2-50 characters).',
      hashtag: null,
      items: [],
      total: 0,
      page: 1,
      totalPages: 0,
      hasMore: false
    };
  }

  const { normalized, display } = parsedTag;
  const contentKeys = hashtagToContentIndex.get(normalized) || new Set<string>();

  // Filter content by visibility, type, and block status
  const filterType = options.type || 'all';
  const eligibleKeys: string[] = [];

  for (const key of contentKeys) {
    if (filterType !== 'all' && !key.startsWith(filterType + ':')) {
      continue;
    }
    if (isContentVisibleToUser(key, db, requesterId)) {
      eligibleKeys.push(key);
    }
  }

  // Resolve items
  const summaries: ContentGraphSummary[] = [];
  for (const key of eligibleKeys) {
    const raw = getContentItem(key, db);
    if (raw) {
      summaries.push(formatContentSummary(raw.item, raw.type, db));
    }
  }

  // Sort
  const sortMode = options.sort || 'recent';
  if (sortMode === 'popular') {
    summaries.sort((a, b) => {
      const scoreA = (a.likesCount * 2) + (a.commentsCount * 3) + (a.sharesCount * 4);
      const scoreB = (b.likesCount * 2) + (b.commentsCount * 3) + (b.sharesCount * 4);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else {
    // Recent
    summaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Bounded Pagination (Limit 1..30)
  const page = Math.max(Number(options.page) || 1, 1);
  const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 30);
  const total = summaries.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedItems = summaries.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < total;

  // Metadata
  const catalogRecord = hashtagCatalog.get(normalized);
  const hashtagMeta: HashtagRecord = catalogRecord || {
    id: normalized,
    displayName: display,
    normalizedName: normalized,
    usageCount: total,
    postCount: summaries.filter(s => s.type === 'post').length,
    reelCount: summaries.filter(s => s.type === 'reel').length,
    recentActivity: summaries.length > 0 ? summaries[0].createdAt : new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  return {
    success: true,
    hashtag: hashtagMeta,
    items: paginatedItems,
    total,
    page,
    totalPages,
    hasMore
  };
}

/**
 * Hashtag Search:
 * Prefix and substring matching over the normalized hashtag catalog.
 * Limit bounded (1..30).
 */
export function searchHashtags(
  query: string,
  options: { page?: number; limit?: number } = {}
): { results: HashtagRecord[]; totalMatches: number; page: number; totalPages: number } {
  const cleanQ = (query || '').trim().toLowerCase().replace(/^#+/, '').replace(/[-_]/g, '');
  if (!cleanQ) {
    return { results: [], totalMatches: 0, page: 1, totalPages: 0 };
  }

  const matches: { record: HashtagRecord; matchScore: number }[] = [];

  for (const h of hashtagCatalog.values()) {
    if (h.usageCount <= 0) continue;

    let score = 0;
    if (h.normalizedName === cleanQ) {
      score = 100; // Exact match
    } else if (h.normalizedName.startsWith(cleanQ)) {
      score = 50; // Prefix match
    } else if (h.normalizedName.includes(cleanQ) || h.displayName.toLowerCase().includes(cleanQ)) {
      score = 20; // Substring match
    }

    if (score > 0) {
      // Add usage count weight
      score += Math.min(h.usageCount, 50);
      matches.push({ record: h, matchScore: score });
    }
  }

  matches.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (b.record.usageCount !== a.record.usageCount) return b.record.usageCount - a.record.usageCount;
    return new Date(b.record.recentActivity).getTime() - new Date(a.record.recentActivity).getTime();
  });

  const page = Math.max(Number(options.page) || 1, 1);
  const limit = Math.min(Math.max(Number(options.limit) || 15, 1), 30);
  const totalMatches = matches.length;
  const totalPages = Math.ceil(totalMatches / limit) || 1;
  const startIndex = (page - 1) * limit;
  const results = matches.slice(startIndex, startIndex + limit).map(m => m.record);

  return { results, totalMatches, page, totalPages };
}

/**
 * Bounded Trending Hashtags:
 * Identifies high-velocity hashtags using only safe public signals
 * (usage count, recent activity, content volume within recent window).
 * Excludes all private/financial/personal telemetry.
 */
export function getTrendingHashtags(options: { limit?: number; days?: number } = {}): HashtagRecord[] {
  const limit = Math.min(Math.max(Number(options.limit) || 10, 1), 20);
  const days = Math.min(Math.max(Number(options.days) || 7, 1), 30);
  const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);

  const scoredList: { record: HashtagRecord; trendingScore: number }[] = [];

  for (const h of hashtagCatalog.values()) {
    if (h.usageCount <= 0) continue;

    const activityTime = new Date(h.recentActivity).getTime();
    const ageHours = Math.max(0, (Date.now() - activityTime) / (1000 * 60 * 60));

    // Heavy decay if no activity within specified days
    if (activityTime < cutoffMs) {
      continue;
    }

    // Velocity score: recency decay + total volume
    const recencyWeight = 100 / (1 + ageHours / 12);
    const volumeWeight = (h.usageCount * 6) + (h.postCount * 2) + (h.reelCount * 3);
    const trendingScore = recencyWeight + volumeWeight;

    scoredList.push({ record: h, trendingScore });
  }

  // Fallback to top volume if no recent hashtags inside time window
  if (scoredList.length === 0) {
    for (const h of hashtagCatalog.values()) {
      if (h.usageCount > 0) {
        scoredList.push({ record: h, trendingScore: h.usageCount });
      }
    }
  }

  scoredList.sort((a, b) => b.trendingScore - a.trendingScore);

  return scoredList.slice(0, limit).map(s => s.record);
}

/**
 * Related Content Discovery:
 * Gathers bounded candidates for a post or reel using public graph relationships:
 *  - Shared normalized hashtags (highest weight)
 *  - Same public community
 *  - Same content creator
 * Strictly respects privacy, blocklists, and private-community protections.
 */
export function getRelatedContent(
  targetContentKey: string,
  db: any,
  requesterId?: string,
  options: { limit?: number; type?: 'all' | 'post' | 'reel' } = {}
): {
  success: boolean;
  targetId: string;
  targetType: ContentType;
  related: RelatedContentCandidate[];
  total: number;
} {
  const target = getContentItem(targetContentKey, db);
  if (!target) {
    return {
      success: false,
      targetId: targetContentKey,
      targetType: 'post',
      related: [],
      total: 0
    };
  }

  const { item: targetItem, type: targetType } = target;
  const targetNormTags = contentToHashtagsIndex.get(targetContentKey) || new Set<string>();
  const targetCommunityId = targetType === 'post' ? targetItem.communityId : undefined;
  const targetAuthorId = targetType === 'post' ? targetItem.userId : targetItem.addedByUserId;

  // Bounded candidate pool (Max 100 candidates to preserve fast response times)
  const candidateKeys = new Set<string>();

  // 1. Gather from shared hashtags
  for (const tag of targetNormTags) {
    const keys = hashtagToContentIndex.get(tag);
    if (keys) {
      for (const k of keys) {
        if (k !== targetContentKey) {
          candidateKeys.add(k);
          if (candidateKeys.size >= 100) break;
        }
      }
    }
    if (candidateKeys.size >= 100) break;
  }

  // 2. Gather from same community (if public)
  if (targetCommunityId && candidateKeys.size < 100) {
    const commKeys = communityToContentIndex.get(targetCommunityId);
    if (commKeys) {
      for (const k of commKeys) {
        if (k !== targetContentKey) {
          candidateKeys.add(k);
          if (candidateKeys.size >= 100) break;
        }
      }
    }
  }

  // 3. Gather from same creator
  if (targetAuthorId && candidateKeys.size < 100) {
    const creatorKeys = creatorToContentIndex.get(targetAuthorId);
    if (creatorKeys) {
      for (const k of creatorKeys) {
        if (k !== targetContentKey) {
          candidateKeys.add(k);
          if (candidateKeys.size >= 100) break;
        }
      }
    }
  }

  // Filter & Score Candidates
  const filterType = options.type || 'all';
  const scoredCandidates: RelatedContentCandidate[] = [];

  for (const cKey of candidateKeys) {
    if (filterType !== 'all' && !cKey.startsWith(filterType + ':')) {
      continue;
    }

    if (!isContentVisibleToUser(cKey, db, requesterId)) {
      continue;
    }

    const candidateRaw = getContentItem(cKey, db);
    if (!candidateRaw) continue;

    const candSummary = formatContentSummary(candidateRaw.item, candidateRaw.type, db);
    const candNormTags = contentToHashtagsIndex.get(cKey) || new Set<string>();

    // Shared tags overlap
    const shared: string[] = [];
    for (const t of targetNormTags) {
      if (candNormTags.has(t)) {
        const catRec = hashtagCatalog.get(t);
        shared.push(catRec ? catRec.displayName : `#${t}`);
      }
    }

    const isSameCommunity = Boolean(targetCommunityId && candSummary.communityId === targetCommunityId);
    const isSameAuthor = Boolean(targetAuthorId && candSummary.authorId === targetAuthorId);

    // Score calculation
    let score = (shared.length * 4);
    if (isSameCommunity) score += 3;
    if (isSameAuthor) score += 2;
    if (candSummary.type === targetType) score += 1;

    scoredCandidates.push({
      ...candSummary,
      relationScore: score,
      sharedHashtags: shared,
      isSameCommunity,
      isSameAuthor
    });
  }

  scoredCandidates.sort((a, b) => {
    if (b.relationScore !== a.relationScore) return b.relationScore - a.relationScore;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const limit = Math.min(Math.max(Number(options.limit) || 8, 1), 20);
  const boundedResults = scoredCandidates.slice(0, limit);

  return {
    success: true,
    targetId: targetItem.id,
    targetType,
    related: boundedResults,
    total: scoredCandidates.length
  };
}

/**
 * Mutation Event: Post or Reel Created.
 * Increments catalog counts and attaches to indexes.
 */
export function onContentCreated(
  contentKey: string,
  rawTags: string[],
  communityId?: string,
  authorId?: string,
  createdAt?: string
): void {
  const normSet = new Set<string>();
  const now = createdAt || new Date().toISOString();
  const [type] = contentKey.split(':') as [ContentType, string];

  for (const raw of rawTags) {
    const parsed = normalizeHashtag(raw);
    if (!parsed || normSet.has(parsed.normalized)) continue;
    normSet.add(parsed.normalized);

    // Graph mapping
    let cSet = hashtagToContentIndex.get(parsed.normalized);
    if (!cSet) {
      cSet = new Set<string>();
      hashtagToContentIndex.set(parsed.normalized, cSet);
    }
    cSet.add(contentKey);

    // Catalog update
    let rec = hashtagCatalog.get(parsed.normalized);
    if (!rec) {
      rec = {
        id: parsed.normalized,
        displayName: parsed.display,
        normalizedName: parsed.normalized,
        usageCount: 1,
        postCount: type === 'post' ? 1 : 0,
        reelCount: type === 'reel' ? 1 : 0,
        recentActivity: now,
        createdAt: now
      };
      hashtagCatalog.set(parsed.normalized, rec);
    } else {
      rec.usageCount++;
      if (type === 'post') rec.postCount++;
      else rec.reelCount++;
      rec.recentActivity = now;
      rec.displayName = parsed.display;
    }
  }

  if (normSet.size > 0) {
    contentToHashtagsIndex.set(contentKey, normSet);
  }

  if (communityId) {
    let commSet = communityToContentIndex.get(communityId);
    if (!commSet) {
      commSet = new Set<string>();
      communityToContentIndex.set(communityId, commSet);
    }
    commSet.add(contentKey);
  }

  if (authorId) {
    let creatorSet = creatorToContentIndex.get(authorId);
    if (!creatorSet) {
      creatorSet = new Set<string>();
      creatorToContentIndex.set(authorId, creatorSet);
    }
    creatorSet.add(contentKey);
  }
}

/**
 * Mutation Event: Post Edited.
 * Safely decrements removed tags and increments added tags.
 */
export function onContentEdited(
  contentKey: string,
  oldRawTags: string[],
  newRawTags: string[],
  communityId?: string
): void {
  const oldNorm = new Set<string>();
  for (const t of oldRawTags) {
    const p = normalizeHashtag(t);
    if (p) oldNorm.add(p.normalized);
  }

  const newNorm = new Set<string>();
  for (const t of newRawTags) {
    const p = normalizeHashtag(t);
    if (p) newNorm.add(p.normalized);
  }

  const [type] = contentKey.split(':') as [ContentType, string];

  // Removed tags
  for (const tag of oldNorm) {
    if (!newNorm.has(tag)) {
      const cSet = hashtagToContentIndex.get(tag);
      if (cSet) {
        cSet.delete(contentKey);
        if (cSet.size === 0) {
          hashtagToContentIndex.delete(tag);
        }
      }
      const rec = hashtagCatalog.get(tag);
      if (rec) {
        rec.usageCount = Math.max(0, rec.usageCount - 1);
        if (type === 'post') rec.postCount = Math.max(0, rec.postCount - 1);
        else rec.reelCount = Math.max(0, rec.reelCount - 1);
      }
    }
  }

  // Added tags
  const now = new Date().toISOString();
  for (const tag of newNorm) {
    if (!oldNorm.has(tag)) {
      let cSet = hashtagToContentIndex.get(tag);
      if (!cSet) {
        cSet = new Set<string>();
        hashtagToContentIndex.set(tag, cSet);
      }
      cSet.add(contentKey);

      let rec = hashtagCatalog.get(tag);
      if (!rec) {
        rec = {
          id: tag,
          displayName: '#' + tag,
          normalizedName: tag,
          usageCount: 1,
          postCount: type === 'post' ? 1 : 0,
          reelCount: type === 'reel' ? 1 : 0,
          recentActivity: now,
          createdAt: now
        };
        hashtagCatalog.set(tag, rec);
      } else {
        rec.usageCount++;
        if (type === 'post') rec.postCount++;
        else rec.reelCount++;
        rec.recentActivity = now;
      }
    }
  }

  contentToHashtagsIndex.set(contentKey, newNorm);

  if (communityId) {
    let commSet = communityToContentIndex.get(communityId);
    if (!commSet) {
      commSet = new Set<string>();
      communityToContentIndex.set(communityId, commSet);
    }
    commSet.add(contentKey);
  }
}

/**
 * Mutation Event: Post or Reel Deleted.
 * Cleans up in-memory graph, decrements hashtag catalog usage counts, and removes stale references.
 */
export function onContentDeleted(contentKey: string): void {
  const [type] = contentKey.split(':') as [ContentType, string];
  const tags = contentToHashtagsIndex.get(contentKey);

  if (tags) {
    for (const tag of tags) {
      const cSet = hashtagToContentIndex.get(tag);
      if (cSet) {
        cSet.delete(contentKey);
        if (cSet.size === 0) {
          hashtagToContentIndex.delete(tag);
        }
      }
      const rec = hashtagCatalog.get(tag);
      if (rec) {
        rec.usageCount = Math.max(0, rec.usageCount - 1);
        if (type === 'post') rec.postCount = Math.max(0, rec.postCount - 1);
        else rec.reelCount = Math.max(0, rec.reelCount - 1);
      }
    }
    contentToHashtagsIndex.delete(contentKey);
  }

  // Remove from community index
  for (const cSet of communityToContentIndex.values()) {
    cSet.delete(contentKey);
  }

  // Remove from creator index
  for (const crSet of creatorToContentIndex.values()) {
    crSet.delete(contentKey);
  }
}

/**
  * Returns an overview of the content graph state (counts, size).
  */
export function getContentGraphSummary(): {
  totalUniqueHashtags: number;
  totalIndexedItems: number;
  totalCommunities: number;
  totalCreators: number;
} {
  const uniqueItems = new Set<string>();
  for (const set of hashtagToContentIndex.values()) {
    for (const key of set) uniqueItems.add(key);
  }
  return {
    totalUniqueHashtags: hashtagCatalog.size,
    totalIndexedItems: uniqueItems.size,
    totalCommunities: communityToContentIndex.size,
    totalCreators: creatorToContentIndex.size
  };
}
