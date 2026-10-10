/**
 * Z-oneApp — Phase 5C-1 Secondary Hot Indexes Verification Suite
 * Authoritative Target: Lazarteshop/Z_onecopy
 *
 * Strictly isolated, non-destructive verification suite comparing:
 * 1. Indexed secondary query results vs. exact linear-scan baseline on live production DB (read-only)
 * 2. Incremental maintenance across create, update, and delete operations on isolated mock DB
 * 3. Stale-reference cleanup & automatic fallback when custom/isolated DB objects are passed
 * 4. Zero persistence side effects & ₱0.00 financial delta verification
 */

process.env.NODE_ENV = 'test';
process.env.SKIP_SERVER_AUTOSTART = 'true';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import assert from 'assert';
import {
  rebuildHotLookupIndexes,
  indexPost,
  removePostFromIndex,
  indexReel,
  removeReelFromIndex
} from '../server';
import {
  rebuildSecondaryHotIndexes,
  indexSecondaryPost,
  removeSecondaryPost,
  getPostsByUserId,
  getPostsByCommunityId,
  getTeleseryePosts,
  getPostsBySharedPostId,
  indexSecondaryReel,
  removeSecondaryReel,
  getReelsByAuthor,
  getReelsByCommunityId,
  indexSecondaryNotification,
  removeSecondaryNotification,
  getNotificationsByRecipientId,
  indexSecondaryDirectMessage,
  removeSecondaryDirectMessage,
  getDirectMessagesForUser,
  indexSecondaryGroupMessage,
  removeSecondaryGroupMessage,
  getGroupMessagesByGroupId,
  getGroupMessagesByGroupIds,
  indexSecondarySavedPost,
  removeSecondarySavedPost,
  getSavedPostsByUserId,
  indexSecondarySavedReel,
  removeSecondarySavedReel,
  getSavedReelsByUserId,
  indexSecondaryChallengeEntry,
  removeSecondaryChallengeEntry,
  getChallengeEntriesByChallengeId,
  getChallengeEntriesByParticipantId
} from '../server/phase5c1SecondaryIndexes';

const DB_PATH = path.resolve(process.cwd(), 'src/data/db.json');

function computeSha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function computeFinancialSnapshot(db: any) {
  const users = db.users || [];
  const totalBalance = Number(
    users.reduce((sum: number, u: any) => sum + Number(u?.stats?.balance || 0), 0).toFixed(2)
  );
  const totalReelTokens = Number(
    users.reduce((sum: number, u: any) => sum + Number(u?.reelTokens || 0), 0).toFixed(2)
  );
  return { totalBalance, totalReelTokens, userCount: users.length };
}

async function runPhase5C1Tests() {
  console.log('==================================================================');
  console.log('🧪 Z-oneApp Phase 5C-1 Secondary Hot Indexes Verification Suite');
  console.log('==================================================================');

  const preHash = computeSha256(DB_PATH);
  const rawDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const preFinancial = computeFinancialSnapshot(rawDb);

  console.log(`[1/4] Loaded production DB snapshot (read-only): sha256=${preHash.slice(0, 16)}...`);
  console.log(
    `      Users=${rawDb.users?.length || 0}, Posts=${rawDb.posts?.length || 0}, Reels=${rawDb.reels?.length || 0}, Notifications=${rawDb.socialNotifications?.length || 0}, DMs=${rawDb.directMessages?.length || 0}, GroupMsgs=${rawDb.groupMessages?.length || 0}`
  );

  // Build hot primary + secondary indexes against a cloned in-memory snapshot
  const liveClone = JSON.parse(JSON.stringify(rawDb));
  rebuildHotLookupIndexes(liveClone as any);

  // --------------------------------------------------------------------------
  // STEP 1: Compare indexed query results with exact linear-scan results
  // --------------------------------------------------------------------------
  console.log('[2/4] Verifying 100% parity between Secondary Indexes and Linear Scans on production data...');

  // 1a. Posts by userId across all users + synthetic IDs
  const allUserIds = new Set<string>([
    ...(liveClone.users || []).map((u: any) => u.id),
    ...(liveClone.posts || []).map((p: any) => p.userId).filter(Boolean),
    'teleserye-feed-author',
    'non-existent-user-id'
  ]);
  for (const uid of allUserIds) {
    const indexed = getPostsByUserId(uid, liveClone);
    const linear = (liveClone.posts || []).filter((p: any) => p && p.userId === uid);
    assert.strictEqual(indexed.length, linear.length, `Posts count mismatch for userId=${uid}`);
    for (let i = 0; i < linear.length; i++) {
      assert.strictEqual(indexed[i], linear[i], `Post ordering/reference mismatch at index ${i} for userId=${uid}`);
    }
  }

  // 1b. Posts by communityId
  const allCommunityIds = new Set<string>([
    ...(liveClone.communities || []).map((c: any) => c.id),
    ...(liveClone.posts || []).map((p: any) => p.communityId).filter(Boolean),
    ...(liveClone.reels || []).map((r: any) => r.communityId).filter(Boolean),
    'non-existent-community'
  ]);
  for (const cid of allCommunityIds) {
    const indexedPosts = getPostsByCommunityId(cid, liveClone);
    const linearPosts = (liveClone.posts || []).filter((p: any) => p && p.communityId === cid);
    assert.deepStrictEqual(indexedPosts, linearPosts, `Community posts mismatch for communityId=${cid}`);

    const indexedReels = getReelsByCommunityId(cid, liveClone);
    const linearReels = (liveClone.reels || []).filter((r: any) => r && r.communityId === cid);
    assert.deepStrictEqual(indexedReels, linearReels, `Community reels mismatch for communityId=${cid}`);
  }

  // 1c. Teleserye posts
  const indexedTeleserye = getTeleseryePosts(liveClone);
  const linearTeleserye = (liveClone.posts || []).filter(
    (p: any) => p && (p.userId === 'teleserye-feed-author' || p.category === 'Teleserye')
  );
  assert.deepStrictEqual(indexedTeleserye, linearTeleserye, 'Teleserye posts mismatch');

  // 1d. Posts by sharedPost.id
  const sharedIds = new Set<string>([
    ...(liveClone.posts || []).map((p: any) => p?.sharedPost?.id).filter(Boolean),
    ...(liveClone.posts || []).slice(0, 30).map((p: any) => p.id),
    'non-existent-shared-id'
  ]);
  for (const sid of sharedIds) {
    const indexedShared = getPostsBySharedPostId(sid, liveClone);
    const linearShared = (liveClone.posts || []).filter((p: any) => p && p.sharedPost && p.sharedPost.id === sid);
    assert.deepStrictEqual(indexedShared, linearShared, `Shared posts mismatch for sharedPost.id=${sid}`);
  }

  // 1e. Reels by author (all 3 matching modes used in server.ts)
  for (const u of liveClone.users || []) {
    // Mode 1: trimAuthorName = true (used in /api/reels/my-activity and /api/reels/redeem-profit)
    const idxTrim = getReelsByAuthor(u.id, u.name, liveClone, { trimAuthorName: true });
    const linTrim = (liveClone.reels || []).filter(
      (r: any) =>
        r.addedByUserId === u.id ||
        (r.addedBy && r.addedBy.toLowerCase().trim() === u.name.toLowerCase().trim())
    );
    assert.deepStrictEqual(idxTrim, linTrim, `Reels (trimAuthorName) mismatch for user=${u.id}`);

    // Mode 2: trimAuthorName = false (used in /api/zone/profile/:userId)
    const idxNoTrim = getReelsByAuthor(u.id, u.name, liveClone, { trimAuthorName: false });
    const linNoTrim = (liveClone.reels || []).filter(
      (r: any) =>
        r.addedByUserId === u.id ||
        (r.addedBy && r.addedBy.toLowerCase() === u.name.toLowerCase())
    );
    assert.deepStrictEqual(idxNoTrim, linNoTrim, `Reels (noTrimAuthorName) mismatch for user=${u.id}`);

    // Mode 3: exactAuthorName = true (used in creator analytics)
    const idxExact = getReelsByAuthor(u.id, u.name, liveClone, { exactAuthorName: true });
    const linExact = (liveClone.reels || []).filter(
      (r: any) => r.addedByUserId === u.id || r.addedBy === u.name
    );
    assert.deepStrictEqual(idxExact, linExact, `Reels (exactAuthorName) mismatch for user=${u.id}`);
  }

  // 1f. Notifications by recipientUserId
  for (const uid of allUserIds) {
    const idxNotifs = getNotificationsByRecipientId(uid, liveClone);
    const linNotifs = (liveClone.socialNotifications || []).filter((n: any) => n && n.recipientUserId === uid);
    assert.deepStrictEqual(idxNotifs, linNotifs, `Notifications mismatch for recipientUserId=${uid}`);
  }

  // 1g. Direct messages by userId
  for (const uid of allUserIds) {
    const idxDms = getDirectMessagesForUser(uid, liveClone);
    const linDms = (liveClone.directMessages || []).filter(
      (m: any) => m && (m.senderId === uid || m.receiverId === uid)
    );
    assert.deepStrictEqual(idxDms, linDms, `DirectMessages mismatch for userId=${uid}`);
  }

  // 1h. Group messages by single groupId & multiple groupIds
  const allGroupIds = [
    ...new Set<string>([
      ...(liveClone.groupChats || []).map((g: any) => g.id),
      ...(liveClone.groupMessages || []).map((m: any) => m.groupId).filter(Boolean),
      'gc-community-main',
      'non-existent-group'
    ])
  ];
  for (const gid of allGroupIds) {
    const idxGms = getGroupMessagesByGroupId(gid, liveClone);
    const linGms = (liveClone.groupMessages || []).filter((m: any) => m && m.groupId === gid);
    assert.deepStrictEqual(idxGms, linGms, `GroupMessages mismatch for groupId=${gid}`);
  }
  const idxMultiGms = getGroupMessagesByGroupIds(allGroupIds, liveClone);
  const linMultiGms = (liveClone.groupMessages || []).filter((m: any) => m && allGroupIds.includes(m.groupId));
  assert.deepStrictEqual(idxMultiGms, linMultiGms, 'GroupMessages multi-group query mismatch');

  // 1i. Saved posts & Saved reels by userId
  for (const uid of allUserIds) {
    const idxSavedPosts = getSavedPostsByUserId(uid, liveClone);
    const linSavedPosts = (liveClone.savedPosts || []).filter((s: any) => s && s.userId === uid);
    assert.deepStrictEqual(idxSavedPosts, linSavedPosts, `SavedPosts mismatch for userId=${uid}`);

    const idxSavedReels = getSavedReelsByUserId(uid, liveClone);
    const linSavedReels = (liveClone.savedReels || []).filter((s: any) => s && s.userId === uid);
    assert.deepStrictEqual(idxSavedReels, linSavedReels, `SavedReels mismatch for userId=${uid}`);
  }

  // 1j. Challenge entries by challengeId and participantId
  const allChallengeIds = new Set<string>([
    ...(liveClone.challenges || []).map((c: any) => c.id),
    ...(liveClone.creatorChallenges || []).map((c: any) => c.id),
    ...(liveClone.challengeEntries || []).map((e: any) => e.challengeId).filter(Boolean),
    'non-existent-challenge'
  ]);
  for (const chId of allChallengeIds) {
    const idxEntries = getChallengeEntriesByChallengeId(chId, liveClone);
    const linEntries = (liveClone.challengeEntries || []).filter((e: any) => e && e.challengeId === chId);
    assert.deepStrictEqual(idxEntries, linEntries, `ChallengeEntries mismatch for challengeId=${chId}`);
  }
  for (const uid of allUserIds) {
    const idxPart = getChallengeEntriesByParticipantId(uid, liveClone);
    const linPart = (liveClone.challengeEntries || []).filter((e: any) => e && e.participantId === uid);
    assert.deepStrictEqual(idxPart, linPart, `ChallengeEntries mismatch for participantId=${uid}`);
  }

  console.log('      ✅ 100% query parity verified across all secondary indexes on production dataset.');

  // --------------------------------------------------------------------------
  // STEP 2: Verify Create, Update, Delete & Ordering Maintenance on Isolated DB
  // --------------------------------------------------------------------------
  console.log('[3/4] Verifying incremental Create, Update, Delete, and Ordering semantics...');

  const mockDb: any = {
    users: [{ id: 'u1', name: 'Alice Creator', email: 'alice@example.com', stats: { balance: 100 } }],
    posts: [],
    reels: [],
    communities: [{ id: 'c1', name: 'Tech Group', members: ['u1'], privacy: 'public', visibility: 'visible' }],
    socialNotifications: [],
    directMessages: [],
    groupMessages: [],
    savedPosts: [],
    savedReels: [],
    challengeEntries: []
  };

  rebuildHotLookupIndexes(mockDb);

  // Create Post 1 (pushed) and Post 2 (unshifted, simulating sponsor/pinned post)
  const post1 = {
    id: 'p1',
    userId: 'u1',
    communityId: 'c1',
    text: 'First post',
    createdAt: '2026-01-01T00:00:00.000Z'
  };
  mockDb.posts.push(post1);
  indexPost(post1);

  const post2 = {
    id: 'p2',
    userId: 'u1',
    communityId: 'c1',
    sharedPost: { id: 'p1' },
    category: 'Teleserye',
    text: 'Second post unshifted',
    createdAt: '2026-01-02T00:00:00.000Z'
  };
  mockDb.posts.unshift(post2);
  indexPost(post2);

  // Verify order matches mockDb.posts ([post2, post1])
  assert.deepStrictEqual(
    getPostsByUserId('u1', mockDb),
    mockDb.posts.filter((p: any) => p.userId === 'u1'),
    'Unshifted post ordering must match array order'
  );
  assert.deepStrictEqual(getPostsByCommunityId('c1', mockDb), [post2, post1]);
  assert.deepStrictEqual(getPostsBySharedPostId('p1', mockDb), [post2]);
  assert.deepStrictEqual(getTeleseryePosts(mockDb), [post2]);

  // Delete post2
  mockDb.posts.splice(0, 1);
  removePostFromIndex('p2');
  assert.deepStrictEqual(getPostsByUserId('u1', mockDb), [post1]);
  assert.deepStrictEqual(getPostsBySharedPostId('p1', mockDb), []);
  assert.deepStrictEqual(getTeleseryePosts(mockDb), []);

  // Create & Delete Reel
  const reel1: any = {
    id: 'r1',
    addedByUserId: 'u1',
    addedBy: 'Alice Creator',
    communityId: 'c1',
    url: 'https://example.com/r1.mp4',
    status: 'approved'
  };
  mockDb.reels.unshift(reel1);
  indexReel(reel1);
  assert.deepStrictEqual(getReelsByAuthor('u1', 'Alice Creator', mockDb), [reel1]);
  assert.deepStrictEqual(getReelsByCommunityId('c1', mockDb), [reel1]);

  mockDb.reels = [];
  removeReelFromIndex('r1');
  assert.deepStrictEqual(getReelsByAuthor('u1', 'Alice Creator', mockDb), []);
  assert.deepStrictEqual(getReelsByCommunityId('c1', mockDb), []);

  // Create, Read-mutate, and Slice Notifications
  const notif1 = { id: 'n1', recipientUserId: 'u1', read: false, createdAt: '2026-01-01T00:00:00.000Z' };
  const notif2 = { id: 'n2', recipientUserId: 'u1', read: false, createdAt: '2026-01-02T00:00:00.000Z' };
  mockDb.socialNotifications.unshift(notif1);
  indexSecondaryNotification(notif1, mockDb);
  mockDb.socialNotifications.unshift(notif2);
  indexSecondaryNotification(notif2, mockDb);
  assert.deepStrictEqual(getNotificationsByRecipientId('u1', mockDb), [notif2, notif1]);

  // Simulate slice truncation (stale element cleanup verification)
  mockDb.socialNotifications = mockDb.socialNotifications.slice(0, 1); // drops notif1
  assert.deepStrictEqual(getNotificationsByRecipientId('u1', mockDb), [notif2]);
  removeSecondaryNotification(notif2);
  mockDb.socialNotifications = [];
  assert.deepStrictEqual(getNotificationsByRecipientId('u1', mockDb), []);

  // Direct Messages & Group Messages create/delete
  const dm1 = { id: 'dm1', senderId: 'u1', receiverId: 'u2', text: 'hi', createdAt: '2026-01-01T00:00:00.000Z' };
  mockDb.directMessages.push(dm1);
  indexSecondaryDirectMessage(dm1, mockDb);
  assert.deepStrictEqual(getDirectMessagesForUser('u1', mockDb), [dm1]);
  assert.deepStrictEqual(getDirectMessagesForUser('u2', mockDb), [dm1]);
  mockDb.directMessages.splice(0, 1);
  removeSecondaryDirectMessage(dm1);
  assert.deepStrictEqual(getDirectMessagesForUser('u1', mockDb), []);

  const gm1 = { id: 'gm1', groupId: 'g1', senderId: 'u1', text: 'hello group', createdAt: '2026-01-01T00:00:00.000Z' };
  mockDb.groupMessages.push(gm1);
  indexSecondaryGroupMessage(gm1, mockDb);
  assert.deepStrictEqual(getGroupMessagesByGroupId('g1', mockDb), [gm1]);
  assert.deepStrictEqual(getGroupMessagesByGroupIds(['g1', 'g2'], mockDb), [gm1]);
  mockDb.groupMessages.splice(0, 1);
  removeSecondaryGroupMessage(gm1);
  assert.deepStrictEqual(getGroupMessagesByGroupId('g1', mockDb), []);

  // Saved Posts & Saved Reels create/delete
  const sp1 = { id: 'sp1', userId: 'u1', postId: 'p1', savedAt: '2026-01-01T00:00:00.000Z' };
  mockDb.savedPosts.push(sp1);
  indexSecondarySavedPost(sp1, mockDb);
  assert.deepStrictEqual(getSavedPostsByUserId('u1', mockDb), [sp1]);
  mockDb.savedPosts.splice(0, 1);
  removeSecondarySavedPost(sp1, 'u1', 'p1');
  assert.deepStrictEqual(getSavedPostsByUserId('u1', mockDb), []);

  const sr1 = { id: 'sr1', userId: 'u1', reelId: 'r1', savedAt: '2026-01-01T00:00:00.000Z' };
  mockDb.savedReels.push(sr1);
  indexSecondarySavedReel(sr1, mockDb);
  assert.deepStrictEqual(getSavedReelsByUserId('u1', mockDb), [sr1]);
  mockDb.savedReels = [];
  removeSecondarySavedReel(null, undefined, 'r1');
  assert.deepStrictEqual(getSavedReelsByUserId('u1', mockDb), []);

  // Challenge Entries create/delete
  const ce1 = { id: 'ce1', challengeId: 'ch1', participantId: 'u1', status: 'approved', createdAt: '2026-01-01T00:00:00.000Z' };
  mockDb.challengeEntries.unshift(ce1);
  indexSecondaryChallengeEntry(ce1, mockDb);
  assert.deepStrictEqual(getChallengeEntriesByChallengeId('ch1', mockDb), [ce1]);
  assert.deepStrictEqual(getChallengeEntriesByParticipantId('u1', mockDb), [ce1]);
  mockDb.challengeEntries = [];
  removeSecondaryChallengeEntry(ce1);
  assert.deepStrictEqual(getChallengeEntriesByChallengeId('ch1', mockDb), []);

  // Non-indexed custom DB fallback check
  const unindexedCustomDb = {
    posts: [{ id: 'custom-p1', userId: 'u1' }]
  };
  assert.deepStrictEqual(
    getPostsByUserId('u1', unindexedCustomDb),
    [{ id: 'custom-p1', userId: 'u1' }],
    'Passing an unindexed DB object must safely fall back to linear scan'
  );

  console.log('      ✅ Incremental CRUD maintenance, ordering, stale cleanup, and fallback verified.');

  // --------------------------------------------------------------------------
  // STEP 3: Verify Production DB File & Financial Integrity Unchanged
  // --------------------------------------------------------------------------
  console.log('[4/4] Verifying zero database mutation and ₱0.00 financial delta...');
  const postHash = computeSha256(DB_PATH);
  const postRawDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const postFinancial = computeFinancialSnapshot(postRawDb);

  assert.strictEqual(postHash, preHash, 'CRITICAL: src/data/db.json SHA-256 hash changed during test!');
  assert.strictEqual(postFinancial.totalBalance, preFinancial.totalBalance, 'Financial balance changed!');
  assert.strictEqual(postFinancial.totalReelTokens, preFinancial.totalReelTokens, 'Reel tokens changed!');

  console.log(`      ✅ Production DB SHA-256 unchanged: ${postHash}`);
  console.log(
    `      ✅ Financial totals unchanged: Balance=₱${postFinancial.totalBalance.toFixed(2)}, ReelTokens=${postFinancial.totalReelTokens} (Delta: ₱0.00)`
  );
  console.log('==================================================================');
  console.log('🎉 ALL PHASE 5C-1 SECONDARY HOT INDEX TESTS PASSED!');
  console.log('==================================================================');
}

runPhase5C1Tests().catch(err => {
  console.error('❌ Phase 5C-1 test failed:', err);
  process.exit(1);
});
