/**
 * PHASE 3: SMART HOME FEED & PERSONALIZED DISCOVERY ENGINE
 * Authoritative Target: Lazarteshop/Z_onecopy
 * 
 * Strict Additive Recommendation Architecture:
 * - Deterministic, explainable, bounded scoring (no external AI dependency).
 * - Multi-source candidate pooling (Friends, Following, Communities, Hashtags, Trending).
 * - Strict privacy enforcement (identical to Phase 1, 2A, 2B, 2C).
 * - Author diversity and anti-repetition protection.
 * - Guaranteed fallback to standard feed if candidate pool is insufficient or fails.
 * - Zero financial mutation (₱0.00 delta).
 * - Purely additive to existing social graph infrastructure.
 */

import { areFriends, getFriendIds, getMutualFriendIds } from './phase1Social';
import { getFollowingIds, isFollowing, generateSuggestedCreators } from './phase2Discovery';
import { getUserCommunityIds, isUserInCommunity } from './phase2bCommunities';
import { isContentVisibleToUser, getTrendingHashtags, extractHashtags } from './phase2cContentGraph';
import { ZonePost, SmartFeedSection, SmartFeedResponse, ReactionType } from '../src/types';

// ============================================================================
// CONFIGURABLE SCORING WEIGHTS & BOUNDS
// ============================================================================

export const SMART_FEED_WEIGHTS = {
  // Relationship Signals
  FRIEND: 45,
  FRIEND_POST: 45,
  FOLLOWING: 30,
  FOLLOWING_POST: 30,
  MUTUAL_CONNECTION: 15,
  SELF: 10,
  SUGGESTED_CREATOR: 12,

  // Community Signals
  MEMBER_COMMUNITY: 25,
  COMMUNITY_MEMBER: 25,
  PUBLIC_COMMUNITY: 8,

  // Content & Hashtag Affinity
  USER_HASHTAG_AFFINITY: 15, // per matched hashtag
  MAX_HASHTAG_AFFINITY: 30,
  TRENDING_HASHTAG: 12,

  // Engagement Signals (bounded)
  ENGAGEMENT_LIKE_WEIGHT: 1.5,
  LIKE: 1.5,
  ENGAGEMENT_COMMENT_WEIGHT: 2.5,
  COMMENT: 2.5,
  ENGAGEMENT_SHARE_WEIGHT: 3.5,
  SHARE: 3.5,
  MAX_ENGAGEMENT_SCORE: 50,

  // Freshness / Recency Decay
  FRESHNESS_MAX_SCORE: 50,
  FRESHNESS_HALF_LIFE_HOURS: 14, // 14 hours half-life
  MAX_AGE_DAYS: 30, // older than 30 days receives 0 freshness score

  // Content Richness & Quality
  MEDIA_PRESENCE: 12,
  COMMERCE_ATTACHED: 8,
  VERIFIED_OR_ADMIN: 10,

  // Diversity & Penalties
  CREATOR_REPETITION_PENALTY_STEP: 15,
  MAX_CREATOR_ITEMS_PER_PAGE: 3,

  // Bounded Engine Limits
  MAX_CANDIDATE_POOL: 150,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 30,
  MIN_PAGE_SIZE: 1,

  // Cache TTL (milliseconds)
  CACHE_TTL_MS: 30000 // 30 seconds
} as const;

// ============================================================================
// INTERNAL TYPES
// ============================================================================

export type SmartFeedReason = 'friend' | 'following' | 'community' | 'hashtag' | 'trending' | 'popular' | 'fresh' | 'suggested_creator';

export interface FeedCandidate {
  contentKey: string; // 'post:${id}' or 'reel:${id}'
  type: 'post' | 'reel';
  rawItem: any;
  authorId: string;
  communityId?: string;
  createdAt: string;
  createdAtMs: number;
  candidateSource: 'friend' | 'following' | 'community' | 'hashtag' | 'trending' | 'creator' | 'public';
  matchedHashtags?: string[];
  calculatedScore?: number;
  recommendationReason?: SmartFeedReason;
  recommendationLabel?: string;
}

interface CacheEntry {
  timestamp: number;
  items: ZonePost[];
  totalAvailable: number;
}

// User-scoped cache for 30s recommendation reuse across pagination
const recommendationCache = new Map<string, CacheEntry>();

/**
 * Normalizes string section inputs to strict SmartFeedSection types.
 */
export function normalizeSection(rawSection?: string): SmartFeedSection {
  const s = (rawSection || 'for-you').toLowerCase().trim();
  if (s === 'friends' || s === 'friend' || s === 'kaibigan') return 'friends';
  if (s === 'following' || s === 'sinusubaybayan' || s === 'zoned') return 'following';
  if (s === 'communities' || s === 'community' || s === 'komunidad') return 'communities';
  if (s === 'trending' || s === 'popular' || s === 'patok') return 'trending';
  if (s === 'explore' || s === 'discovery' || s === 'lahat') return 'explore';
  return 'for-you';
}

/**
 * Extracts a user's recent interest hashtags from their authored, reacted, or saved content.
 */
function extractUserInterestHashtags(db: any, userId: string): Set<string> {
  const affinityTags = new Set<string>();
  if (!userId) return affinityTags;

  const rawPosts: any[] = db.posts || [];

  // 1. Tags from user's own recent posts (last 10)
  const userOwnPosts = rawPosts
    .filter(p => p.userId === userId)
    .slice(-10);

  for (const post of userOwnPosts) {
    const tags = post.normalizedHashtags || post.hashtags?.map((t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '')) || [];
    for (const t of tags) {
      if (t) affinityTags.add(t);
      if (affinityTags.size >= 10) break;
    }
  }

  // 2. Tags from posts the user liked or reacted to
  if (affinityTags.size < 10) {
    const reactedPosts = rawPosts
      .filter(p => (p.likes && p.likes.includes(userId)) || (p.reactions && p.reactions.some((r: any) => r.userId === userId)))
      .slice(-15);

    for (const post of reactedPosts) {
      const tags = post.normalizedHashtags || post.hashtags?.map((t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '')) || [];
      for (const t of tags) {
        if (t) affinityTags.add(t);
        if (affinityTags.size >= 10) break;
      }
    }
  }

  return affinityTags;
}

/**
 * Resolves user relationships from in-memory graph modules with full fallback to db structure.
 */
function resolveUserRelations(db: any, requesterId?: string) {
  const friendIds = new Set<string>(requesterId ? getFriendIds(requesterId) : []);
  const followingIds = new Set<string>(requesterId ? getFollowingIds(requesterId) : []);
  const userCommunityIds = new Set<string>(requesterId ? getUserCommunityIds(requesterId) : []);

  if (requesterId && db) {
    if (Array.isArray(db.friendships)) {
      for (const f of db.friendships) {
        if (f.userId === requesterId && f.friendId) friendIds.add(f.friendId);
        if (f.friendId === requesterId && f.userId) friendIds.add(f.userId);
      }
    }
    if (db.friends && Array.isArray(db.friends[requesterId])) {
      for (const fid of db.friends[requesterId]) friendIds.add(fid);
    }
    if (Array.isArray(db.follows)) {
      for (const f of db.follows) {
        if (f.followerId === requesterId && f.followedId) followingIds.add(f.followedId);
      }
    }
    if (db.follows && Array.isArray(db.follows[requesterId])) {
      for (const fid of db.follows[requesterId]) followingIds.add(fid);
    }
    const user = (db.users || []).find((u: any) => u && u.id === requesterId);
    if (user && Array.isArray(user.zonedUsers)) {
      for (const fid of user.zonedUsers) followingIds.add(fid);
    }
    if (Array.isArray(db.communities)) {
      for (const c of db.communities) {
        if (c && Array.isArray(c.members)) {
          const isMem = c.members.some((m: any) =>
            typeof m === 'string' ? m === requesterId : m?.id === requesterId || m?.userId === requesterId
          );
          if (isMem || c.ownerId === requesterId) {
            userCommunityIds.add(c.id);
          }
        }
      }
    }
  }

  return { friendIds, followingIds, userCommunityIds };
}

/**
 * Collects a bounded pool of recommendation candidates from multiple graph sources.
 */
function collectCandidates(
  db: any,
  requesterId?: string,
  section: SmartFeedSection = 'for-you',
  userAffinityTags?: Set<string>
): FeedCandidate[] {
  const candidatesMap = new Map<string, FeedCandidate>();
  const rawPosts: any[] = db.posts || [];
  const rawReels: any[] = db.reels || [];

  const { friendIds, followingIds, userCommunityIds } = resolveUserRelations(db, requesterId);

  // 1. SOURCING BY SECTION FILTER
  if (section === 'friends') {
    // Only posts/reels from confirmed friends
    for (const p of rawPosts) {
      if (p && p.userId && friendIds.has(p.userId)) {
        candidatesMap.set(`post:${p.id}`, {
          contentKey: `post:${p.id}`,
          type: 'post',
          rawItem: p,
          authorId: p.userId,
          communityId: p.communityId,
          createdAt: p.createdAt || new Date().toISOString(),
          createdAtMs: new Date(p.createdAt || 0).getTime(),
          candidateSource: 'friend'
        });
      }
    }
    return Array.from(candidatesMap.values());
  }

  if (section === 'following') {
    // Only posts/reels from followed accounts (plus self)
    for (const p of rawPosts) {
      if (p && p.userId && (followingIds.has(p.userId) || (requesterId && p.userId === requesterId))) {
        candidatesMap.set(`post:${p.id}`, {
          contentKey: `post:${p.id}`,
          type: 'post',
          rawItem: p,
          authorId: p.userId,
          communityId: p.communityId,
          createdAt: p.createdAt || new Date().toISOString(),
          createdAtMs: new Date(p.createdAt || 0).getTime(),
          candidateSource: 'following'
        });
      }
    }
    return Array.from(candidatesMap.values());
  }

  if (section === 'communities') {
    // Only posts from joined communities
    for (const p of rawPosts) {
      if (p && p.communityId && userCommunityIds.has(p.communityId)) {
        candidatesMap.set(`post:${p.id}`, {
          contentKey: `post:${p.id}`,
          type: 'post',
          rawItem: p,
          authorId: p.userId,
          communityId: p.communityId,
          createdAt: p.createdAt || new Date().toISOString(),
          createdAtMs: new Date(p.createdAt || 0).getTime(),
          candidateSource: 'community'
        });
      }
    }
    return Array.from(candidatesMap.values());
  }

  // 2. SOURCING FOR 'for-you', 'trending', and 'explore'
  
  // A. Relationship Candidates (Friends & Following)
  if (requesterId) {
    for (const p of rawPosts) {
      if (!p || !p.userId) continue;
      const key = `post:${p.id}`;
      if (friendIds.has(p.userId)) {
        candidatesMap.set(key, {
          contentKey: key,
          type: 'post',
          rawItem: p,
          authorId: p.userId,
          communityId: p.communityId,
          createdAt: p.createdAt || new Date().toISOString(),
          createdAtMs: new Date(p.createdAt || 0).getTime(),
          candidateSource: 'friend'
        });
      } else if (followingIds.has(p.userId)) {
        candidatesMap.set(key, {
          contentKey: key,
          type: 'post',
          rawItem: p,
          authorId: p.userId,
          communityId: p.communityId,
          createdAt: p.createdAt || new Date().toISOString(),
          createdAtMs: new Date(p.createdAt || 0).getTime(),
          candidateSource: 'following'
        });
      }
      if (candidatesMap.size >= 50) break;
    }

    // B. Community Candidates
    for (const p of rawPosts) {
      if (!p || !p.communityId) continue;
      const key = `post:${p.id}`;
      if (candidatesMap.has(key)) continue;
      if (userCommunityIds.has(p.communityId)) {
        candidatesMap.set(key, {
          contentKey: key,
          type: 'post',
          rawItem: p,
          authorId: p.userId,
          communityId: p.communityId,
          createdAt: p.createdAt || new Date().toISOString(),
          createdAtMs: new Date(p.createdAt || 0).getTime(),
          candidateSource: 'community'
        });
      }
      if (candidatesMap.size >= 75) break;
    }

    // C. Suggested Creators
    try {
      const suggestedResult = generateSuggestedCreators(db, requesterId, { limit: 5 });
      const suggestedCreatorIds = new Set((suggestedResult?.creators || []).map(c => c.id));
      for (const p of rawPosts) {
        if (!p || !p.userId) continue;
        const key = `post:${p.id}`;
        if (candidatesMap.has(key)) continue;
        if (suggestedCreatorIds.has(p.userId)) {
          candidatesMap.set(key, {
            contentKey: key,
            type: 'post',
            rawItem: p,
            authorId: p.userId,
            communityId: p.communityId,
            createdAt: p.createdAt || new Date().toISOString(),
            createdAtMs: new Date(p.createdAt || 0).getTime(),
            candidateSource: 'creator'
          });
        }
        if (candidatesMap.size >= 90) break;
      }
    } catch {
      // Safe fallback if discovery module is inactive
    }
  }

  // D. Hashtag / Interest Affinity Candidates
  if (userAffinityTags && userAffinityTags.size > 0) {
    for (const p of rawPosts) {
      if (!p) continue;
      const key = `post:${p.id}`;
      if (candidatesMap.has(key)) continue;

      const pTags = p.normalizedHashtags || p.hashtags?.map((t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '')) || [];
      const matched = pTags.filter((t: string) => userAffinityTags.has(t));
      if (matched.length > 0) {
        candidatesMap.set(key, {
          contentKey: key,
          type: 'post',
          rawItem: p,
          authorId: p.userId,
          communityId: p.communityId,
          createdAt: p.createdAt || new Date().toISOString(),
          createdAtMs: new Date(p.createdAt || 0).getTime(),
          candidateSource: 'hashtag',
          matchedHashtags: matched
        });
      }
      if (candidatesMap.size >= 110) break;
    }
  }

  // E. Trending & Recent Public Posts (fill up to MAX_CANDIDATE_POOL)
  for (const p of rawPosts) {
    if (!p) continue;
    const key = `post:${p.id}`;
    if (candidatesMap.has(key)) continue;

    candidatesMap.set(key, {
      contentKey: key,
      type: 'post',
      rawItem: p,
      authorId: p.userId,
      communityId: p.communityId,
      createdAt: p.createdAt || new Date().toISOString(),
      createdAtMs: new Date(p.createdAt || 0).getTime(),
      candidateSource: 'trending'
    });

    if (candidatesMap.size >= SMART_FEED_WEIGHTS.MAX_CANDIDATE_POOL) break;
  }

  // F. Approved Reels Integration
  for (const r of rawReels) {
    if (!r || r.isApproved === false) continue;
    const key = `reel:${r.id}`;
    if (candidatesMap.has(key)) continue;

    candidatesMap.set(key, {
      contentKey: key,
      type: 'reel',
      rawItem: r,
      authorId: r.addedByUserId || r.userId,
      createdAt: r.createdAt || new Date().toISOString(),
      createdAtMs: new Date(r.createdAt || 0).getTime(),
      candidateSource: 'trending'
    });

    if (candidatesMap.size >= SMART_FEED_WEIGHTS.MAX_CANDIDATE_POOL + 10) break;
  }

  return Array.from(candidatesMap.values());
}

/**
 * Strict Privacy & Suppression Filter.
 * Guarantees zero leakage of private community content, blocked users, muted users, or deleted items.
 */
function filterCandidatePrivacy(
  candidate: FeedCandidate,
  db: any,
  requesterId?: string
): boolean {
  const item = candidate.rawItem;
  if (!item) return false;

  // 1. Deleted content check
  if (candidate.type === 'post') {
    const exists = (db.posts || []).some((p: any) => p && p.id === item.id);
    if (!exists) return false;
  } else if (candidate.type === 'reel') {
    const exists = (db.reels || []).some((r: any) => r && r.id === item.id);
    if (!exists) return false;
    if (item.isApproved === false) return false;
  }

  // 2. Requester-specific blocks, mutes, and hidden items
  if (requesterId) {
    // Hidden posts
    const hiddenPosts = (db.userHiddenPosts && db.userHiddenPosts[requesterId]) || [];
    if (hiddenPosts.includes(item.id)) return false;

    // Blocked users (two-way block check)
    const requesterBlocks = (db.userBlocks && db.userBlocks[requesterId]) || [];
    if (candidate.authorId && requesterBlocks.includes(candidate.authorId)) return false;

    const authorBlocks = (db.userBlocks && db.userBlocks[candidate.authorId]) || [];
    if (authorBlocks.includes(requesterId)) return false;

    // Muted users
    const mutedUsers = (db.userMutes && db.userMutes[requesterId]) || [];
    if (candidate.authorId && mutedUsers.includes(candidate.authorId)) return false;
  }

  // 3. Delegate to Phase 2C authoritative visibility engine
  const isVisible = isContentVisibleToUser(candidate.contentKey, db, requesterId);
  if (!isVisible) return false;

  // 4. Extra community privacy safeguard
  if (item.communityId) {
    const community = (db.communities || []).find((c: any) => c.id === item.communityId);
    if (community && (community.privacy === 'private' || community.isPrivate === true)) {
      if (!requesterId) return false;
      const isMemberInIndex = isUserInCommunity(item.communityId, requesterId);
      const isMemberInRecord = Array.isArray(community.members) && community.members.some((m: any) =>
        typeof m === 'string' ? m === requesterId : m?.id === requesterId || m?.userId === requesterId
      );
      const isOwnerOrAdmin = community.ownerId === requesterId || community.adminId === requesterId || item.userId === requesterId;
      if (!isMemberInIndex && !isMemberInRecord && !isOwnerOrAdmin) return false;
    }
  }

  return true;
}

/**
 * Deterministic, explainable, bounded candidate scoring function.
 */
function scoreCandidate(
  candidate: FeedCandidate,
  db: any,
  requesterId?: string,
  userAffinityTags?: Set<string>,
  trendingTags?: Set<string>,
  relations?: { friendIds: Set<string>; followingIds: Set<string>; userCommunityIds: Set<string> }
): { score: number; reason: SmartFeedReason; label: string } {
  const item = candidate.rawItem;
  const nowMs = Date.now();
  const W = SMART_FEED_WEIGHTS;

  const rels = relations || resolveUserRelations(db, requesterId);

  let relationshipScore = 0;
  let reason: SmartFeedReason = 'fresh';
  let label = 'Bagong Post sa Z-One';

  // 1. RELATIONSHIP SIGNALS
  if (requesterId && candidate.authorId) {
    if (candidate.authorId === requesterId) {
      relationshipScore += W.SELF;
      reason = 'friend';
      label = 'Iyong Sariling Post';
    } else if (rels.friendIds.has(candidate.authorId) || areFriends(requesterId, candidate.authorId)) {
      relationshipScore += W.FRIEND;
      reason = 'friend';
      label = 'Mula sa iyong Kaibigan';
    } else if (rels.followingIds.has(candidate.authorId) || isFollowing(requesterId, candidate.authorId)) {
      relationshipScore += W.FOLLOWING;
      reason = 'following';
      label = 'Mula sa iyong Sinusubaybayan';
    } else {
      const mutuals = getMutualFriendIds(requesterId, candidate.authorId);
      if (mutuals.length > 0) {
        relationshipScore += W.MUTUAL_CONNECTION;
        reason = 'suggested_creator';
        label = `May ${mutuals.length} Mutual Friend${mutuals.length > 1 ? 's' : ''}`;
      } else if (candidate.candidateSource === 'creator') {
        relationshipScore += W.SUGGESTED_CREATOR;
        reason = 'suggested_creator';
        label = 'Inirekomendang Creator';
      }
    }
  }

  // 2. COMMUNITY SIGNALS
  let communityScore = 0;
  if (candidate.communityId) {
    const comm = (db.communities || []).find((c: any) => c.id === candidate.communityId);
    const commName = comm ? comm.name : 'Komunidad';
    if (requesterId && (rels.userCommunityIds.has(candidate.communityId) || isUserInCommunity(candidate.communityId, requesterId))) {
      communityScore += W.MEMBER_COMMUNITY;
      if (reason !== 'friend') {
        reason = 'community';
        label = `Mula sa komunidad: ${commName}`;
      }
    } else {
      communityScore += W.PUBLIC_COMMUNITY;
    }
  }

  // 3. HASHTAG / TOPIC AFFINITY SIGNALS
  let hashtagScore = 0;
  const pTags = item.normalizedHashtags || item.hashtags?.map((t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '')) || [];
  if (userAffinityTags && userAffinityTags.size > 0) {
    const matchedCount = pTags.filter((t: string) => userAffinityTags.has(t)).length;
    if (matchedCount > 0) {
      hashtagScore += Math.min(matchedCount * W.USER_HASHTAG_AFFINITY, W.MAX_HASHTAG_AFFINITY);
      if (reason !== 'friend' && reason !== 'following') {
        reason = 'hashtag';
        label = `Kaugnay sa mga interes mo`;
      }
    }
  }

  // Trending hashtag bonus
  if (trendingTags && trendingTags.size > 0) {
    const isTrendingTag = pTags.some((t: string) => trendingTags.has(t));
    if (isTrendingTag) {
      hashtagScore += W.TRENDING_HASHTAG;
      if (reason === 'fresh' || reason === 'suggested_creator') {
        reason = 'trending';
        label = 'Trending sa mga Hashtags 🔥';
      }
    }
  }

  // 4. ENGAGEMENT VELOCITY (Bounded)
  const likes = Array.isArray(item.likes) ? item.likes.length : (item.likesCount || 0);
  const comments = Array.isArray(item.comments) ? item.comments.length : (item.commentsCount || 0);
  const shares = item.sharesCount || 0;

  const rawEngagement = (likes * W.ENGAGEMENT_LIKE_WEIGHT) +
                        (comments * W.ENGAGEMENT_COMMENT_WEIGHT) +
                        (shares * W.ENGAGEMENT_SHARE_WEIGHT);
  const engagementScore = Math.min(rawEngagement, W.MAX_ENGAGEMENT_SCORE);

  if (engagementScore >= 20 && reason === 'fresh') {
    reason = 'popular';
    label = 'Patok ngayon sa Z-One 🔥';
  }

  // 5. FRESHNESS / HALF-LIFE TIME DECAY
  const ageHours = Math.max(0, (nowMs - candidate.createdAtMs) / (1000 * 60 * 60));
  let freshnessScore = 0;
  if (ageHours <= (W.MAX_AGE_DAYS * 24)) {
    freshnessScore = W.FRESHNESS_MAX_SCORE / (1 + (ageHours / W.FRESHNESS_HALF_LIFE_HOURS));
  }

  if (ageHours < 2 && reason === 'fresh') {
    label = 'Kamakailang nai-post ✨';
  }

  // 6. CONTENT QUALITY & MEDIA PRESENCE
  let qualityScore = 0;
  if (item.mediaUrl || (item.mediaUrls && item.mediaUrls.length > 0) || item.videoUrl) {
    qualityScore += W.MEDIA_PRESENCE;
  }
  if (item.productRef) {
    qualityScore += W.COMMERCE_ATTACHED;
  }
  const authorUser = (db.users || []).find((u: any) => u.id === candidate.authorId);
  if (authorUser && (authorUser.isAdmin || authorUser.isVerified)) {
    qualityScore += W.VERIFIED_OR_ADMIN;
  }

  const totalScore = relationshipScore + communityScore + hashtagScore + engagementScore + freshnessScore + qualityScore;

  return {
    score: Math.round(totalScore * 100) / 100,
    reason,
    label
  };
}

/**
 * Re-ranks candidates to enforce author diversity and prevent single-creator feed domination.
 */
function applyDiversityAndRanking(
  candidates: FeedCandidate[]
): FeedCandidate[] {
  const W = SMART_FEED_WEIGHTS;
  const authorOccurrences = new Map<string, number>();

  // Adjust score by repetition penalty
  const reScored = candidates.map(c => {
    const priorOccurrences = authorOccurrences.get(c.authorId) || 0;
    authorOccurrences.set(c.authorId, priorOccurrences + 1);

    const repetitionPenalty = priorOccurrences * W.CREATOR_REPETITION_PENALTY_STEP;
    const finalScore = Math.max(0, (c.calculatedScore || 0) - repetitionPenalty);

    return {
      ...c,
      calculatedScore: finalScore
    };
  });

  // Sort by final score descending, breaking ties by freshness
  reScored.sort((a, b) => {
    const diff = (b.calculatedScore || 0) - (a.calculatedScore || 0);
    if (Math.abs(diff) > 0.01) return diff;
    return b.createdAtMs - a.createdAtMs;
  });

  return reScored;
}

/**
 * Converts a FeedCandidate to an enriched ZonePost format compatible with existing UI.
 */
function candidateToZonePost(candidate: FeedCandidate, db: any, requesterId?: string): ZonePost {
  const item = candidate.rawItem;

  if (candidate.type === 'reel') {
    // Convert reel candidate to feed post compatible format
    return {
      id: `reel-${item.id}`,
      userId: item.addedByUserId || item.userId || 'system',
      userName: item.userName || 'Creator',
      userAvatar: item.userAvatar || '/placeholder-avatar.png',
      text: item.title || item.description || '',
      mediaUrl: item.videoUrl,
      mediaType: 'video',
      likes: Array.isArray(item.likes) ? item.likes : [],
      comments: [],
      sharesCount: item.sharesCount || 0,
      createdAt: item.createdAt || new Date().toISOString(),
      hashtags: item.hashtags || [],
      recommendationReason: candidate.recommendationReason,
      recommendationLabel: candidate.recommendationLabel
    };
  }

  // Standard post candidate
  const userSavedSet = new Set(
    requesterId ? (db.savedPosts || []).filter((s: any) => s.userId === requesterId).map((s: any) => s.postId) : []
  );

  let userReaction: ReactionType | null = null;
  if (requesterId) {
    const rRecord = (item.reactions || []).find((r: any) => r.userId === requesterId);
    if (rRecord) {
      userReaction = rRecord.type;
    } else if (item.likes && item.likes.includes(requesterId)) {
      userReaction = 'like';
    }
  }

  return {
    ...item,
    reactions: (item.reactions || []).slice(0, 100),
    reactionCounts: item.reactionCounts,
    userReaction,
    isSaved: userSavedSet.has(item.id),
    recommendationReason: candidate.recommendationReason,
    recommendationLabel: candidate.recommendationLabel
  };
}

/**
 * Mandatory Fallback Feed Generator.
 * Returns standard chronological / engagement feed if Smart Feed is empty or errors.
 */
export function generateSmartFeedFallback(
  db: any,
  requesterId?: string,
  options?: { page?: number; limit?: number; section?: SmartFeedSection; reason?: string }
): SmartFeedResponse {
  const page = Math.max(options?.page || 1, 1);
  const limit = Math.min(Math.max(options?.limit || SMART_FEED_WEIGHTS.DEFAULT_PAGE_SIZE, 1), SMART_FEED_WEIGHTS.MAX_PAGE_SIZE);
  const section = options?.section || 'for-you';

  const rawPosts: any[] = db.posts || [];
  const hiddenPostIds = (requesterId && db.userHiddenPosts?.[requesterId]) || [];
  const blockedUserIds = (requesterId && db.userBlocks?.[requesterId]) || [];
  const mutedUserIds = (requesterId && db.userMutes?.[requesterId]) || [];

  const eligiblePosts = rawPosts.filter(p => {
    if (!p) return false;
    if (hiddenPostIds.includes(p.id)) return false;
    if (p.userId && blockedUserIds.includes(p.userId)) return false;
    if (p.userId && mutedUserIds.includes(p.userId)) return false;
    return isContentVisibleToUser(`post:${p.id}`, db, requesterId);
  });

  // Sort chronologically
  eligiblePosts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const total = eligiblePosts.length;
  const startIndex = (page - 1) * limit;
  const slice = eligiblePosts.slice(startIndex, startIndex + limit);

  const enrichedPosts: ZonePost[] = slice.map(p => {
    const candidate: FeedCandidate = {
      contentKey: `post:${p.id}`,
      type: 'post',
      rawItem: p,
      authorId: p.userId,
      communityId: p.communityId,
      createdAt: p.createdAt,
      createdAtMs: new Date(p.createdAt || 0).getTime(),
      candidateSource: 'public',
      recommendationReason: 'fresh',
      recommendationLabel: 'Balitang Feed'
    };
    return candidateToZonePost(candidate, db, requesterId);
  });

  return {
    success: true,
    items: enrichedPosts,
    section,
    page,
    limit,
    total,
    hasMore: startIndex + limit < total,
    fallback: true
  };
}

/**
 * MAIN ENTRY POINT: Generate Personalized Smart Feed
 */
export function generateSmartFeed(
  db: any,
  requesterId?: string,
  options?: {
    page?: number;
    limit?: number;
    section?: string;
    skipCache?: boolean;
  }
): SmartFeedResponse {
  try {
    const page = Math.max(options?.page || 1, 1);
    const limit = Math.min(
      Math.max(options?.limit || SMART_FEED_WEIGHTS.DEFAULT_PAGE_SIZE, SMART_FEED_WEIGHTS.MIN_PAGE_SIZE),
      SMART_FEED_WEIGHTS.MAX_PAGE_SIZE
    );
    const section = normalizeSection(options?.section);

    // 1. Cache lookup (30-second TTL scoped to user and section)
    const cacheKey = `${requesterId || 'anon'}:${section}:${(db.posts || []).length}:${(db.reels || []).length}`;
    if (!options?.skipCache && recommendationCache.has(cacheKey)) {
      const cached = recommendationCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < SMART_FEED_WEIGHTS.CACHE_TTL_MS) {
        const startIndex = (page - 1) * limit;
        const pageItems = cached.items.slice(startIndex, startIndex + limit);
        return {
          success: true,
          items: pageItems,
          section,
          page,
          limit,
          total: cached.totalAvailable,
          hasMore: startIndex + limit < cached.totalAvailable,
          fallback: false
        };
      }
    }

    // 2. Extract user interest signals
    const userAffinityTags = requesterId ? extractUserInterestHashtags(db, requesterId) : new Set<string>();
    
    // Top trending hashtags
    const trendingList = getTrendingHashtags({ limit: 5 });
    const trendingTags = new Set(trendingList.map(t => t.normalizedName));

    // 3. Collect Candidates
    const rawCandidates = collectCandidates(db, requesterId, section, userAffinityTags);

    // If candidate pool is completely empty, trigger safe fallback
    if (rawCandidates.length === 0) {
      return generateSmartFeedFallback(db, requesterId, { page, limit, section, reason: 'Empty candidates pool' });
    }

    // 4. Filter Privacy & Mutes
    const privacyFiltered = rawCandidates.filter(c => filterCandidatePrivacy(c, db, requesterId));

    if (privacyFiltered.length === 0) {
      return generateSmartFeedFallback(db, requesterId, { page, limit, section, reason: 'Zero candidates passed privacy' });
    }

    // 5. Score Candidates
    const relations = resolveUserRelations(db, requesterId);
    for (const c of privacyFiltered) {
      const scored = scoreCandidate(c, db, requesterId, userAffinityTags, trendingTags, relations);
      c.calculatedScore = scored.score;
      c.recommendationReason = scored.reason;
      c.recommendationLabel = scored.label;
    }

    // 6. Diversity & Repetition Ranking
    const rankedCandidates = applyDiversityAndRanking(privacyFiltered);

    // 7. Convert to Enriched ZonePosts
    const allEnrichedPosts = rankedCandidates.map(c => candidateToZonePost(c, db, requesterId));

    // 8. Cache Scored Pool
    recommendationCache.set(cacheKey, {
      timestamp: Date.now(),
      items: allEnrichedPosts,
      totalAvailable: allEnrichedPosts.length
    });

    // 9. Paginate
    const startIndex = (page - 1) * limit;
    const paginatedItems = allEnrichedPosts.slice(startIndex, startIndex + limit);

    return {
      success: true,
      items: paginatedItems,
      section,
      page,
      limit,
      total: allEnrichedPosts.length,
      hasMore: startIndex + limit < allEnrichedPosts.length,
      fallback: false
    };
  } catch (err) {
    console.error('⚠️ [Phase 3 Smart Feed Engine Exception - Triggering Safe Fallback]:', err);
    return generateSmartFeedFallback(db, requesterId, {
      page: options?.page,
      limit: options?.limit,
      section: normalizeSection(options?.section),
      reason: 'Caught exception in smart feed generation'
    });
  }
}

/**
 * Invalidate user-scoped feed caches (e.g. after post creation/deletion).
 */
export function invalidateSmartFeedCache(userId?: string): void {
  if (!userId) {
    recommendationCache.clear();
    return;
  }
  for (const key of recommendationCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      recommendationCache.delete(key);
    }
  }
}
