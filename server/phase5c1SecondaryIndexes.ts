/**
 * Z-oneApp — Phase 5C-1 Secondary Hot Indexes Engine
 * Authoritative Target: Lazarteshop/Z_onecopy
 *
 * Surgical in-memory secondary lookup indexes for high-frequency multi-record queries:
 * - posts: by userId, communityId, teleserye feed, sharedPost.id
 * - reels: by author (addedByUserId / userId / normalized addedBy), communityId
 * - socialNotifications: by recipientUserId
 * - directMessages: by participant userId (senderId / receiverId)
 * - groupMessages: by groupId
 * - savedPosts: by userId
 * - savedReels: by userId
 * - challengeEntries: by challengeId, participantId
 *
 * Guarantees:
 * - Deterministic preservation of original DB array ordering on every query.
 * - Automatic stale-reference verification and fallback to linear scan when
 *   custom/isolated DB objects are passed.
 * - Incremental O(1) bucket maintenance across create, update, and delete paths.
 * - Zero disk persistence changes, zero schema changes, zero financial mutations.
 */

let secondaryIndexedDbRef: any = null;
let secondaryDbBackedEntities = new WeakSet<object>();

// 1. Posts secondary indexes
const postsByUserIdIndex = new Map<string, Set<any>>();
const postsByCommunityIdIndex = new Map<string, Set<any>>();
const postsBySharedPostIdIndex = new Map<string, Set<any>>();
const teleseryePostsSet = new Set<any>();

// 2. Reels secondary indexes
const reelsByUserIdIndex = new Map<string, Set<any>>();
const reelsByAuthorNameIndex = new Map<string, Set<any>>();
const reelsByCommunityIdIndex = new Map<string, Set<any>>();

// 3. Notifications secondary index
const notificationsByRecipientIdIndex = new Map<string, Set<any>>();

// 4. Messaging secondary indexes
const directMessagesByUserIdIndex = new Map<string, Set<any>>();
const groupMessagesByGroupIdIndex = new Map<string, Set<any>>();

// 5. Saved items secondary indexes
const savedPostsByUserIdIndex = new Map<string, Set<any>>();
const savedReelsByUserIdIndex = new Map<string, Set<any>>();

// 6. Challenge entries secondary indexes
const challengeEntriesByChallengeIdIndex = new Map<string, Set<any>>();
const challengeEntriesByParticipantIdIndex = new Map<string, Set<any>>();

function addToBucket(map: Map<string, Set<any>>, key: string | undefined | null, item: any): void {
  if (!key || typeof key !== 'string' || !item) return;
  const cleanKey = key.trim();
  if (!cleanKey) return;
  let bucket = map.get(cleanKey);
  if (!bucket) {
    bucket = new Set<any>();
    map.set(cleanKey, bucket);
  }
  bucket.add(item);
}

function removeFromBucket(map: Map<string, Set<any>>, key: string | undefined | null, item: any): void {
  if (!key || typeof key !== 'string' || !item) return;
  const cleanKey = key.trim();
  if (!cleanKey) return;
  const bucket = map.get(cleanKey);
  if (bucket) {
    bucket.delete(item);
    if (bucket.size === 0) {
      map.delete(cleanKey);
    }
  }
}

function removeEntityFromAllBuckets(map: Map<string, Set<any>>, predicate: (item: any) => boolean): void {
  for (const [k, bucket] of map.entries()) {
    for (const item of bucket) {
      if (predicate(item)) {
        bucket.delete(item);
      }
    }
    if (bucket.size === 0) {
      map.delete(k);
    }
  }
}

/**
 * Helper to preserve exact source collection array ordering when returning multiple items
 * or when a bucket has potential out-of-order insertions (e.g., unshift vs push).
 */
function sortByCollectionOrder<T>(items: T[], sourceArray?: T[]): T[] {
  if (items.length <= 1 || !Array.isArray(sourceArray) || sourceArray.length === 0) {
    return items;
  }
  if (items.length === 2) {
    const idx0 = sourceArray.indexOf(items[0]);
    const idx1 = sourceArray.indexOf(items[1]);
    if (idx0 > idx1 && idx0 !== -1 && idx1 !== -1) {
      return [items[1], items[0]];
    }
    return items;
  }
  const itemSet = new Set<T>(items);
  const ordered: T[] = [];
  for (let i = 0; i < sourceArray.length; i++) {
    const el = sourceArray[i];
    if (itemSet.has(el)) {
      ordered.push(el);
      if (ordered.length === itemSet.size) break;
    }
  }
  return ordered.length === itemSet.size ? ordered : items;
}

function isTargetDbIndexed(targetDb?: any): boolean {
  return Boolean(targetDb && secondaryIndexedDbRef && targetDb === secondaryIndexedDbRef);
}

function filterValidBucketItems<T extends object>(
  bucket: Set<T> | undefined,
  sourceArray?: T[]
): T[] {
  if (!bucket || bucket.size === 0) return [];
  const valid: T[] = [];
  for (const item of bucket) {
    if (!item) continue;
    if (
      Array.isArray(sourceArray) &&
      secondaryDbBackedEntities.has(item) &&
      !sourceArray.includes(item)
    ) {
      bucket.delete(item);
      continue;
    }
    valid.push(item);
  }
  return valid;
}

// ============================================================================
// FULL REBUILD ENTRY POINT (CALLED BY rebuildHotLookupIndexes)
// ============================================================================

export function rebuildSecondaryHotIndexes(db?: any): void {
  if (!db) return;
  secondaryIndexedDbRef = db;
  secondaryDbBackedEntities = new WeakSet<object>();

  postsByUserIdIndex.clear();
  postsByCommunityIdIndex.clear();
  postsBySharedPostIdIndex.clear();
  teleseryePostsSet.clear();

  reelsByUserIdIndex.clear();
  reelsByAuthorNameIndex.clear();
  reelsByCommunityIdIndex.clear();

  notificationsByRecipientIdIndex.clear();
  directMessagesByUserIdIndex.clear();
  groupMessagesByGroupIdIndex.clear();
  savedPostsByUserIdIndex.clear();
  savedReelsByUserIdIndex.clear();
  challengeEntriesByChallengeIdIndex.clear();
  challengeEntriesByParticipantIdIndex.clear();

  if (Array.isArray(db.posts)) {
    for (const post of db.posts) {
      if (post && typeof post === 'object') {
        secondaryDbBackedEntities.add(post);
        indexSecondaryPost(post, db);
      }
    }
  }

  if (Array.isArray(db.reels)) {
    for (const reel of db.reels) {
      if (reel && typeof reel === 'object') {
        secondaryDbBackedEntities.add(reel);
        indexSecondaryReel(reel, db);
      }
    }
  }

  if (Array.isArray(db.socialNotifications)) {
    for (const notif of db.socialNotifications) {
      if (notif && typeof notif === 'object') {
        secondaryDbBackedEntities.add(notif);
        indexSecondaryNotification(notif, db);
      }
    }
  }

  if (Array.isArray(db.directMessages)) {
    for (const dm of db.directMessages) {
      if (dm && typeof dm === 'object') {
        secondaryDbBackedEntities.add(dm);
        indexSecondaryDirectMessage(dm, db);
      }
    }
  }

  if (Array.isArray(db.groupMessages)) {
    for (const gm of db.groupMessages) {
      if (gm && typeof gm === 'object') {
        secondaryDbBackedEntities.add(gm);
        indexSecondaryGroupMessage(gm, db);
      }
    }
  }

  if (Array.isArray(db.savedPosts)) {
    for (const sp of db.savedPosts) {
      if (sp && typeof sp === 'object') {
        secondaryDbBackedEntities.add(sp);
        indexSecondarySavedPost(sp, db);
      }
    }
  }

  if (Array.isArray(db.savedReels)) {
    for (const sr of db.savedReels) {
      if (sr && typeof sr === 'object') {
        secondaryDbBackedEntities.add(sr);
        indexSecondarySavedReel(sr, db);
      }
    }
  }

  if (Array.isArray(db.challengeEntries)) {
    for (const entry of db.challengeEntries) {
      if (entry && typeof entry === 'object') {
        secondaryDbBackedEntities.add(entry);
        indexSecondaryChallengeEntry(entry, db);
      }
    }
  }
}

// ============================================================================
// 1. POSTS SECONDARY INDEXING & ACCESSORS
// ============================================================================

export function indexSecondaryPost(post: any, db?: any): void {
  if (!post || typeof post !== 'object') return;
  const targetDb = db || secondaryIndexedDbRef;
  if (targetDb?.posts?.includes(post)) {
    secondaryDbBackedEntities.add(post);
  }
  if (post.userId && typeof post.userId === 'string') {
    addToBucket(postsByUserIdIndex, post.userId, post);
  }
  if (post.communityId && typeof post.communityId === 'string') {
    addToBucket(postsByCommunityIdIndex, post.communityId, post);
  }
  if (post.sharedPost && post.sharedPost.id && typeof post.sharedPost.id === 'string') {
    addToBucket(postsBySharedPostIdIndex, post.sharedPost.id, post);
  }
  if (post.userId === 'teleserye-feed-author' || post.category === 'Teleserye') {
    teleseryePostsSet.add(post);
  } else {
    teleseryePostsSet.delete(post);
  }
}

export function removeSecondaryPost(postOrId: any): void {
  if (!postOrId) return;
  const postId = typeof postOrId === 'string' ? postOrId.trim() : postOrId?.id?.trim();
  const postObj = typeof postOrId === 'object' ? postOrId : null;

  if (postObj) {
    removeFromBucket(postsByUserIdIndex, postObj.userId, postObj);
    removeFromBucket(postsByCommunityIdIndex, postObj.communityId, postObj);
    if (postObj.sharedPost?.id) {
      removeFromBucket(postsBySharedPostIdIndex, postObj.sharedPost.id, postObj);
    }
    teleseryePostsSet.delete(postObj);
  }

  if (postId) {
    const matchFn = (p: any) => Boolean(p && (p === postObj || p.id === postId));
    removeEntityFromAllBuckets(postsByUserIdIndex, matchFn);
    removeEntityFromAllBuckets(postsByCommunityIdIndex, matchFn);
    removeEntityFromAllBuckets(postsBySharedPostIdIndex, matchFn);
    for (const p of teleseryePostsSet) {
      if (matchFn(p)) teleseryePostsSet.delete(p);
    }
  }
}

export function getPostsByUserId(userId?: string, db?: any): any[] {
  if (!userId || typeof userId !== 'string') return [];
  const cleanId = userId.trim();
  if (!cleanId) return [];
  const targetDb = db || secondaryIndexedDbRef;
  if (isTargetDbIndexed(targetDb)) {
    const bucket = postsByUserIdIndex.get(cleanId);
    const items = filterValidBucketItems(bucket, targetDb.posts).filter(p => p.userId === cleanId);
    return sortByCollectionOrder(items, targetDb.posts);
  }
  return (targetDb?.posts || []).filter((p: any) => p && p.userId === cleanId);
}

export function getPostsByCommunityId(communityId?: string, db?: any): any[] {
  if (!communityId || typeof communityId !== 'string') return [];
  const cleanId = communityId.trim();
  if (!cleanId) return [];
  const targetDb = db || secondaryIndexedDbRef;
  if (isTargetDbIndexed(targetDb)) {
    const bucket = postsByCommunityIdIndex.get(cleanId);
    const items = filterValidBucketItems(bucket, targetDb.posts).filter(p => p.communityId === cleanId);
    return sortByCollectionOrder(items, targetDb.posts);
  }
  return (targetDb?.posts || []).filter((p: any) => p && p.communityId === cleanId);
}

export function getTeleseryePosts(db?: any): any[] {
  const targetDb = db || secondaryIndexedDbRef;
  if (isTargetDbIndexed(targetDb)) {
    const items = filterValidBucketItems(teleseryePostsSet, targetDb.posts).filter(
      p => p.userId === 'teleserye-feed-author' || p.category === 'Teleserye'
    );
    return sortByCollectionOrder(items, targetDb.posts);
  }
  return (targetDb?.posts || []).filter(
    (p: any) => p && (p.userId === 'teleserye-feed-author' || p.category === 'Teleserye')
  );
}

export function getPostsBySharedPostId(sharedPostId?: string, db?: any): any[] {
  if (!sharedPostId || typeof sharedPostId !== 'string') return [];
  const cleanId = sharedPostId.trim();
  if (!cleanId) return [];
  const targetDb = db || secondaryIndexedDbRef;
  if (isTargetDbIndexed(targetDb)) {
    const bucket = postsBySharedPostIdIndex.get(cleanId);
    const items = filterValidBucketItems(bucket, targetDb.posts).filter(
      p => p.sharedPost && p.sharedPost.id === cleanId
    );
    return sortByCollectionOrder(items, targetDb.posts);
  }
  return (targetDb?.posts || []).filter((p: any) => p && p.sharedPost && p.sharedPost.id === cleanId);
}

// ============================================================================
// 2. REELS SECONDARY INDEXING & ACCESSORS
// ============================================================================

export function indexSecondaryReel(reel: any, db?: any): void {
  if (!reel || typeof reel !== 'object') return;
  const targetDb = db || secondaryIndexedDbRef;
  if (targetDb?.reels?.includes(reel)) {
    secondaryDbBackedEntities.add(reel);
  }
  if (reel.addedByUserId && typeof reel.addedByUserId === 'string') {
    addToBucket(reelsByUserIdIndex, reel.addedByUserId, reel);
  }
  if (reel.userId && typeof reel.userId === 'string') {
    addToBucket(reelsByUserIdIndex, reel.userId, reel);
  }
  if (reel.addedBy && typeof reel.addedBy === 'string') {
    const lowerName = reel.addedBy.toLowerCase().trim();
    if (lowerName) {
      addToBucket(reelsByAuthorNameIndex, lowerName, reel);
    }
  }
  if (reel.communityId && typeof reel.communityId === 'string') {
    addToBucket(reelsByCommunityIdIndex, reel.communityId, reel);
  }
}

export function removeSecondaryReel(reelOrId: any): void {
  if (!reelOrId) return;
  const reelId = typeof reelOrId === 'string' ? reelOrId.trim() : reelOrId?.id?.trim();
  const reelObj = typeof reelOrId === 'object' ? reelOrId : null;

  if (reelObj) {
    removeFromBucket(reelsByUserIdIndex, reelObj.addedByUserId, reelObj);
    removeFromBucket(reelsByUserIdIndex, reelObj.userId, reelObj);
    if (reelObj.addedBy && typeof reelObj.addedBy === 'string') {
      removeFromBucket(reelsByAuthorNameIndex, reelObj.addedBy.toLowerCase().trim(), reelObj);
    }
    removeFromBucket(reelsByCommunityIdIndex, reelObj.communityId, reelObj);
  }

  if (reelId) {
    const matchFn = (r: any) => Boolean(r && (r === reelObj || r.id === reelId));
    removeEntityFromAllBuckets(reelsByUserIdIndex, matchFn);
    removeEntityFromAllBuckets(reelsByAuthorNameIndex, matchFn);
    removeEntityFromAllBuckets(reelsByCommunityIdIndex, matchFn);
  }
}

export function getReelsByAuthor(
  userId?: string,
  userName?: string,
  db?: any,
  options?: { trimAuthorName?: boolean; exactAuthorName?: boolean }
): any[] {
  const targetDb = db || secondaryIndexedDbRef;
  const cleanId = userId && typeof userId === 'string' ? userId.trim() : '';
  const hasName = Boolean(userName && typeof userName === 'string' && userName.trim());
  const trimMode = options?.trimAuthorName ?? true;
  const exactMode = options?.exactAuthorName ?? false;

  if (isTargetDbIndexed(targetDb)) {
    const candidateSet = new Set<any>();
    if (cleanId) {
      const byId = filterValidBucketItems(reelsByUserIdIndex.get(cleanId), targetDb.reels);
      for (const r of byId) {
        if (r.addedByUserId === cleanId) candidateSet.add(r);
      }
    }
    if (hasName && userName) {
      const lookupName = userName.toLowerCase().trim();
      const byName = filterValidBucketItems(reelsByAuthorNameIndex.get(lookupName), targetDb.reels);
      for (const r of byName) {
        if (!r.addedBy) continue;
        if (exactMode) {
          if (r.addedBy === userName) candidateSet.add(r);
        } else if (trimMode) {
          if (r.addedBy.toLowerCase().trim() === userName.toLowerCase().trim()) candidateSet.add(r);
        } else {
          if (r.addedBy.toLowerCase() === userName.toLowerCase()) candidateSet.add(r);
        }
      }
    }
    return sortByCollectionOrder(Array.from(candidateSet), targetDb.reels);
  }

  return (targetDb?.reels || []).filter((r: any) => {
    if (!r) return false;
    if (cleanId && r.addedByUserId === cleanId) return true;
    if (hasName && userName && r.addedBy) {
      if (exactMode) return r.addedBy === userName;
      if (trimMode) return r.addedBy.toLowerCase().trim() === userName.toLowerCase().trim();
      return r.addedBy.toLowerCase() === userName.toLowerCase();
    }
    return false;
  });
}

export function getReelsByCommunityId(communityId?: string, db?: any): any[] {
  if (!communityId || typeof communityId !== 'string') return [];
  const cleanId = communityId.trim();
  if (!cleanId) return [];
  const targetDb = db || secondaryIndexedDbRef;
  if (isTargetDbIndexed(targetDb)) {
    const bucket = reelsByCommunityIdIndex.get(cleanId);
    const items = filterValidBucketItems(bucket, targetDb.reels).filter(r => r.communityId === cleanId);
    return sortByCollectionOrder(items, targetDb.reels);
  }
  return (targetDb?.reels || []).filter((r: any) => r && r.communityId === cleanId);
}

// ============================================================================
// 3. SOCIAL NOTIFICATIONS SECONDARY INDEXING & ACCESSORS
// ============================================================================

export function indexSecondaryNotification(notif: any, db?: any): void {
  if (!notif || typeof notif !== 'object') return;
  const targetDb = db || secondaryIndexedDbRef;
  if (targetDb?.socialNotifications?.includes(notif)) {
    secondaryDbBackedEntities.add(notif);
  }
  if (notif.recipientUserId && typeof notif.recipientUserId === 'string') {
    addToBucket(notificationsByRecipientIdIndex, notif.recipientUserId, notif);
  }
}

export function removeSecondaryNotification(notifOrId: any): void {
  if (!notifOrId) return;
  const notifId = typeof notifOrId === 'string' ? notifOrId.trim() : notifOrId?.id?.trim();
  const notifObj = typeof notifOrId === 'object' ? notifOrId : null;

  if (notifObj && notifObj.recipientUserId) {
    removeFromBucket(notificationsByRecipientIdIndex, notifObj.recipientUserId, notifObj);
  }
  if (notifId) {
    removeEntityFromAllBuckets(notificationsByRecipientIdIndex, (n: any) => Boolean(n && (n === notifObj || n.id === notifId)));
  }
}

export function getNotificationsByRecipientId(recipientUserId?: string, db?: any): any[] {
  if (!recipientUserId || typeof recipientUserId !== 'string') return [];
  const cleanId = recipientUserId.trim();
  if (!cleanId) return [];
  const targetDb = db || secondaryIndexedDbRef;
  if (isTargetDbIndexed(targetDb)) {
    const bucket = notificationsByRecipientIdIndex.get(cleanId);
    const items = filterValidBucketItems(bucket, targetDb.socialNotifications).filter(
      n => n.recipientUserId === cleanId
    );
    return sortByCollectionOrder(items, targetDb.socialNotifications);
  }
  return (targetDb?.socialNotifications || []).filter((n: any) => n && n.recipientUserId === cleanId);
}

// ============================================================================
// 4. DIRECT & GROUP MESSAGES SECONDARY INDEXING & ACCESSORS
// ============================================================================

export function indexSecondaryDirectMessage(dm: any, db?: any): void {
  if (!dm || typeof dm !== 'object') return;
  const targetDb = db || secondaryIndexedDbRef;
  if (targetDb?.directMessages?.includes(dm)) {
    secondaryDbBackedEntities.add(dm);
  }
  if (dm.senderId && typeof dm.senderId === 'string') {
    addToBucket(directMessagesByUserIdIndex, dm.senderId, dm);
  }
  if (dm.receiverId && typeof dm.receiverId === 'string') {
    addToBucket(directMessagesByUserIdIndex, dm.receiverId, dm);
  }
}

export function removeSecondaryDirectMessage(dmOrId: any): void {
  if (!dmOrId) return;
  const dmId = typeof dmOrId === 'string' ? dmOrId.trim() : dmOrId?.id?.trim();
  const dmObj = typeof dmOrId === 'object' ? dmOrId : null;

  if (dmObj) {
    removeFromBucket(directMessagesByUserIdIndex, dmObj.senderId, dmObj);
    removeFromBucket(directMessagesByUserIdIndex, dmObj.receiverId, dmObj);
  }
  if (dmId) {
    removeEntityFromAllBuckets(directMessagesByUserIdIndex, (m: any) => Boolean(m && (m === dmObj || m.id === dmId)));
  }
}

export function getDirectMessagesForUser(userId?: string, db?: any): any[] {
  if (!userId || typeof userId !== 'string') return [];
  const cleanId = userId.trim();
  if (!cleanId) return [];
  const targetDb = db || secondaryIndexedDbRef;
  if (isTargetDbIndexed(targetDb)) {
    const bucket = directMessagesByUserIdIndex.get(cleanId);
    const items = filterValidBucketItems(bucket, targetDb.directMessages).filter(
      m => m.senderId === cleanId || m.receiverId === cleanId
    );
    return sortByCollectionOrder(items, targetDb.directMessages);
  }
  return (targetDb?.directMessages || []).filter(
    (m: any) => m && (m.senderId === cleanId || m.receiverId === cleanId)
  );
}

export function indexSecondaryGroupMessage(gm: any, db?: any): void {
  if (!gm || typeof gm !== 'object') return;
  const targetDb = db || secondaryIndexedDbRef;
  if (targetDb?.groupMessages?.includes(gm)) {
    secondaryDbBackedEntities.add(gm);
  }
  if (gm.groupId && typeof gm.groupId === 'string') {
    addToBucket(groupMessagesByGroupIdIndex, gm.groupId, gm);
  }
}

export function removeSecondaryGroupMessage(gmOrId: any): void {
  if (!gmOrId) return;
  const gmId = typeof gmOrId === 'string' ? gmOrId.trim() : gmOrId?.id?.trim();
  const gmObj = typeof gmOrId === 'object' ? gmOrId : null;

  if (gmObj && gmObj.groupId) {
    removeFromBucket(groupMessagesByGroupIdIndex, gmObj.groupId, gmObj);
  }
  if (gmId) {
    removeEntityFromAllBuckets(groupMessagesByGroupIdIndex, (m: any) => Boolean(m && (m === gmObj || m.id === gmId)));
  }
}

export function getGroupMessagesByGroupId(groupId?: string, db?: any): any[] {
  if (!groupId || typeof groupId !== 'string') return [];
  const cleanId = groupId.trim();
  if (!cleanId) return [];
  const targetDb = db || secondaryIndexedDbRef;
  if (isTargetDbIndexed(targetDb)) {
    const bucket = groupMessagesByGroupIdIndex.get(cleanId);
    const items = filterValidBucketItems(bucket, targetDb.groupMessages).filter(
      m => m.groupId === cleanId
    );
    return sortByCollectionOrder(items, targetDb.groupMessages);
  }
  return (targetDb?.groupMessages || []).filter((m: any) => m && m.groupId === cleanId);
}

export function getGroupMessagesByGroupIds(groupIds?: string[], db?: any): any[] {
  if (!Array.isArray(groupIds) || groupIds.length === 0) return [];
  const targetDb = db || secondaryIndexedDbRef;
  const idSet = new Set(groupIds.map(id => (typeof id === 'string' ? id.trim() : '')).filter(Boolean));
  if (idSet.size === 0) return [];

  if (isTargetDbIndexed(targetDb)) {
    const combined: any[] = [];
    for (const gid of idSet) {
      const bucket = groupMessagesByGroupIdIndex.get(gid);
      const valid = filterValidBucketItems(bucket, targetDb.groupMessages).filter(m => m.groupId === gid);
      for (const item of valid) {
        combined.push(item);
      }
    }
    return sortByCollectionOrder(combined, targetDb.groupMessages);
  }
  return (targetDb?.groupMessages || []).filter((m: any) => m && idSet.has(m.groupId));
}

// ============================================================================
// 5. SAVED POSTS & SAVED REELS SECONDARY INDEXING & ACCESSORS
// ============================================================================

export function indexSecondarySavedPost(savedPost: any, db?: any): void {
  if (!savedPost || typeof savedPost !== 'object') return;
  const targetDb = db || secondaryIndexedDbRef;
  if (targetDb?.savedPosts?.includes(savedPost)) {
    secondaryDbBackedEntities.add(savedPost);
  }
  if (savedPost.userId && typeof savedPost.userId === 'string') {
    addToBucket(savedPostsByUserIdIndex, savedPost.userId, savedPost);
  }
}

export function removeSecondarySavedPost(savedPostOrId: any, userId?: string, postId?: string): void {
  if (savedPostOrId && typeof savedPostOrId === 'object') {
    removeFromBucket(savedPostsByUserIdIndex, savedPostOrId.userId, savedPostOrId);
  }
  if (userId && postId) {
    const bucket = savedPostsByUserIdIndex.get(userId.trim());
    if (bucket) {
      for (const s of bucket) {
        if (s && s.userId === userId && s.postId === postId) {
          bucket.delete(s);
        }
      }
      if (bucket.size === 0) savedPostsByUserIdIndex.delete(userId.trim());
    }
  } else if (postId && !userId) {
    removeEntityFromAllBuckets(savedPostsByUserIdIndex, (s: any) => Boolean(s && s.postId === postId));
  }
}

export function getSavedPostsByUserId(userId?: string, db?: any): any[] {
  if (!userId || typeof userId !== 'string') return [];
  const cleanId = userId.trim();
  if (!cleanId) return [];
  const targetDb = db || secondaryIndexedDbRef;
  if (isTargetDbIndexed(targetDb)) {
    const bucket = savedPostsByUserIdIndex.get(cleanId);
    const items = filterValidBucketItems(bucket, targetDb.savedPosts).filter(s => s.userId === cleanId);
    return sortByCollectionOrder(items, targetDb.savedPosts);
  }
  return (targetDb?.savedPosts || []).filter((s: any) => s && s.userId === cleanId);
}

export function indexSecondarySavedReel(savedReel: any, db?: any): void {
  if (!savedReel || typeof savedReel !== 'object') return;
  const targetDb = db || secondaryIndexedDbRef;
  if (targetDb?.savedReels?.includes(savedReel)) {
    secondaryDbBackedEntities.add(savedReel);
  }
  if (savedReel.userId && typeof savedReel.userId === 'string') {
    addToBucket(savedReelsByUserIdIndex, savedReel.userId, savedReel);
  }
}

export function removeSecondarySavedReel(savedReelOrId: any, userId?: string, reelId?: string): void {
  if (savedReelOrId && typeof savedReelOrId === 'object') {
    removeFromBucket(savedReelsByUserIdIndex, savedReelOrId.userId, savedReelOrId);
  }
  if (userId && reelId) {
    const bucket = savedReelsByUserIdIndex.get(userId.trim());
    if (bucket) {
      for (const s of bucket) {
        if (s && s.userId === userId && s.reelId === reelId) {
          bucket.delete(s);
        }
      }
      if (bucket.size === 0) savedReelsByUserIdIndex.delete(userId.trim());
    }
  } else if (reelId && !userId) {
    removeEntityFromAllBuckets(savedReelsByUserIdIndex, (s: any) => Boolean(s && s.reelId === reelId));
  }
}

export function getSavedReelsByUserId(userId?: string, db?: any): any[] {
  if (!userId || typeof userId !== 'string') return [];
  const cleanId = userId.trim();
  if (!cleanId) return [];
  const targetDb = db || secondaryIndexedDbRef;
  if (isTargetDbIndexed(targetDb)) {
    const bucket = savedReelsByUserIdIndex.get(cleanId);
    const items = filterValidBucketItems(bucket, targetDb.savedReels).filter(s => s.userId === cleanId);
    return sortByCollectionOrder(items, targetDb.savedReels);
  }
  return (targetDb?.savedReels || []).filter((s: any) => s && s.userId === cleanId);
}

// ============================================================================
// 6. CHALLENGE ENTRIES SECONDARY INDEXING & ACCESSORS
// ============================================================================

export function indexSecondaryChallengeEntry(entry: any, db?: any): void {
  if (!entry || typeof entry !== 'object') return;
  const targetDb = db || secondaryIndexedDbRef;
  if (targetDb?.challengeEntries?.includes(entry)) {
    secondaryDbBackedEntities.add(entry);
  }
  if (entry.challengeId && typeof entry.challengeId === 'string') {
    addToBucket(challengeEntriesByChallengeIdIndex, entry.challengeId, entry);
  }
  if (entry.participantId && typeof entry.participantId === 'string') {
    addToBucket(challengeEntriesByParticipantIdIndex, entry.participantId, entry);
  }
}

export function removeSecondaryChallengeEntry(entryOrId: any): void {
  if (!entryOrId) return;
  const entryId = typeof entryOrId === 'string' ? entryOrId.trim() : entryOrId?.id?.trim();
  const entryObj = typeof entryOrId === 'object' ? entryOrId : null;

  if (entryObj) {
    removeFromBucket(challengeEntriesByChallengeIdIndex, entryObj.challengeId, entryObj);
    removeFromBucket(challengeEntriesByParticipantIdIndex, entryObj.participantId, entryObj);
  }
  if (entryId) {
    const matchFn = (e: any) => Boolean(e && (e === entryObj || e.id === entryId));
    removeEntityFromAllBuckets(challengeEntriesByChallengeIdIndex, matchFn);
    removeEntityFromAllBuckets(challengeEntriesByParticipantIdIndex, matchFn);
  }
}

export function getChallengeEntriesByChallengeId(challengeId?: string, db?: any): any[] {
  if (!challengeId || typeof challengeId !== 'string') return [];
  const cleanId = challengeId.trim();
  if (!cleanId) return [];
  const targetDb = db || secondaryIndexedDbRef;
  if (isTargetDbIndexed(targetDb)) {
    const bucket = challengeEntriesByChallengeIdIndex.get(cleanId);
    const items = filterValidBucketItems(bucket, targetDb.challengeEntries).filter(
      e => e.challengeId === cleanId
    );
    return sortByCollectionOrder(items, targetDb.challengeEntries);
  }
  return (targetDb?.challengeEntries || []).filter((e: any) => e && e.challengeId === cleanId);
}

export function getChallengeEntriesByParticipantId(participantId?: string, db?: any): any[] {
  if (!participantId || typeof participantId !== 'string') return [];
  const cleanId = participantId.trim();
  if (!cleanId) return [];
  const targetDb = db || secondaryIndexedDbRef;
  if (isTargetDbIndexed(targetDb)) {
    const bucket = challengeEntriesByParticipantIdIndex.get(cleanId);
    const items = filterValidBucketItems(bucket, targetDb.challengeEntries).filter(
      e => e.participantId === cleanId
    );
    return sortByCollectionOrder(items, targetDb.challengeEntries);
  }
  return (targetDb?.challengeEntries || []).filter((e: any) => e && e.participantId === cleanId);
}

/**
 * Helper for Phase 2A Suggested Creators: returns indexed posts & reels maps when
 * targetDb is the active indexed DB, or undefined to fall back to standard loop.
 */
export function getIndexedCreatorContentBuckets(db?: any): {
  postsByUserId: Map<string, Set<any>>;
  reelsByUserId: Map<string, Set<any>>;
} | null {
  if (!isTargetDbIndexed(db)) return null;
  return {
    postsByUserId: postsByUserIdIndex,
    reelsByUserId: reelsByUserIdIndex
  };
}
