/**
 * Z-oneApp — Phase 2B Groups & Communities Graph Engine
 * Authoritative modular helper for Communities, Roles, Membership Graphs,
 * Privacy-Preserving Discovery, Mutual Communities, and Bounded Recommendations.
 */

import { getFriendIds, areFriends } from './phase1Social';
import { getFollowingIds } from './phase2Discovery';

export type CommunityPrivacy = 'public' | 'private';
export type CommunityVisibility = 'visible' | 'hidden';
export type CommunityRole = 'owner' | 'admin' | 'moderator' | 'member' | 'pending' | 'invited' | 'none';

export interface CommunityRecord {
  id: string;
  name: string;
  description: string;
  avatar: string;
  coverImage?: string;
  category?: string;
  privacy: CommunityPrivacy;
  visibility: CommunityVisibility;
  ownerId: string;
  admins: string[]; // User IDs (owner is always included)
  moderators: string[]; // User IDs
  members: string[]; // User IDs (includes owner, admins, moderators, regular members)
  pendingMembers: string[]; // User IDs who requested membership in private community
  invitedMembers: string[]; // User IDs invited to community
  rules?: string[];
  linkedChatGroupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityMemberPreview {
  id: string;
  name: string;
  avatar: string;
  handle: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joinedAt: string;
  isFriend?: boolean;
}

export interface CommunityPreview {
  id: string;
  name: string;
  description: string;
  avatar: string;
  coverImage?: string;
  category: string;
  privacy: CommunityPrivacy;
  visibility: CommunityVisibility;
  memberCount: number;
  userRole: CommunityRole;
  membershipState: CommunityRole;
  isMember: boolean;
  isPending: boolean;
  isInvited: boolean;
  canManage: boolean;
  ownerId: string;
  rules?: string[];
  linkedChatGroupId?: string;
  mutualMembersCount?: number;
  mutualFriendsPreview?: { id: string; name: string; avatar: string }[];
  recommendationReason?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory membership adjacency indexes for O(1) graph operations
const userCommunitiesIndex = new Map<string, Set<string>>(); // userId -> Set of communityIds
const communityMembersIndex = new Map<string, Set<string>>(); // communityId -> Set of userIds

/**
 * Rebuilds the in-memory community graph indexes from persistent records.
 * Non-destructive, idempotent, and fully rebuildable on loadDB().
 */
export function rebuildCommunityIndexes(communities?: CommunityRecord[]): void {
  userCommunitiesIndex.clear();
  communityMembersIndex.clear();
  if (!Array.isArray(communities)) return;

  for (const c of communities) {
    if (!c || !c.id) continue;

    let memberSet = communityMembersIndex.get(c.id);
    if (!memberSet) {
      memberSet = new Set<string>();
      communityMembersIndex.set(c.id, memberSet);
    }

    if (Array.isArray(c.members)) {
      for (const uid of c.members) {
        if (!uid) continue;
        memberSet.add(uid);

        let userComms = userCommunitiesIndex.get(uid);
        if (!userComms) {
          userComms = new Set<string>();
          userCommunitiesIndex.set(uid, userComms);
        }
        userComms.add(c.id);
      }
    }
  }
}

/**
 * Adds a community to the in-memory indexes.
 */
export function addCommunityToIndex(community: CommunityRecord): void {
  if (!community || !community.id) return;
  const memberSet = new Set<string>(community.members || []);
  communityMembersIndex.set(community.id, memberSet);

  memberSet.forEach(uid => {
    let userComms = userCommunitiesIndex.get(uid);
    if (!userComms) {
      userComms = new Set<string>();
      userCommunitiesIndex.set(uid, userComms);
    }
    userComms.add(community.id);
  });
}

/**
 * Removes a community from in-memory indexes.
 */
export function removeCommunityFromIndex(communityId: string): void {
  if (!communityId) return;
  const members = communityMembersIndex.get(communityId);
  if (members) {
    members.forEach(uid => {
      userCommunitiesIndex.get(uid)?.delete(communityId);
    });
  }
  communityMembersIndex.delete(communityId);
}

/**
 * Adds a user to a community in the in-memory indexes.
 */
export function addUserToCommunityIndex(userId: string, communityId: string): void {
  if (!userId || !communityId) return;
  
  let userComms = userCommunitiesIndex.get(userId);
  if (!userComms) {
    userComms = new Set<string>();
    userCommunitiesIndex.set(userId, userComms);
  }
  userComms.add(communityId);

  let commMembers = communityMembersIndex.get(communityId);
  if (!commMembers) {
    commMembers = new Set<string>();
    communityMembersIndex.set(communityId, commMembers);
  }
  commMembers.add(userId);
}

/**
 * Removes a user from a community in the in-memory indexes.
 */
export function removeUserFromCommunityIndex(userId: string, communityId: string): void {
  if (!userId || !communityId) return;
  userCommunitiesIndex.get(userId)?.delete(communityId);
  communityMembersIndex.get(communityId)?.delete(userId);
}

/**
 * Gets all community IDs that a user is a member of in O(1) time.
 */
export function getUserCommunityIds(userId: string): string[] {
  if (!userId) return [];
  const set = userCommunitiesIndex.get(userId);
  return set ? Array.from(set) : [];
}

/**
 * Gets all member user IDs in a community in O(1) time.
 */
export function getCommunityMemberIds(communityId: string): string[] {
  if (!communityId) return [];
  const set = communityMembersIndex.get(communityId);
  return set ? Array.from(set) : [];
}

/**
 * Checks if a user is a member of a community in O(1) time.
 */
export function isUserInCommunity(communityId: string, userId: string): boolean {
  if (!communityId || !userId) return false;
  return Boolean(communityMembersIndex.get(communityId)?.has(userId));
}

/**
 * Resolves the authenticated user's role in a community server-side.
 * Never trust client-supplied role values.
 */
export function resolveUserRole(community: CommunityRecord, userId: string): CommunityRole {
  if (!community || !userId) return 'none';

  if (community.ownerId === userId) {
    return 'owner';
  }
  if (Array.isArray(community.admins) && community.admins.includes(userId)) {
    return 'admin';
  }
  if (Array.isArray(community.moderators) && community.moderators.includes(userId)) {
    return 'moderator';
  }
  if (Array.isArray(community.members) && community.members.includes(userId)) {
    return 'member';
  }
  if (Array.isArray(community.pendingMembers) && community.pendingMembers.includes(userId)) {
    return 'pending';
  }
  if (Array.isArray(community.invitedMembers) && community.invitedMembers.includes(userId)) {
    return 'invited';
  }

  return 'none';
}

/**
 * Authorization checks
 */
export function canManageCommunity(community: CommunityRecord, userId: string): boolean {
  const role = resolveUserRole(community, userId);
  return role === 'owner' || role === 'admin';
}

export function canApproveRequests(community: CommunityRecord, userId: string): boolean {
  const role = resolveUserRole(community, userId);
  return role === 'owner' || role === 'admin' || role === 'moderator';
}

export function canInviteMembers(community: CommunityRecord, userId: string): boolean {
  const role = resolveUserRole(community, userId);
  if (community.privacy === 'public') {
    return role !== 'none' && role !== 'pending';
  }
  // For private groups, only owner, admin, or moderator can invite
  return role === 'owner' || role === 'admin' || role === 'moderator';
}

export function canRemoveTarget(community: CommunityRecord, actorId: string, targetUserId: string): boolean {
  if (actorId === targetUserId) return false; // Leaving uses leave endpoint, not remove
  const actorRole = resolveUserRole(community, actorId);
  const targetRole = resolveUserRole(community, targetUserId);

  if (targetRole === 'owner') return false; // Nobody can remove the owner

  if (actorRole === 'owner') return true; // Owner can remove any admin, moderator, or member
  if (actorRole === 'admin') {
    // Admin can remove moderator or member, but NOT other admins or owner
    return targetRole === 'moderator' || targetRole === 'member';
  }
  if (actorRole === 'moderator') {
    // Moderator can remove ordinary members only
    return targetRole === 'member';
  }

  return false;
}

export function canPromoteTarget(
  community: CommunityRecord,
  actorId: string,
  targetUserId: string,
  newRole: 'admin' | 'moderator'
): boolean {
  if (actorId === targetUserId) return false; // Prevent self-escalation
  const actorRole = resolveUserRole(community, actorId);
  const targetRole = resolveUserRole(community, targetUserId);

  if (targetRole === 'none' || targetRole === 'pending' || targetRole === 'invited') {
    return false; // Target must already be an accepted member
  }

  if (newRole === 'admin') {
    // Only owner can promote a user to admin
    return actorRole === 'owner';
  }

  if (newRole === 'moderator') {
    // Owner or admin can promote a member to moderator
    return actorRole === 'owner' || actorRole === 'admin';
  }

  return false;
}

export function canDemoteTarget(
  community: CommunityRecord,
  actorId: string,
  targetUserId: string,
  newRole: 'moderator' | 'member'
): boolean {
  if (actorId === targetUserId) return false; // Prevent self-demotion confusion
  const actorRole = resolveUserRole(community, actorId);
  const targetRole = resolveUserRole(community, targetUserId);

  if (targetRole === 'owner') return false; // Owner cannot be demoted

  if (actorRole === 'owner') return true; // Owner can demote anyone below owner

  if (actorRole === 'admin') {
    // Admin can only demote moderators to members, not other admins
    if (targetRole === 'moderator' && newRole === 'member') {
      return true;
    }
  }

  return false;
}

/**
 * Calculates mutual communities between userA and userB with bounded set intersection.
 * Honors privacy rules: never exposes private communities unless requesting user is a member.
 */
export function getMutualCommunities(
  userA: string,
  userB: string,
  communities: CommunityRecord[],
  requestingUserId?: string
): CommunityRecord[] {
  if (!userA || !userB || userA === userB) return [];

  const commsA = userCommunitiesIndex.get(userA);
  const commsB = userCommunitiesIndex.get(userB);
  if (!commsA || !commsB || commsA.size === 0 || commsB.size === 0) return [];

  // Intersect smaller set into larger set
  const [smaller, larger] = commsA.size <= commsB.size ? [commsA, commsB] : [commsB, commsA];
  const mutualIds: string[] = [];

  smaller.forEach(id => {
    if (larger.has(id)) {
      mutualIds.push(id);
    }
  });

  if (mutualIds.length === 0) return [];

  const communityMap = new Map(communities.map(c => [c.id, c]));
  const result: CommunityRecord[] = [];

  for (const cid of mutualIds) {
    const c = communityMap.get(cid);
    if (!c) continue;

    // Privacy filter: If community is private, only expose if requester is a member
    if (c.privacy === 'private') {
      if (!requestingUserId || !isUserInCommunity(c.id, requestingUserId)) {
        continue;
      }
    }

    // Visibility filter
    if (c.visibility === 'hidden') {
      if (!requestingUserId || !isUserInCommunity(c.id, requestingUserId)) {
        continue;
      }
    }

    result.push(c);
  }

  return result;
}

/**
 * Formats a community record into a safe, client-facing preview object.
 */
export function formatCommunityPreview(
  community: CommunityRecord,
  userId: string = '',
  dbUsers: any[] = [],
  userFriendIds?: string[]
): CommunityPreview {
  const role = resolveUserRole(community, userId);
  const isMember = role === 'owner' || role === 'admin' || role === 'moderator' || role === 'member';
  const isPending = role === 'pending';
  const isInvited = role === 'invited';
  const canManage = role === 'owner' || role === 'admin';

  const memberIds = community.members || [];
  const memberCount = memberIds.length;

  // Mutual friends who are members
  let mutualFriendsPreview: { id: string; name: string; avatar: string }[] = [];
  let mutualMembersCount = 0;

  if (userFriendIds && userFriendIds.length > 0) {
    const userMap = new Map(dbUsers.map(u => [u.id, u]));
    const friendSet = new Set(userFriendIds);
    for (const mid of memberIds) {
      if (mid !== userId && friendSet.has(mid)) {
        mutualMembersCount++;
        if (mutualFriendsPreview.length < 3) {
          const u = userMap.get(mid);
          if (u) {
            mutualFriendsPreview.push({
              id: u.id,
              name: u.name,
              avatar: u.avatar || '👤'
            });
          }
        }
      }
    }
  }

  return {
    id: community.id,
    name: community.name,
    description: community.description || '',
    avatar: community.avatar || '🌐',
    coverImage: community.coverImage,
    category: community.category || 'General',
    privacy: community.privacy,
    visibility: community.visibility,
    memberCount,
    userRole: role,
    membershipState: role,
    isMember,
    isPending,
    isInvited,
    canManage,
    ownerId: community.ownerId,
    rules: community.rules || [],
    linkedChatGroupId: community.linkedChatGroupId,
    mutualMembersCount,
    mutualFriendsPreview,
    createdAt: community.createdAt,
    updatedAt: community.updatedAt
  };
}

/**
 * Bounded pagination for group discovery.
 */
export function queryCommunitiesDiscovery(
  communities: CommunityRecord[],
  userId: string,
  params: {
    search?: string;
    category?: string;
    privacy?: string;
    page?: number;
    limit?: number;
    sort?: string;
  },
  dbUsers: any[],
  userFriendIds?: string[]
): {
  communities: CommunityPreview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(30, Math.max(1, Number(params.limit) || 10)); // Strict 1–30 boundary
  const search = (params.search || '').trim().toLowerCase();
  const category = (params.category || '').trim().toLowerCase();
  const privacy = (params.privacy || '').trim().toLowerCase();
  const sort = params.sort || 'popular';

  // Filter accessible communities
  let pool = communities.filter(c => {
    if (!c) return false;

    // Visibility filter: hidden groups only visible to existing members
    if (c.visibility === 'hidden' && !isUserInCommunity(c.id, userId)) {
      return false;
    }

    // Search filter
    if (search) {
      const matchName = c.name?.toLowerCase().includes(search);
      const matchDesc = c.description?.toLowerCase().includes(search);
      const matchCat = c.category?.toLowerCase().includes(search);
      if (!matchName && !matchDesc && !matchCat) return false;
    }

    // Category filter
    if (category && category !== 'all') {
      if ((c.category || '').toLowerCase() !== category) return false;
    }

    // Privacy filter
    if (privacy && privacy !== 'all') {
      if (c.privacy !== privacy) return false;
    }

    return true;
  });

  // Safe sorting
  if (sort === 'popular') {
    pool.sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0));
  } else if (sort === 'recent') {
    pool.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sort === 'name') {
    pool.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  const total = pool.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const sliced = pool.slice(startIndex, startIndex + limit);

  const formatted = sliced.map(c => formatCommunityPreview(c, userId, dbUsers, userFriendIds));

  return {
    communities: formatted,
    total,
    page,
    limit,
    totalPages
  };
}

/**
 * Generates safe, bounded community recommendations.
 * Uses friendship overlap, follow overlap, and community popularity.
 * Strictly 0 financial signals.
 */
export function generateCommunityRecommendations(
  communities: CommunityRecord[],
  userId: string,
  dbUsers: any[],
  userFriendIds: string[],
  userFollowingIds: string[],
  limit: number = 10
): CommunityPreview[] {
  if (!userId || !Array.isArray(communities)) return [];

  const myCommunities = new Set(getUserCommunityIds(userId));
  const friendSet = new Set(userFriendIds || []);
  const followingSet = new Set(userFollowingIds || []);

  // Filter eligible candidate communities
  const candidates: Array<{
    community: CommunityRecord;
    score: number;
    reason: string;
    friendCount: number;
  }> = [];

  for (const c of communities) {
    if (!c) continue;

    // Do not recommend communities user is already in or pending in
    if (myCommunities.has(c.id)) continue;
    if (Array.isArray(c.pendingMembers) && c.pendingMembers.includes(userId)) continue;
    if (c.visibility === 'hidden') continue;

    const members = c.members || [];
    let friendCount = 0;
    let followingCount = 0;

    for (const mid of members) {
      if (friendSet.has(mid)) friendCount++;
      if (followingSet.has(mid)) followingCount++;
    }

    let score = 0;
    let reason = 'Sikat na komunidad sa Z-one';

    if (friendCount > 0) {
      score += friendCount * 5;
      reason = friendCount === 1 
        ? 'May 1 kang kaibigan na miyembro dito'
        : `May ${friendCount} kang kaibigan na miyembro dito`;
    } else if (followingCount > 0) {
      score += followingCount * 3;
      reason = followingCount === 1
        ? 'Miyembro ang sinusubaybayan mong user'
        : `May ${followingCount} kang sinusubaybayan na miyembro dito`;
    } else {
      score += Math.min(10, members.length);
    }

    candidates.push({
      community: c,
      score,
      reason,
      friendCount
    });
  }

  // Sort descending by score, tie-break by member count
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.community.members?.length || 0) - (a.community.members?.length || 0);
  });

  // Bound to top limit
  const topCandidates = candidates.slice(0, limit);

  return topCandidates.map(cand => {
    const preview = formatCommunityPreview(cand.community, userId, dbUsers, userFriendIds);
    preview.recommendationReason = cand.reason;
    return preview;
  });
}

/**
 * Formats paginated community members safely.
 * For private communities, member list is 100% hidden unless requester is a member.
 */
export function formatCommunityMembers(
  community: CommunityRecord,
  userId: string,
  dbUsers: any[],
  options?: { page?: number; limit?: number; role?: string }
): {
  members: CommunityMemberPreview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} {
  const role = resolveUserRole(community, userId);
  const isMember = role === 'owner' || role === 'admin' || role === 'moderator' || role === 'member';

  // For private groups, unauthorized users cannot view members
  if (community.privacy === 'private' && !isMember) {
    return {
      members: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0
    };
  }

  const page = Math.max(1, Number(options?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(options?.limit) || 20)); // Bounded 1–50
  const roleFilter = options?.role || 'all';

  const userMap = new Map(dbUsers.map(u => [u.id, u]));
  const friendSet = new Set(getFriendIds(userId));

  const allMembers: CommunityMemberPreview[] = [];

  for (const mid of community.members || []) {
    const userRole = resolveUserRole(community, mid);
    if (roleFilter !== 'all' && userRole !== roleFilter) continue;

    const u = userMap.get(mid);
    if (!u) continue;

    allMembers.push({
      id: u.id,
      name: u.name,
      avatar: u.avatar || '👤',
      handle: u.email ? `@${u.email.split('@')[0]}` : `@${u.id.substring(0, 8)}`,
      role: (userRole === 'owner' || userRole === 'admin' || userRole === 'moderator') ? userRole : 'member',
      joinedAt: community.createdAt, // Fallback if individual joinedAt not tracked
      isFriend: friendSet.has(mid)
    });
  }

  // Sort by role hierarchy: owner > admin > moderator > member, then alphabetical
  const roleOrder: Record<string, number> = { owner: 4, admin: 3, moderator: 2, member: 1 };
  allMembers.sort((a, b) => {
    const orderDiff = (roleOrder[b.role] || 0) - (roleOrder[a.role] || 0);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });

  const total = allMembers.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const sliced = allMembers.slice(startIndex, startIndex + limit);

  return {
    members: sliced,
    total,
    page,
    limit,
    totalPages
  };
}

/**
 * Creates default seed communities if database has no communities yet.
 * Non-destructive, links with existing official community group chat.
 */
export function createDefaultSeedCommunities(existingUsers: any[]): CommunityRecord[] {
  const userIds = (existingUsers || []).map(u => u.id);
  const now = new Date().toISOString();

  // Official Ka-Zone Community (Includes all active users as members, linked to gc-community-main)
  const officialCommunity: CommunityRecord = {
    id: 'comm-kazone-official',
    name: 'Ka-Zone Official Community 🌟',
    description: 'Opisyal na komunidad ng lahat ng Ka-Zone members para sa kwentuhan, tulungan, at updates sa rewards at mga lathalain!',
    avatar: '🇵🇭',
    coverImage: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    category: 'General',
    privacy: 'public',
    visibility: 'visible',
    ownerId: 'admin-rosco',
    admins: ['admin-rosco'],
    moderators: ['user-juan', 'user-clara'].filter(id => userIds.includes(id)),
    members: userIds.length > 0 ? userIds.slice(0, 30) : ['admin-rosco'],
    pendingMembers: [],
    invitedMembers: [],
    rules: [
      'Maging magalang sa bawat Ka-Zone member.',
      'Bawal ang spam, panlilinlang, o pekeng impormasyon.',
      'Sundin ang Z-oneApp Community Safety Standards.'
    ],
    linkedChatGroupId: 'gc-community-main',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: now
  };

  // Gaming community
  const gamingCommunity: CommunityRecord = {
    id: 'comm-pinoy-gamers',
    name: 'Pinoy Gamers & MLBB Lounge 🎮',
    description: 'Samahan ng mga mobile at PC gamers sa Pilipinas! Tips, tournaments, party up, at streaming.',
    avatar: '🎮',
    coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    category: 'Gaming',
    privacy: 'public',
    visibility: 'visible',
    ownerId: userIds[1] || 'admin-rosco',
    admins: [userIds[1] || 'admin-rosco'],
    moderators: [],
    members: userIds.slice(0, 15),
    pendingMembers: [],
    invitedMembers: [],
    rules: [
      'Walang trashtalk na lumalagpas sa laro.',
      'Bawal magbenta ng unauthorized game cheats o hacks.'
    ],
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: now
  };

  // Music and Talents community
  const musicCommunity: CommunityRecord = {
    id: 'comm-music-talents',
    name: 'Pinoy Music, Singing & Talents 🎤',
    description: 'Para sa mga mang-aawit, musikero, at creator ng Z-oneApp! Ibahagi ang iyong boses at cover songs.',
    avatar: '🎤',
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
    category: 'Music',
    privacy: 'public',
    visibility: 'visible',
    ownerId: userIds[2] || 'admin-rosco',
    admins: [userIds[2] || 'admin-rosco'],
    moderators: [],
    members: userIds.slice(0, 12),
    pendingMembers: [],
    invitedMembers: [],
    rules: [
      'Suportahan ang kapwa Pinoy talents.',
      'Bigyan ng credit ang mga original artists.'
    ],
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: now
  };

  // Private Earning & VIP Click Affiliates community
  const privateAffiliates: CommunityRecord = {
    id: 'comm-vip-affiliates',
    name: 'Z-one VIP Click Earners & Creators 💎',
    description: 'Eksklusibong komunidad para sa top click earners, verified creators, at VIP strategies. Kinakailangan ng pahintulot ng admin upang makasali.',
    avatar: '💎',
    coverImage: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
    category: 'Earning',
    privacy: 'private',
    visibility: 'visible',
    ownerId: 'admin-rosco',
    admins: ['admin-rosco'],
    moderators: [],
    members: ['admin-rosco', userIds[1], userIds[2]].filter(Boolean),
    pendingMembers: [],
    invitedMembers: [],
    rules: [
      'Pribado ang mga diskusyon sa loob ng komunidad na ito.',
      'Dapat sumunod sa lahat ng patakaran sa referral at lehitimong click engagement.'
    ],
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: now
  };

  return [officialCommunity, gamingCommunity, musicCommunity, privateAffiliates];
}
