/**
 * Z-oneApp — Phase 2A Social Graph & Discovery Foundation
 * Authoritative modular helper for Follow System, Social Graph Indexing,
 * Relationship Resolution, and Safe Privacy-Preserving Discovery.
 */

import { areFriends, getFriendIds, getMutualFriendIds, FriendshipRecord, FriendRequestRecord } from './phase1Social';

export type RelationshipState =
  | 'self'
  | 'friend'
  | 'following'
  | 'follower'
  | 'mutual_following'
  | 'pending_outgoing_request'
  | 'pending_incoming_request'
  | 'blocked'
  | 'blocked_by'
  | 'muted'
  | 'none';

export interface UserRelationship {
  isSelf: boolean;
  isFriend: boolean;
  isFollowing: boolean;
  isFollower: boolean;
  hasPendingOutgoingRequest: boolean;
  hasPendingIncomingRequest: boolean;
  pendingRequestId?: string;
  isBlocked: boolean; // requester blocked target
  isBlockedBy: boolean; // target blocked requester
  isMuted: boolean; // requester muted target
  mutualFriendsCount: number;
  mutualFriendIds: string[];
  primaryState: RelationshipState;
}

export interface MutualFriendPreview {
  id: string;
  name: string;
  avatar: string;
}

export interface DiscoveryCandidate {
  id: string;
  name: string;
  avatar: string;
  handle: string;
  bio?: string;
  isOnline?: boolean;
  mutualCount: number;
  mutualFriendsPreview: MutualFriendPreview[];
  relationshipState: RelationshipState;
  isFollowing: boolean;
  reasonCode: 'MUTUAL_FRIENDS' | 'SHARED_COMMUNITY' | 'FOLLOWING_OVERLAP' | 'INTERACTION_OVERLAP' | 'ACTIVE_MEMBER';
  reasonLabel: string;
}

export interface SuggestedCreator {
  id: string;
  name: string;
  avatar: string;
  handle: string;
  bio?: string;
  isOnline?: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  reelCount: number;
  totalEngagement: number;
  isFollowing: boolean;
  reasonCode: 'TOP_CREATOR' | 'POPULAR_REELS' | 'COMMUNITY_STAR' | 'ACTIVE_CREATOR';
  reasonLabel: string;
}

// In-memory follower and following adjacency indexes for O(1) graph operations
const followerIndex = new Map<string, Set<string>>(); // targetUserId -> Set of users who follow target
const followingIndex = new Map<string, Set<string>>(); // userId -> Set of users followed by user

/**
 * Rebuilds the in-memory follow graph index from persistent user records.
 * Non-destructive and fully rebuildable.
 */
export function rebuildFollowIndex(users?: Array<{ id: string; zonedUsers?: string[] }>): void {
  followerIndex.clear();
  followingIndex.clear();
  if (!Array.isArray(users)) return;

  for (const u of users) {
    if (!u || !u.id) continue;

    let myFollowing = followingIndex.get(u.id);
    if (!myFollowing) {
      myFollowing = new Set<string>();
      followingIndex.set(u.id, myFollowing);
    }

    if (Array.isArray(u.zonedUsers)) {
      for (const targetId of u.zonedUsers) {
        if (!targetId || targetId === u.id) continue;
        myFollowing.add(targetId);

        let followers = followerIndex.get(targetId);
        if (!followers) {
          followers = new Set<string>();
          followerIndex.set(targetId, followers);
        }
        followers.add(u.id);
      }
    }
  }
}

/**
 * Adds a follow edge to in-memory graph index in O(1) time.
 */
export function addFollowToIndex(followerId: string, targetId: string): void {
  if (!followerId || !targetId || followerId === targetId) return;

  let myFollowing = followingIndex.get(followerId);
  if (!myFollowing) {
    myFollowing = new Set<string>();
    followingIndex.set(followerId, myFollowing);
  }
  myFollowing.add(targetId);

  let targetFollowers = followerIndex.get(targetId);
  if (!targetFollowers) {
    targetFollowers = new Set<string>();
    followerIndex.set(targetId, targetFollowers);
  }
  targetFollowers.add(followerId);
}

/**
 * Removes a follow edge from in-memory graph index in O(1) time.
 */
export function removeFollowFromIndex(followerId: string, targetId: string): void {
  if (!followerId || !targetId) return;
  followingIndex.get(followerId)?.delete(targetId);
  followerIndex.get(targetId)?.delete(followerId);
}

/**
 * Checks if followerId follows targetId in O(1) time.
 */
export function isFollowing(followerId: string, targetId: string): boolean {
  if (!followerId || !targetId || followerId === targetId) return false;
  return Boolean(followingIndex.get(followerId)?.has(targetId));
}

/**
 * Gets array of follower user IDs for targetId.
 */
export function getFollowerIds(targetId: string): string[] {
  if (!targetId) return [];
  const s = followerIndex.get(targetId);
  return s ? Array.from(s) : [];
}

/**
 * Gets array of user IDs followed by userId.
 */
export function getFollowingIds(userId: string): string[] {
  if (!userId) return [];
  const s = followingIndex.get(userId);
  return s ? Array.from(s) : [];
}

/**
 * Resolves the complete normalized relationship between two users.
 * Reusable by discovery APIs, profiles, and UI components.
 */
export function resolveRelationship(
  db: {
    users?: any[];
    friendships?: FriendshipRecord[];
    friendRequests?: FriendRequestRecord[];
    userBlocks?: Record<string, string[]>;
    userMutes?: Record<string, string[]>;
  },
  requesterId: string | undefined,
  targetUserId: string
): UserRelationship {
  if (!requesterId) {
    return {
      isSelf: false,
      isFriend: false,
      isFollowing: false,
      isFollower: false,
      hasPendingOutgoingRequest: false,
      hasPendingIncomingRequest: false,
      isBlocked: false,
      isBlockedBy: false,
      isMuted: false,
      mutualFriendsCount: 0,
      mutualFriendIds: [],
      primaryState: 'none'
    };
  }

  const isSelf = requesterId === targetUserId;
  if (isSelf) {
    return {
      isSelf: true,
      isFriend: false,
      isFollowing: false,
      isFollower: false,
      hasPendingOutgoingRequest: false,
      hasPendingIncomingRequest: false,
      isBlocked: false,
      isBlockedBy: false,
      isMuted: false,
      mutualFriendsCount: 0,
      mutualFriendIds: [],
      primaryState: 'self'
    };
  }

  // Block and mute checks
  const isBlocked = Boolean(db.userBlocks?.[requesterId]?.includes(targetUserId));
  const isBlockedBy = Boolean(db.userBlocks?.[targetUserId]?.includes(requesterId));
  const isMuted = Boolean(db.userMutes?.[requesterId]?.includes(targetUserId));

  // Friend check via Phase 1 index
  const isFriend = areFriends(requesterId, targetUserId);

  // Pending friend requests
  let hasPendingOutgoingRequest = false;
  let hasPendingIncomingRequest = false;
  let pendingRequestId: string | undefined;

  if (Array.isArray(db.friendRequests)) {
    for (const fr of db.friendRequests) {
      if (fr.status === 'pending') {
        if (fr.fromUserId === requesterId && fr.toUserId === targetUserId) {
          hasPendingOutgoingRequest = true;
          pendingRequestId = fr.id;
          break;
        } else if (fr.fromUserId === targetUserId && fr.toUserId === requesterId) {
          hasPendingIncomingRequest = true;
          pendingRequestId = fr.id;
          break;
        }
      }
    }
  }

  // Follow states via in-memory follow graph
  const following = isFollowing(requesterId, targetUserId);
  const follower = isFollowing(targetUserId, requesterId);

  // Mutual friends via Phase 1 intersection
  const mutualFriendIds = getMutualFriendIds(requesterId, targetUserId);
  const mutualFriendsCount = mutualFriendIds.length;

  // Primary state resolution hierarchy
  let primaryState: RelationshipState = 'none';
  if (isBlocked) {
    primaryState = 'blocked';
  } else if (isBlockedBy) {
    primaryState = 'blocked_by';
  } else if (isFriend) {
    primaryState = 'friend';
  } else if (hasPendingIncomingRequest) {
    primaryState = 'pending_incoming_request';
  } else if (hasPendingOutgoingRequest) {
    primaryState = 'pending_outgoing_request';
  } else if (following && follower) {
    primaryState = 'mutual_following';
  } else if (following) {
    primaryState = 'following';
  } else if (follower) {
    primaryState = 'follower';
  } else if (isMuted) {
    primaryState = 'muted';
  }

  return {
    isSelf: false,
    isFriend,
    isFollowing: following,
    isFollower: follower,
    hasPendingOutgoingRequest,
    hasPendingIncomingRequest,
    pendingRequestId,
    isBlocked,
    isBlockedBy,
    isMuted,
    mutualFriendsCount,
    mutualFriendIds,
    primaryState
  };
}

/**
 * Dismisses a user from discovery recommendations for the authenticated requester.
 * Scoped to requester, idempotent, does not alter friendships or financial data.
 */
export function dismissDiscoveryUser(
  db: { discoveryDismissals?: Record<string, string[]> },
  requesterId: string,
  targetUserId: string
): boolean {
  if (!requesterId || !targetUserId || requesterId === targetUserId) return false;
  if (!db.discoveryDismissals) {
    db.discoveryDismissals = {};
  }
  if (!Array.isArray(db.discoveryDismissals[requesterId])) {
    db.discoveryDismissals[requesterId] = [];
  }
  if (!db.discoveryDismissals[requesterId].includes(targetUserId)) {
    db.discoveryDismissals[requesterId].push(targetUserId);
  }
  return true;
}

/**
 * Generates People You May Know candidates based on explainable, privacy-safe signals.
 * Uses bounded candidate pools to prevent O(N^2) scaling issues.
 */
export function generatePeopleYouMayKnow(
  db: {
    users?: any[];
    friendships?: FriendshipRecord[];
    friendRequests?: FriendRequestRecord[];
    groupChats?: any[];
    posts?: any[];
    userBlocks?: Record<string, string[]>;
    userMutes?: Record<string, string[]>;
    discoveryDismissals?: Record<string, string[]>;
  },
  requesterId: string,
  options: {
    limit?: number;
    offset?: number;
    activeUsersMap?: Record<string, number>;
  } = {}
): {
  candidates: DiscoveryCandidate[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
} {
  const limit = Math.max(1, Math.min(options.limit || 10, 30));
  const offset = Math.max(0, options.offset || 0);
  const activeUsers = options.activeUsersMap || {};

  const allUsers = db.users || [];
  const userMap = new Map<string, any>();
  for (const u of allUsers) {
    if (u && u.id) userMap.set(u.id, u);
  }

  // Build exclusion set
  const excludedSet = new Set<string>();
  excludedSet.add(requesterId);

  // 1. Existing friends
  const myFriendIds = getFriendIds(requesterId);
  myFriendIds.forEach(id => excludedSet.add(id));

  // 2. Pending friend requests (both directions)
  if (Array.isArray(db.friendRequests)) {
    for (const fr of db.friendRequests) {
      if (fr.status === 'pending') {
        if (fr.fromUserId === requesterId) excludedSet.add(fr.toUserId);
        if (fr.toUserId === requesterId) excludedSet.add(fr.fromUserId);
      }
    }
  }

  // 3. Blocked relationships (either direction)
  const myBlocks = db.userBlocks?.[requesterId] || [];
  myBlocks.forEach(id => excludedSet.add(id));
  for (const [blockerId, blockedList] of Object.entries(db.userBlocks || {})) {
    if (blockedList?.includes(requesterId)) {
      excludedSet.add(blockerId);
    }
  }

  // 4. Muted users
  const myMutes = db.userMutes?.[requesterId] || [];
  myMutes.forEach(id => excludedSet.add(id));

  // 5. Dismissed recommendations
  const myDismissals = db.discoveryDismissals?.[requesterId] || [];
  myDismissals.forEach(id => excludedSet.add(id));

  // 6. Banned users
  allUsers.forEach(u => {
    if (u.isBanned || u.accountSafetyStatus === 'banned') {
      excludedSet.add(u.id);
    }
  });

  // Candidate generation with bounded pool (max 150 candidates)
  const candidateScores = new Map<string, {
    user: any;
    score: number;
    mutualIds: string[];
    sharedGroupsCount: number;
    followingOverlapCount: number;
    isFollower: boolean;
  }>();

  const getOrInitCandidate = (uid: string) => {
    if (excludedSet.has(uid)) return null;
    const u = userMap.get(uid);
    if (!u) return null;
    let entry = candidateScores.get(uid);
    if (!entry) {
      if (candidateScores.size >= 150) return null;
      entry = {
        user: u,
        score: 0,
        mutualIds: [],
        sharedGroupsCount: 0,
        followingOverlapCount: 0,
        isFollower: isFollowing(uid, requesterId)
      };
      candidateScores.set(uid, entry);
    }
    return entry;
  };

  // Signal 1: 2nd-degree friend connections (friends of friends)
  for (const friendId of myFriendIds) {
    const secondDegreeFriends = getFriendIds(friendId);
    for (const secondDegreeId of secondDegreeFriends) {
      getOrInitCandidate(secondDegreeId);
    }
  }

  // Signal 2: Shared Communities / Group Chats
  if (Array.isArray(db.groupChats)) {
    for (const group of db.groupChats) {
      const members: string[] = Array.isArray(group.members) ? group.members : [];
      if (members.includes(requesterId)) {
        for (const memberId of members) {
          const entry = getOrInitCandidate(memberId);
          if (entry) {
            entry.sharedGroupsCount += 1;
          }
        }
      }
    }
  }

  // Signal 3: Following overlap (people followed by people I follow)
  const myFollowingIds = getFollowingIds(requesterId);
  for (const followedId of myFollowingIds) {
    const extendedFollowing = getFollowingIds(followedId);
    for (const targetId of extendedFollowing) {
      const entry = getOrInitCandidate(targetId);
      if (entry) {
        entry.followingOverlapCount += 1;
      }
    }
  }

  // Signal 4: Followers who are not yet friends
  const myFollowerIds = getFollowerIds(requesterId);
  for (const followerId of myFollowerIds) {
    getOrInitCandidate(followerId);
  }

  // Fallback: If candidate pool is small (< 10), add active community members
  if (candidateScores.size < 10) {
    for (const u of allUsers) {
      if (!excludedSet.has(u.id)) {
        getOrInitCandidate(u.id);
        if (candidateScores.size >= 15) break;
      }
    }
  }

  // Compute deterministic scores for all candidates
  for (const [candidateId, entry] of Array.from(candidateScores.entries())) {
    // 1. Mutual Friends: 15 points per mutual friend (max 150)
    entry.mutualIds = getMutualFriendIds(requesterId, candidateId);
    const mutualCount = entry.mutualIds.length;
    entry.score += Math.min(mutualCount * 15, 150);

    // 2. Follower signal: +12 points if candidate already follows requester
    if (entry.isFollower) {
      entry.score += 12;
    }

    // 3. Shared Group chats: +10 points per group (max 50)
    entry.score += Math.min(entry.sharedGroupsCount * 10, 50);

    // 4. Following overlap: +8 points per overlap (max 40)
    entry.score += Math.min(entry.followingOverlapCount * 8, 40);

    // 5. Active platform baseline: +5 points if active in session map
    if (activeUsers[candidateId]) {
      entry.score += 5;
    }

    // 6. Profile completeness: +3 points
    if (entry.user.avatar && entry.user.avatar !== '👤') {
      entry.score += 2;
    }
    if (entry.user.bio) {
      entry.score += 1;
    }
  }

  // Sort candidates deterministically: highest score first, then alphabetically by name for stable pagination
  const sortedCandidates = Array.from(candidateScores.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.user.name || '').localeCompare(b.user.name || '');
  });

  const total = sortedCandidates.length;
  const pagedCandidates = sortedCandidates.slice(offset, offset + limit);
  const hasMore = offset + limit < total;
  const nextCursor = hasMore ? String(offset + limit) : undefined;

  // Format safe public metadata
  const candidates: DiscoveryCandidate[] = pagedCandidates.map(c => {
    const u = c.user;
    const mutualCount = c.mutualIds.length;

    // Up to 3 mutual friends preview
    const mutualFriendsPreview: MutualFriendPreview[] = c.mutualIds.slice(0, 3).map(mid => {
      const mu = userMap.get(mid);
      return {
        id: mid,
        name: mu?.name || 'User',
        avatar: mu?.avatar || '👤'
      };
    });

    let reasonCode: DiscoveryCandidate['reasonCode'] = 'ACTIVE_MEMBER';
    let reasonLabel = 'Aktibo sa komunidad';

    if (mutualCount > 0) {
      reasonCode = 'MUTUAL_FRIENDS';
      reasonLabel = `${mutualCount} mutual friend${mutualCount > 1 ? 's' : ''}`;
    } else if (c.isFollower) {
      reasonCode = 'FOLLOWING_OVERLAP';
      reasonLabel = 'Nagsusubaybay sa iyo';
    } else if (c.sharedGroupsCount > 0) {
      reasonCode = 'SHARED_COMMUNITY';
      reasonLabel = `Kasama sa ${c.sharedGroupsCount} grupo`;
    } else if (c.followingOverlapCount > 0) {
      reasonCode = 'FOLLOWING_OVERLAP';
      reasonLabel = 'May kaugnayang sinusubaybayan';
    }

    const isUserFollowing = isFollowing(requesterId, u.id);

    return {
      id: u.id,
      name: u.name,
      avatar: u.avatar || '👤',
      handle: '@' + (u.name || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      bio: u.bio || '',
      isOnline: Boolean(activeUsers[u.id]),
      mutualCount,
      mutualFriendsPreview,
      relationshipState: isUserFollowing ? 'following' : 'none',
      isFollowing: isUserFollowing,
      reasonCode,
      reasonLabel
    };
  });

  return {
    candidates,
    total,
    hasMore,
    nextCursor
  };
}

/**
 * Generates Suggested Creators using public creator metrics (reels, posts, public reactions).
 * Strictly excludes private analytics, balances, and sensitive info.
 */
export function generateSuggestedCreators(
  db: {
    users?: any[];
    posts?: any[];
    reels?: any[];
    userBlocks?: Record<string, string[]>;
    discoveryDismissals?: Record<string, string[]>;
  },
  requesterId: string,
  options: {
    limit?: number;
    offset?: number;
    activeUsersMap?: Record<string, number>;
  } = {}
): {
  creators: SuggestedCreator[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
} {
  const limit = Math.max(1, Math.min(options.limit || 10, 30));
  const offset = Math.max(0, options.offset || 0);
  const activeUsers = options.activeUsersMap || {};

  const allUsers = db.users || [];
  const allPosts = db.posts || [];
  const allReels = db.reels || [];

  // Exclusions
  const excludedSet = new Set<string>();
  excludedSet.add(requesterId);

  const myBlocks = db.userBlocks?.[requesterId] || [];
  myBlocks.forEach(id => excludedSet.add(id));
  for (const [blockerId, blockedList] of Object.entries(db.userBlocks || {})) {
    if (blockedList?.includes(requesterId)) {
      excludedSet.add(blockerId);
    }
  }

  const myDismissals = db.discoveryDismissals?.[requesterId] || [];
  myDismissals.forEach(id => excludedSet.add(id));

  // Pre-aggregate public posts and reels metrics per user in O(N) time
  const postCountMap = new Map<string, number>();
  const postReactionsMap = new Map<string, number>();
  for (const p of allPosts) {
    if (!p || !p.userId) continue;
    postCountMap.set(p.userId, (postCountMap.get(p.userId) || 0) + 1);
    let rxCount = 0;
    if (p.reactionCounts && typeof p.reactionCounts === 'object') {
      rxCount = (Object.values(p.reactionCounts) as any[]).reduce((acc: number, val: any) => acc + (typeof val === 'number' ? val : 0), 0);
    } else if (Array.isArray(p.reactions)) {
      rxCount = p.reactions.length;
    } else if (typeof p.likes === 'number') {
      rxCount = p.likes;
    }
    postReactionsMap.set(p.userId, (postReactionsMap.get(p.userId) || 0) + rxCount);
  }

  const reelCountMap = new Map<string, number>();
  const reelEngagementMap = new Map<string, number>();
  for (const r of allReels) {
    if (!r || !r.userId) continue;
    reelCountMap.set(r.userId, (reelCountMap.get(r.userId) || 0) + 1);
    const eng = (typeof r.likes === 'number' ? r.likes : 0) + (typeof r.commentsCount === 'number' ? r.commentsCount : 0);
    reelEngagementMap.set(r.userId, (reelEngagementMap.get(r.userId) || 0) + eng);
  }

  // Filter creator candidates
  const creatorCandidates: Array<{
    user: any;
    followerCount: number;
    followingCount: number;
    postCount: number;
    reelCount: number;
    totalEngagement: number;
    score: number;
    isFollowing: boolean;
  }> = [];

  for (const u of allUsers) {
    if (!u || !u.id || excludedSet.has(u.id) || u.isBanned) continue;

    const followerCount = followerIndex.get(u.id)?.size || 0;
    const followingCount = (u.zonedUsers || []).length;
    const postCount = postCountMap.get(u.id) || 0;
    const reelCount = reelCountMap.get(u.id) || 0;
    const totalEngagement = (postReactionsMap.get(u.id) || 0) + (reelEngagementMap.get(u.id) || 0);

    // Eligible if has at least 1 post or reel, or has followers, or is admin/creator
    const hasContent = postCount > 0 || reelCount > 0 || followerCount > 0 || u.isAdmin;
    if (!hasContent) continue;

    const currentlyFollowing = isFollowing(requesterId, u.id);

    // Deterministic Creator Score
    // Reels are weighted highest, then engagement, then followers, then posts
    // Prioritize creators that requester does NOT yet follow
    let score = (reelCount * 12) + (postCount * 3) + (followerCount * 4) + Math.min(totalEngagement, 150);
    if (!currentlyFollowing) {
      score += 25; // Bonus for fresh discoverable creators
    }

    creatorCandidates.push({
      user: u,
      followerCount,
      followingCount,
      postCount,
      reelCount,
      totalEngagement,
      score,
      isFollowing: currentlyFollowing
    });
  }

  // Sort deterministically
  creatorCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.user.name || '').localeCompare(b.user.name || '');
  });

  const total = creatorCandidates.length;
  const paged = creatorCandidates.slice(offset, offset + limit);
  const hasMore = offset + limit < total;
  const nextCursor = hasMore ? String(offset + limit) : undefined;

  const creators: SuggestedCreator[] = paged.map(c => {
    const u = c.user;

    let reasonCode: SuggestedCreator['reasonCode'] = 'ACTIVE_CREATOR';
    let reasonLabel = 'Mapanlikhang miyembro';

    if (c.reelCount >= 3) {
      reasonCode = 'POPULAR_REELS';
      reasonLabel = `May ${c.reelCount} maiikling video (Reels)`;
    } else if (c.followerCount >= 5) {
      reasonCode = 'TOP_CREATOR';
      reasonLabel = `${c.followerCount} mga tagasubaybay`;
    } else if (c.totalEngagement >= 10) {
      reasonCode = 'COMMUNITY_STAR';
      reasonLabel = 'Mataas ang pakikipag-ugnayan';
    }

    return {
      id: u.id,
      name: u.name,
      avatar: u.avatar || '👤',
      handle: '@' + (u.name || 'creator').toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      bio: u.bio || '',
      isOnline: Boolean(activeUsers[u.id]),
      followerCount: c.followerCount,
      followingCount: c.followingCount,
      postCount: c.postCount,
      reelCount: c.reelCount,
      totalEngagement: c.totalEngagement,
      isFollowing: c.isFollowing,
      reasonCode,
      reasonLabel
    };
  });

  return {
    creators,
    total,
    hasMore,
    nextCursor
  };
}
