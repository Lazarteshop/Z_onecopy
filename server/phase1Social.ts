/**
 * Z-oneApp — Phase 1 Social Graph & Multi-Reactions Engine
 * Authoritative modular helper for Friendships and Reactions.
 */

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | 'care';

export const ALLOWED_REACTIONS: readonly ReactionType[] = [
  'like',
  'love',
  'haha',
  'wow',
  'sad',
  'angry',
  'care'
] as const;

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  haha: '😆',
  wow: '😮',
  sad: '😢',
  angry: '😡',
  care: '🥰'
};

export const REACTION_LABELS: Record<ReactionType, string> = {
  like: 'Like',
  love: 'Love',
  haha: 'Haha',
  wow: 'Wow',
  sad: 'Sad',
  angry: 'Angry',
  care: 'Care'
};

export interface PostReactionRecord {
  userId: string;
  type: ReactionType;
  createdAt: string;
  userName?: string;
  userAvatar?: string;
}

export interface PostReactionCounts {
  like: number;
  love: number;
  haha: number;
  wow: number;
  sad: number;
  angry: number;
  care: number;
}

export interface FriendshipRecord {
  id: string;
  userId: string;
  friendId: string;
  createdAt: string;
}

export interface FriendRequestRecord {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// In-memory bidirectional adjacency index for O(1) friend lookups and O(min(|A|,|B|)) mutual checks
const friendIndex = new Map<string, Set<string>>();

/**
 * Rebuilds the in-memory friendship graph index from persistent records.
 */
export function rebuildFriendIndex(friendships?: FriendshipRecord[]): void {
  friendIndex.clear();
  if (!Array.isArray(friendships)) return;

  for (const f of friendships) {
    if (!f || !f.userId || !f.friendId) continue;
    let setA = friendIndex.get(f.userId);
    if (!setA) {
      setA = new Set<string>();
      friendIndex.set(f.userId, setA);
    }
    setA.add(f.friendId);

    let setB = friendIndex.get(f.friendId);
    if (!setB) {
      setB = new Set<string>();
      friendIndex.set(f.friendId, setB);
    }
    setB.add(f.userId);
  }
}

/**
 * Adds friendship to in-memory index in both directions.
 */
export function addFriendshipToIndex(userA: string, userB: string): void {
  if (!userA || !userB || userA === userB) return;
  
  let setA = friendIndex.get(userA);
  if (!setA) {
    setA = new Set<string>();
    friendIndex.set(userA, setA);
  }
  setA.add(userB);

  let setB = friendIndex.get(userB);
  if (!setB) {
    setB = new Set<string>();
    friendIndex.set(userB, setB);
  }
  setB.add(userA);
}

/**
 * Removes friendship from in-memory index in both directions.
 */
export function removeFriendshipFromIndex(userA: string, userB: string): void {
  if (!userA || !userB) return;
  friendIndex.get(userA)?.delete(userB);
  friendIndex.get(userB)?.delete(userA);
}

/**
 * Checks if two users are friends in O(1) time.
 */
export function areFriends(userA: string, userB: string): boolean {
  if (!userA || !userB || userA === userB) return false;
  return Boolean(friendIndex.get(userA)?.has(userB));
}

/**
 * Gets list of friend user IDs for a user.
 */
export function getFriendIds(userId: string): string[] {
  if (!userId) return [];
  const set = friendIndex.get(userId);
  return set ? Array.from(set) : [];
}

/**
 * Computes mutual friend IDs between userA and userB with bounded set intersection.
 */
export function getMutualFriendIds(userA: string, userB: string): string[] {
  if (!userA || !userB || userA === userB) return [];
  const setA = friendIndex.get(userA);
  const setB = friendIndex.get(userB);
  if (!setA || !setB || setA.size === 0 || setB.size === 0) return [];

  // Iterate over the smaller set for optimal time complexity
  const [smaller, larger] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  const mutuals: string[] = [];
  for (const id of smaller) {
    if (larger.has(id)) {
      mutuals.push(id);
    }
  }
  return mutuals;
}

/**
 * Ensures a post has all standard reaction fields initialized.
 */
export function initPostReactions(post: any): void {
  if (!post) return;
  if (!Array.isArray(post.likes)) {
    post.likes = [];
  }
  if (!Array.isArray(post.reactions)) {
    post.reactions = [];
  }
  if (!post.reactionCounts || typeof post.reactionCounts !== 'object') {
    post.reactionCounts = {
      like: post.likes.length,
      love: 0,
      haha: 0,
      wow: 0,
      sad: 0,
      angry: 0,
      care: 0
    };
  } else {
    // Ensure all 7 reaction keys exist
    for (const r of ALLOWED_REACTIONS) {
      if (typeof post.reactionCounts[r] !== 'number' || post.reactionCounts[r] < 0) {
        post.reactionCounts[r] = 0;
      }
    }
  }
  if (!Array.isArray(post.rewardedUsers)) {
    post.rewardedUsers = [...post.likes];
  }
}

export interface ReactionProcessResult {
  success: boolean;
  action: 'added' | 'switched' | 'removed';
  userReaction: ReactionType | null;
  rewardAwarded: number;
  shouldNotify: boolean;
  message: string;
}

/**
 * Processes a reaction addition, switch, or removal.
 * Preserves legacy likes[] array, caps detailed reactions at 100, and ensures idempotent rewards.
 */
export function processPostReaction(
  post: any,
  userId: string,
  reaction: ReactionType,
  userDetails?: { name?: string; avatar?: string }
): ReactionProcessResult {
  initPostReactions(post);

  const existingIdx = post.reactions.findIndex((r: PostReactionRecord) => r.userId === userId);
  const existingRecord: PostReactionRecord | undefined = existingIdx > -1 ? post.reactions[existingIdx] : undefined;
  
  // Determine previous reaction type (check detailed reactions first, then legacy likes fallback)
  let priorType: ReactionType | null = null;
  if (existingRecord) {
    priorType = existingRecord.type;
  } else if (post.likes.includes(userId)) {
    priorType = 'like';
  }

  const now = new Date().toISOString();

  // CASE 1: Toggle off existing reaction
  if (priorType === reaction) {
    // Decrement count
    post.reactionCounts[priorType] = Math.max(0, (post.reactionCounts[priorType] || 1) - 1);

    // Remove from detailed reactions
    if (existingIdx > -1) {
      post.reactions.splice(existingIdx, 1);
    }

    // If it was 'like', remove from legacy likes array
    if (priorType === 'like') {
      const likeIdx = post.likes.indexOf(userId);
      if (likeIdx > -1) {
        post.likes.splice(likeIdx, 1);
      }
    }

    return {
      success: true,
      action: 'removed',
      userReaction: null,
      rewardAwarded: 0,
      shouldNotify: false,
      message: 'Naalis ang iyong reaksyon.'
    };
  }

  // CASE 2: Switch reaction from one to another
  if (priorType !== null) {
    // Decrement prior count
    post.reactionCounts[priorType] = Math.max(0, (post.reactionCounts[priorType] || 1) - 1);
    // Increment new count
    post.reactionCounts[reaction] = (post.reactionCounts[reaction] || 0) + 1;

    // Update legacy likes array
    if (priorType === 'like') {
      const likeIdx = post.likes.indexOf(userId);
      if (likeIdx > -1) post.likes.splice(likeIdx, 1);
    }
    if (reaction === 'like' && !post.likes.includes(userId)) {
      post.likes.push(userId);
    }

    // Update detailed reaction record
    if (existingIdx > -1) {
      post.reactions[existingIdx].type = reaction;
      post.reactions[existingIdx].createdAt = now;
      if (userDetails?.name) post.reactions[existingIdx].userName = userDetails.name;
      if (userDetails?.avatar) post.reactions[existingIdx].userAvatar = userDetails.avatar;
    } else {
      post.reactions.push({
        userId,
        type: reaction,
        createdAt: now,
        userName: userDetails?.name,
        userAvatar: userDetails?.avatar
      });
      // Cap at 100 detailed reactions: evict oldest if exceeded
      if (post.reactions.length > 100) {
        post.reactions.shift();
      }
    }

    return {
      success: true,
      action: 'switched',
      userReaction: reaction,
      rewardAwarded: 0, // Switching reactions never generates duplicate rewards
      shouldNotify: true,
      message: `Pinalitan ang reaksyon sa ${REACTION_LABELS[reaction]} ${REACTION_EMOJIS[reaction]}`
    };
  }

  // CASE 3: New reaction (User had no active reaction)
  post.reactionCounts[reaction] = (post.reactionCounts[reaction] || 0) + 1;

  if (reaction === 'like' && !post.likes.includes(userId)) {
    post.likes.push(userId);
  }

  post.reactions.push({
    userId,
    type: reaction,
    createdAt: now,
    userName: userDetails?.name,
    userAvatar: userDetails?.avatar
  });

  // Cap at 100 detailed records (evict oldest if needed, keeping likes[] intact)
  if (post.reactions.length > 100) {
    post.reactions.shift();
  }

  // Reward check: Only award ₱0.05 if user has never received reward for this post before
  let rewardAwarded = 0;
  if (!post.rewardedUsers.includes(userId)) {
    post.rewardedUsers.push(userId);
    rewardAwarded = 0.05;
  }

  return {
    success: true,
    action: 'added',
    userReaction: reaction,
    rewardAwarded,
    shouldNotify: true,
    message: rewardAwarded > 0
      ? `🎉 +₱0.05 Reward sa pag-react ng ${REACTION_LABELS[reaction]}!`
      : `Nag-react ka ng ${REACTION_LABELS[reaction]} ${REACTION_EMOJIS[reaction]}`
  };
}
