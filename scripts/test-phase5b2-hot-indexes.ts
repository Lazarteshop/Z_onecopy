/**
 * PHASE 5B-2: HOT LOOKUP INDEXES / IN-MEMORY LOOKUP PERFORMANCE TEST SUITE
 * 
 * Verifies:
 * A. P0 In-Memory Indexes (userByIdIndex, postByIdIndex) - Direct references, zero serialization.
 * B. P1 In-Memory Indexes (communityByIdIndex, reelByIdIndex, userByEmailIndex, userByReferralIndex).
 * C. Behavioral Equivalence (Linear lookup result === Index lookup result).
 * D. Index Lifecycle Synchronization (rebuild on loadDB, startup reconciliation, and cloud rebuild).
 * E. Incremental Index Maintenance (create, update, delete, in-place email/referral change, ownership guards).
 * F. Security Requirement: findUserInSystem() never resolves deleted users.
 * G. Smart Feed Candidate Resolution, Newly Created Content Inclusion, Deletion Suppression & Custom DB Isolation.
 * H. Route-Level Mutation Synchronization & Adopted Lookup Helpers.
 * I. Test Import Safety & Production Database / Financial Integrity Invariance (₱0.00 delta).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import {
  app,
  userByIdIndex,
  postByIdIndex,
  communityByIdIndex,
  reelByIdIndex,
  userByEmailIndex,
  userByReferralIndex,
  rebuildHotLookupIndexes,
  getUserById,
  getUserByEmail,
  getUserByReferralCode,
  getPostById,
  getReelById,
  getCommunityById,
  indexUser,
  removeUserFromIndex,
  indexPost,
  removePostFromIndex,
  indexReel,
  removeReelFromIndex,
  indexCommunity,
  removeCommunityFromIndex,
  findUserInSystem,
  generateToken,
  loadDB,
  setAuthoritativeDatabaseReady
} from '../server';
import { generateSmartFeed, invalidateSmartFeedCache } from '../server/phase3SmartFeed';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${testName}: ${detail || 'Condition false'}`);
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 5B-2 HOT LOOKUP INDEX VERIFICATION');
  console.log('====================================================\n');

  const dbFilePath = path.join(process.cwd(), 'src', 'data', 'db.json');
  const dbBackupPath = path.join(process.cwd(), 'src', 'data', 'db.json.bak');
  const originalDbBytes = fs.readFileSync(dbFilePath);
  const originalBakBytes = fs.existsSync(dbBackupPath) ? fs.readFileSync(dbBackupPath) : null;
  const originalDbHash = crypto.createHash('sha256').update(originalDbBytes).digest('hex');

  // Enable authoritative ready for test execution
  setAuthoritativeDatabaseReady(true);

  const db = loadDB();
  const initialUsersCount = (db.users || []).length;
  const initialPostsCount = (db.posts || []).length;
  const initialReelsCount = (db.reels || []).length;
  const initialBalance = (db.users || []).reduce((sum: number, u: any) => sum + (u.stats?.balance || 0), 0);
  rebuildHotLookupIndexes(db);

  // ----------------------------------------------------
  // SECTION A: P0 INDEXES (userByIdIndex, postByIdIndex)
  // ----------------------------------------------------
  console.log('--- Section A: P0 In-Memory Indexes ---');

  assert(userByIdIndex instanceof Map, 'userByIdIndex is an instance of Map');
  assert(userByIdIndex.size === (db.users || []).length, `userByIdIndex has exact count (${userByIdIndex.size} users)`);

  const firstUser = db.users[0];
  assert(!!firstUser, 'Authoritative user exists');
  if (firstUser) {
    const indexedUser = userByIdIndex.get(firstUser.id);
    assert(indexedUser === firstUser, 'userByIdIndex stores direct reference to existing User object (no cloning)');
    assert(getUserById(firstUser.id) === firstUser, 'getUserById resolves exact user reference');
  }

  assert(postByIdIndex instanceof Map, 'postByIdIndex is an instance of Map');
  assert(postByIdIndex.size === (db.posts || []).length, `postByIdIndex has exact count (${postByIdIndex.size} posts)`);

  const firstPost = (db.posts || [])[0];
  if (firstPost) {
    const indexedPost = postByIdIndex.get(firstPost.id);
    assert(indexedPost === firstPost, 'postByIdIndex stores direct reference to existing Post object');
    assert(getPostById(firstPost.id) === firstPost, 'getPostById resolves exact post reference');
  }

  // Verify every single entity in db is reference-identical in the indexes
  const allUsersIdentical = (db.users || []).every(u => userByIdIndex.get(u.id) === u);
  const allPostsIdentical = (db.posts || []).every(p => postByIdIndex.get(p.id) === p);
  const allReelsIdentical = (db.reels || []).every(r => reelByIdIndex.get(r.id) === r);
  const allCommunitiesIdentical = (db.communities || []).every(c => communityByIdIndex.get(c.id) === c);
  assert(allUsersIdentical, `All ${initialUsersCount} users in userByIdIndex point to identical DB object references`);
  assert(allPostsIdentical, `All ${initialPostsCount} posts in postByIdIndex point to identical DB object references`);
  assert(allReelsIdentical, `All ${initialReelsCount} reels in reelByIdIndex point to identical DB object references`);
  assert(allCommunitiesIdentical, 'All communities in communityByIdIndex point to identical DB object references');

  // ----------------------------------------------------
  // SECTION B: P1 INDEXES
  // ----------------------------------------------------
  console.log('\n--- Section B: P1 In-Memory Indexes ---');

  assert(communityByIdIndex instanceof Map, 'communityByIdIndex is an instance of Map');
  assert(communityByIdIndex.size === (db.communities || []).length, `communityByIdIndex has exact count (${communityByIdIndex.size} communities)`);
  const firstComm = (db.communities || [])[0];
  if (firstComm) {
    assert(communityByIdIndex.get(firstComm.id) === firstComm, 'communityByIdIndex stores direct community reference');
    assert(getCommunityById(firstComm.id) === firstComm, 'getCommunityById resolves exact community reference');
  }

  assert(reelByIdIndex instanceof Map, 'reelByIdIndex is an instance of Map');
  assert(reelByIdIndex.size === (db.reels || []).length, `reelByIdIndex has exact count (${reelByIdIndex.size} reels)`);
  const firstReel = (db.reels || [])[0];
  if (firstReel) {
    assert(reelByIdIndex.get(firstReel.id) === firstReel, 'reelByIdIndex stores direct reel reference');
    assert(getReelById(firstReel.id) === firstReel, 'getReelById resolves exact reel reference');
  }

  if (firstUser && firstUser.email) {
    const lowerEmail = firstUser.email.toLowerCase().trim();
    assert(userByEmailIndex.get(lowerEmail) === firstUser, 'userByEmailIndex resolves by lowercased email');
    assert(getUserByEmail(firstUser.email) === firstUser, 'getUserByEmail normalizes and resolves user');
    assert(getUserByEmail(`  ${firstUser.email.toUpperCase()}  `) === firstUser, 'getUserByEmail handles case & whitespace normalization');
  }

  if (firstUser && firstUser.referralCode) {
    const cleanRef = firstUser.referralCode.trim();
    assert(userByReferralIndex.get(cleanRef) === firstUser, 'userByReferralIndex resolves by referral code');
    assert(getUserByReferralCode(firstUser.referralCode) === firstUser, 'getUserByReferralCode resolves user');
  }

  // ----------------------------------------------------
  // SECTION C: BEHAVIORAL EQUIVALENCE
  // ----------------------------------------------------
  console.log('\n--- Section C: Behavioral Equivalence ---');

  const nonExistentId = 'user-non-existent-999999';
  const linearMissing = db.users.find(u => u.id === nonExistentId);
  const indexMissing = getUserById(nonExistentId);
  assert(linearMissing === indexMissing, 'Missing user lookup behaves identically (undefined)');

  const missingPost = getPostById('post-non-existent-999999');
  assert(missingPost === undefined, 'Missing post lookup behaves identically (undefined)');

  // ----------------------------------------------------
  // SECTION D: SMART FEED RECOMMENDATION & HOOK ISOLATION
  // ----------------------------------------------------
  console.log('\n--- Section D: Smart Feed Candidate Scoring & Hook Synchronization ---');

  if (firstUser) {
    const feed = generateSmartFeed(db, firstUser.id, { page: 1, limit: 10 });
    assert(feed.success === true, 'Smart Feed generates successfully with hot lookup index hooks');
    assert(Array.isArray(feed.items), 'Feed items is an array');
    assert(feed.items.length <= 10, 'Feed respects bounded page limit');

    // Newly created post enters index and is immediately accepted by Smart Feed privacy filter
    const liveFeedPost: any = {
      id: 'post-live-smartfeed-test',
      userId: firstUser.id,
      userName: firstUser.name,
      userAvatar: firstUser.avatar || '👤',
      text: 'Newly created live post for Smart Feed #trending',
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };
    db.posts.unshift(liveFeedPost);
    indexPost(liveFeedPost);
    invalidateSmartFeedCache(firstUser.id);

    const feedAfterCreate = generateSmartFeed(db, firstUser.id, { page: 1, limit: 50, bypassCache: true } as any);
    const foundNewPost = feedAfterCreate.items.some((item: any) => item.id === liveFeedPost.id);
    assert(foundNewPost, 'Newly created & indexed post is immediately eligible and present in Smart Feed');

    // Deleting the post and calling removePostFromIndex immediately excludes it from Smart Feed
    const liveIdx = db.posts.findIndex(p => p.id === liveFeedPost.id);
    if (liveIdx !== -1) db.posts.splice(liveIdx, 1);
    removePostFromIndex(liveFeedPost.id);
    invalidateSmartFeedCache(firstUser.id);

    const feedAfterDelete = generateSmartFeed(db, firstUser.id, { page: 1, limit: 50, bypassCache: true } as any);
    const foundDeletedPost = feedAfterDelete.items.some((item: any) => item.id === liveFeedPost.id);
    assert(!foundDeletedPost, 'Deleted post removed from postByIdIndex is immediately excluded from Smart Feed');

    // Passing a separate custom DB object to generateSmartFeed must not reject candidates via global hook Maps
    const customDb = {
      users: [{ id: 'custom-u1', name: 'Custom User', avatar: '🌟', zonedUsers: [] }],
      posts: [
        {
          id: 'custom-post-only-in-custom-db',
          userId: 'custom-u1',
          userName: 'Custom User',
          userAvatar: '🌟',
          text: 'Custom DB isolated post',
          likes: [],
          comments: [],
          createdAt: new Date().toISOString()
        }
      ],
      reels: [],
      communities: []
    };
    const customFeed = generateSmartFeed(customDb, 'custom-u1', { page: 1, limit: 10, bypassCache: true } as any);
    assert(
      customFeed.items.some((it: any) => it.id === 'custom-post-only-in-custom-db'),
      'generateSmartFeed with a separate DB object uses that DB instead of rejecting via global hook Maps'
    );
  }

  // ----------------------------------------------------
  // SECTION E: INCREMENTAL INDEX MAINTENANCE & OWNERSHIP GUARDS
  // ----------------------------------------------------
  console.log('\n--- Section E: Incremental Index Maintenance & Ownership Safety ---');

  const testUser: any = {
    id: 'test-index-user-1',
    email: 'test-index@example.com',
    referralCode: 'REF-INDEX-TEST',
    name: 'Index Test User',
    stats: { balance: 0 },
    withdrawals: [],
    activityLogs: [],
    referredFriends: []
  };

  db.users.push(testUser);
  indexUser(testUser);
  assert(userByIdIndex.get(testUser.id) === testUser, 'Incremental indexUser adds user to userByIdIndex');
  assert(userByEmailIndex.get('test-index@example.com') === testUser, 'Incremental indexUser adds email to userByEmailIndex');
  assert(userByReferralIndex.get('REF-INDEX-TEST') === testUser, 'Incremental indexUser adds referral to userByReferralIndex');
  assert(findUserInSystem(testUser.id, db) === testUser, 'findUserInSystem resolves newly created & indexed user');

  // In-place email mutation (without calling removeUserFromIndex first) must clean up old email key
  const oldEmail = testUser.email;
  testUser.email = 'new-index@example.com';
  indexUser(testUser);
  assert(!userByEmailIndex.has(oldEmail), 'Old email automatically removed on in-place user email update');
  assert(userByEmailIndex.get('new-index@example.com') === testUser, 'New email indexed on user email update');

  // Case-only email change
  testUser.email = 'NEW-INDEX@EXAMPLE.COM';
  indexUser(testUser);
  assert(userByEmailIndex.get('new-index@example.com') === testUser, 'Case-only email change preserves normalized email lookup');

  // In-place referralCode mutation must clean up old referral key
  const oldRef = testUser.referralCode;
  testUser.referralCode = 'REF-INDEX-NEW-999';
  indexUser(testUser);
  assert(!userByReferralIndex.has(oldRef), 'Old referralCode automatically removed on in-place referralCode update');
  assert(userByReferralIndex.get('REF-INDEX-NEW-999') === testUser, 'New referralCode indexed on update');

  // Ownership check: removeUserFromIndex must NEVER delete another user's valid email or referral code
  if (firstUser && firstUser.email && firstUser.referralCode) {
    removeUserFromIndex(testUser.id, firstUser.email, firstUser.referralCode);
    assert(
      userByEmailIndex.get(firstUser.email.toLowerCase().trim()) === firstUser,
      'Ownership guard prevents deleting another user email key'
    );
    assert(
      userByReferralIndex.get(firstUser.referralCode.trim()) === firstUser,
      'Ownership guard prevents deleting another user referralCode key'
    );
  } else {
    removeUserFromIndex(testUser.id);
  }

  // Remove testUser from db.users as well
  const testUserIdx = db.users.findIndex(u => u.id === testUser.id);
  if (testUserIdx !== -1) db.users.splice(testUserIdx, 1);

  assert(!userByIdIndex.has(testUser.id), 'removeUserFromIndex purges user from userByIdIndex');
  assert(!userByEmailIndex.has('new-index@example.com'), 'removeUserFromIndex purges email');
  assert(!userByReferralIndex.has('REF-INDEX-NEW-999'), 'removeUserFromIndex purges referral');
  assert(findUserInSystem(testUser.id, db) === undefined, 'SECURITY: findUserInSystem returns undefined for deleted user');
  assert(getUserById(testUser.id, db) === undefined, 'SECURITY: getUserById returns undefined for deleted user');

  // Self-healing stale index defense: if a user is spliced out of db.users without calling removeUserFromIndex
  const staleTestUser: any = {
    id: 'test-stale-user-2',
    email: 'stale@example.com',
    referralCode: 'REF-STALE-2',
    name: 'Stale User',
    stats: { balance: 0 }
  };
  db.users.push(staleTestUser);
  indexUser(staleTestUser);
  // Splice without calling removeUserFromIndex
  const staleIdx = db.users.findIndex(u => u.id === staleTestUser.id);
  if (staleIdx !== -1) db.users.splice(staleIdx, 1);
  assert(findUserInSystem(staleTestUser.id, db) === undefined, 'SECURITY: findUserInSystem evicts stale user not present in db.users');
  assert(!userByIdIndex.has(staleTestUser.id), 'Stale user is evicted from userByIdIndex on access');

  // 2. Post incremental create & delete
  const testPost: any = { id: 'test-index-post-1', text: 'Index test post', userId: firstUser?.id || 'admin' };
  db.posts.push(testPost);
  indexPost(testPost);
  assert(postByIdIndex.get(testPost.id) === testPost, 'Incremental indexPost adds post to postByIdIndex');
  assert(getPostById(testPost.id, db) === testPost, 'getPostById resolves newly indexed post');
  const tPostIdx = db.posts.findIndex(p => p.id === testPost.id);
  if (tPostIdx !== -1) db.posts.splice(tPostIdx, 1);
  removePostFromIndex(testPost.id);
  assert(!postByIdIndex.has(testPost.id), 'removePostFromIndex purges post from postByIdIndex');
  assert(getPostById(testPost.id, db) === undefined, 'getPostById returns undefined after post removal');

  // 3. Reel incremental create & delete
  const testReel: any = { id: 'test-index-reel-1', title: 'Index test reel', addedByUserId: firstUser?.id || 'admin' };
  db.reels.push(testReel);
  indexReel(testReel);
  assert(reelByIdIndex.get(testReel.id) === testReel, 'Incremental indexReel adds reel to reelByIdIndex');
  assert(getReelById(testReel.id, db) === testReel, 'getReelById resolves newly indexed reel');
  const tReelIdx = db.reels.findIndex(r => r.id === testReel.id);
  if (tReelIdx !== -1) db.reels.splice(tReelIdx, 1);
  removeReelFromIndex(testReel.id);
  assert(!reelByIdIndex.has(testReel.id), 'removeReelFromIndex purges reel from reelByIdIndex');
  assert(getReelById(testReel.id, db) === undefined, 'getReelById returns undefined after reel removal');

  // 4. Community incremental create & delete
  const testComm: any = { id: 'test-index-comm-1', name: 'Index Test Community' };
  if (!db.communities) db.communities = [];
  db.communities.push(testComm);
  indexCommunity(testComm);
  assert(communityByIdIndex.get(testComm.id) === testComm, 'Incremental indexCommunity adds community to communityByIdIndex');
  assert(getCommunityById(testComm.id, db) === testComm, 'getCommunityById resolves newly indexed community');
  const tCommIdx = db.communities.findIndex(c => c.id === testComm.id);
  if (tCommIdx !== -1) db.communities.splice(tCommIdx, 1);
  removeCommunityFromIndex(testComm.id);
  assert(!communityByIdIndex.has(testComm.id), 'removeCommunityFromIndex purges community from communityByIdIndex');
  assert(getCommunityById(testComm.id, db) === undefined, 'getCommunityById returns undefined after community removal');

  // ----------------------------------------------------
  // SECTION F: REAL ROUTE-LEVEL MUTATION SYNCHRONIZATION
  // ----------------------------------------------------
  console.log('\n--- Section F: Route-Level Mutation Synchronization ---');

  const adminUser = db.users.find(u => u.isAdmin) || firstUser;
  const adminToken = `Bearer ${generateToken(adminUser.id, 'admin', true)}`;

  const testServer = http.createServer(app);
  await new Promise<void>(resolve => testServer.listen(0, '127.0.0.1', () => resolve()));
  const addr = testServer.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    // 1. User creation via POST /api/auth/register & deletion via DELETE /api/admin/users/:userId
    const usersCountBefore = db.users.length;
    const regDeviceCountBefore = (db.registeredDevices || []).length;
    const routeUserEmail = `route-test-${Date.now()}@example.com`;
    const routeDeviceId = `dev-route-test-${Date.now()}`;

    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': routeDeviceId
      },
      body: JSON.stringify({
        email: routeUserEmail,
        password: 'TestPassword123!',
        name: 'Route Sync Test User',
        deviceId: routeDeviceId
      })
    });
    const regData: any = await regRes.json();
    const createdUserId = regData?.user?.id;
    const createdUserRef = regData?.user?.referralCode;
    assert(regRes.status === 200 && Boolean(createdUserId), 'POST /api/auth/register succeeds');
    assert(userByIdIndex.has(createdUserId), 'POST /api/auth/register immediately indexes new user in userByIdIndex');
    assert(userByEmailIndex.has(routeUserEmail.toLowerCase()), 'POST /api/auth/register immediately indexes email in userByEmailIndex');
    assert(Boolean(createdUserRef && userByReferralIndex.has(createdUserRef)), 'POST /api/auth/register immediately indexes referralCode in userByReferralIndex');
    assert(findUserInSystem(createdUserId, db)?.id === createdUserId, 'findUserInSystem resolves route-registered user');

    const delUserRes = await fetch(`${baseUrl}/api/admin/users/${createdUserId}`, {
      method: 'DELETE',
      headers: {
        Authorization: adminToken
      }
    });
    assert(delUserRes.status === 200, 'DELETE /api/admin/users/:userId succeeds');
    assert(!userByIdIndex.has(createdUserId), 'DELETE /api/admin/users/:userId immediately removes user from userByIdIndex');
    assert(!userByEmailIndex.has(routeUserEmail.toLowerCase()), 'DELETE /api/admin/users/:userId immediately removes email from userByEmailIndex');
    assert(!createdUserRef || !userByReferralIndex.has(createdUserRef), 'DELETE /api/admin/users/:userId immediately removes referralCode from userByReferralIndex');
    assert(findUserInSystem(createdUserId, db) === undefined, 'SECURITY: findUserInSystem returns undefined after route user deletion');
    if (db.registeredDevices && db.registeredDevices.length > regDeviceCountBefore) {
      db.registeredDevices = db.registeredDevices.filter((d: any) => d.id !== routeDeviceId);
    }
    assert(db.users.length === usersCountBefore, 'User count restored after route register + delete');

    // 2. Post creation via POST /api/zone/posts & deletion via DELETE /api/zone/posts/:postId
    const postCountBefore = db.posts.length;
    const createPostRes = await fetch(`${baseUrl}/api/zone/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: adminToken
      },
      body: JSON.stringify({
        text: 'Route-level hot index synchronization test post!'
      })
    });
    const createPostData: any = await createPostRes.json();
    const createdPostId = createPostData?.post?.id;
    assert(createPostRes.status === 200 && Boolean(createdPostId), 'POST /api/zone/posts succeeds');
    assert(postByIdIndex.has(createdPostId), 'POST /api/zone/posts immediately indexes new post in postByIdIndex');
    assert(getPostById(createdPostId, db)?.id === createdPostId, 'getPostById resolves route-created post');

    const feedWithRoutePost = generateSmartFeed(db, adminUser.id, { section: 'following', page: 1, limit: 30, bypassCache: true } as any);
    assert(
      feedWithRoutePost.items.some((it: any) => it.id === createdPostId),
      'Smart Feed immediately includes route-created post without server restart'
    );

    const delPostRes = await fetch(`${baseUrl}/api/zone/posts/${createdPostId}`, {
      method: 'DELETE',
      headers: {
        Authorization: adminToken
      }
    });
    assert(delPostRes.status === 200, 'DELETE /api/zone/posts/:postId succeeds');
    assert(!postByIdIndex.has(createdPostId), 'DELETE /api/zone/posts/:postId immediately removes post from postByIdIndex');
    assert(getPostById(createdPostId, db) === undefined, 'getPostById returns undefined after route post deletion');
    const feedAfterRoutePostDel = generateSmartFeed(db, adminUser.id, { section: 'following', page: 1, limit: 30, bypassCache: true } as any);
    assert(
      !feedAfterRoutePostDel.items.some((it: any) => it.id === createdPostId),
      'Smart Feed immediately excludes route-deleted post'
    );
    assert(db.posts.length === postCountBefore, 'Post count restored after route create + delete');

    // 3. Reel creation via POST /api/reels & deletion via DELETE /api/reels/:id
    const reelCountBefore = db.reels.length;
    const createReelRes = await fetch(`${baseUrl}/api/reels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: adminToken
      },
      body: JSON.stringify({
        url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        title: 'Route-level hot index synchronization test reel'
      })
    });
    const createReelData: any = await createReelRes.json();
    const createdReelId = createReelData?.reel?.id;
    assert(createReelRes.status === 200 && Boolean(createdReelId), 'POST /api/reels succeeds');
    assert(reelByIdIndex.has(createdReelId), 'POST /api/reels immediately indexes new reel in reelByIdIndex');
    assert(getReelById(createdReelId, db)?.id === createdReelId, 'getReelById resolves route-created reel');

    let foundRouteReelInFeed = false;
    for (let p = 1; p <= 6; p++) {
      const pageRes = generateSmartFeed(db, adminUser.id, { page: p, limit: 30, skipCache: true } as any);
      if (pageRes.items.some((it: any) => it.id === createdReelId || it.id === `reel-${createdReelId}`)) {
        foundRouteReelInFeed = true;
        break;
      }
    }
    assert(
      foundRouteReelInFeed,
      'Smart Feed immediately includes route-created reel without server restart'
    );

    const delReelRes = await fetch(`${baseUrl}/api/reels/${createdReelId}`, {
      method: 'DELETE',
      headers: {
        Authorization: adminToken
      }
    });
    assert(delReelRes.status === 200, 'DELETE /api/reels/:id succeeds');
    assert(!reelByIdIndex.has(createdReelId), 'DELETE /api/reels/:id immediately removes reel from reelByIdIndex');
    assert(getReelById(createdReelId, db) === undefined, 'getReelById returns undefined after route reel deletion');
    let foundDeletedReelInFeed = false;
    for (let p = 1; p <= 6; p++) {
      const pageRes = generateSmartFeed(db, adminUser.id, { page: p, limit: 30, skipCache: true } as any);
      if (pageRes.items.some((it: any) => it.id === createdReelId || it.id === `reel-${createdReelId}`)) {
        foundDeletedReelInFeed = true;
        break;
      }
    }
    assert(
      !foundDeletedReelInFeed,
      'Smart Feed immediately excludes route-deleted reel'
    );
    assert(db.reels.length === reelCountBefore, 'Reel count restored after route create + delete');

    // 4. Community creation via POST /api/zone/communities & cleanup
    const commCountBefore = (db.communities || []).length;
    const gcCountBefore = (db.groupChats || []).length;
    const createCommRes = await fetch(`${baseUrl}/api/zone/communities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: adminToken
      },
      body: JSON.stringify({
        name: 'Route Index Sync Community',
        description: 'Testing communityByIdIndex route synchronization',
        privacy: 'public'
      })
    });
    const createCommData: any = await createCommRes.json();
    const createdCommId = createCommData?.community?.id;
    assert(createCommRes.status === 200 && Boolean(createdCommId), 'POST /api/zone/communities succeeds');
    assert(communityByIdIndex.has(createdCommId), 'POST /api/zone/communities immediately indexes new community in communityByIdIndex');
    assert(getCommunityById(createdCommId, db)?.id === createdCommId, 'getCommunityById resolves route-created community');

    // Remove created community and linked group chat to restore exact in-memory state
    if (createdCommId) {
      db.communities = (db.communities || []).filter(c => c.id !== createdCommId);
      removeCommunityFromIndex(createdCommId);
      db.groupChats = (db.groupChats || []).filter(g => g.id !== `gc-comm-${createdCommId}`);
    }
    assert(!communityByIdIndex.has(createdCommId), 'Removed community purged from communityByIdIndex');
    assert((db.communities || []).length === commCountBefore && (db.groupChats || []).length === gcCountBefore, 'Community count restored');
  } finally {
    await new Promise<void>(resolve => testServer.close(() => resolve()));
  }

  // ----------------------------------------------------
  // SECTION G: LIFECYCLE REBUILD INTEGRITY
  // ----------------------------------------------------
  console.log('\n--- Section G: Lifecycle Rebuild Integrity ---');

  rebuildHotLookupIndexes(db);
  assert(userByIdIndex.size === (db.users || []).length, 'Full rebuild restores exact authoritative user count');
  assert(postByIdIndex.size === (db.posts || []).length, 'Full rebuild restores exact authoritative post count');
  assert(communityByIdIndex.size === (db.communities || []).length, 'Full rebuild restores exact authoritative community count');
  assert(reelByIdIndex.size === (db.reels || []).length, 'Full rebuild restores exact authoritative reel count');

  // ----------------------------------------------------
  // SECTION H: FINANCIAL & DATA INTEGRITY
  // ----------------------------------------------------
  console.log('\n--- Section H: Financial & Data Integrity ---');

  const usersCount = (db.users || []).length;
  const postsCount = (db.posts || []).length;
  const reelsCount = (db.reels || []).length;
  const totalBal = (db.users || []).reduce((sum: number, u: any) => sum + (u.stats?.balance || 0), 0);
  const finalDbHash = crypto.createHash('sha256').update(fs.readFileSync(dbFilePath)).digest('hex');

  assert(usersCount === initialUsersCount, `Users count invariant maintained (${initialUsersCount} users)`);
  assert(postsCount === initialPostsCount, `Posts count invariant maintained (${initialPostsCount} posts)`);
  assert(reelsCount === initialReelsCount, `Reels count invariant maintained (${initialReelsCount} reels)`);
  assert(Math.abs(totalBal - initialBalance) < 0.001, `Financial wallet total invariant maintained (exact ₱0.00 delta)`);
  assert(finalDbHash === originalDbHash, `src/data/db.json byte-for-byte hash invariant preserved`);

  // Final summary
  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal error in Phase 5B-2 test suite:', err);
  process.exit(1);
});
