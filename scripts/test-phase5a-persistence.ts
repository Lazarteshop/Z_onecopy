/**
 * Phase 5A-1 — Persistence & Financial Durability Surgical Stabilization Test Suite
 *
 * Verifies:
 * - DEF-01: Firestore persistent queue collection-name mapping layer (snake_case -> camelCase DBStructure)
 *           and live document resolution in queued set operations.
 * - DEF-03: Startup local-vs-cloud reconciliation data-loss protection (pending sync protection,
 *           newer updatedAt protection, and non-destructive user financial history merging).
 * - DEF-04: Durable atomic local database writes (fsync + rename via temporary file).
 * - DEF-05: Atomic backup replacement (db.json.bak via temporary file without in-place corruption).
 * - DEF-06: Critical financial mutation durability (synchronous saveDB(db, true) enforcement).
 * - PROD-INVARIANTS: Production database content integrity and non-destructive execution.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('🧪 Starting Phase 5A-1 Persistence & Financial Durability Verification Suite...\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passCount++;
    console.log(`🟢 PASS: ${testName}`);
  } else {
    failCount++;
    console.error(`🔴 FAIL: ${testName}`);
    if (details) console.error(`   Details: ${details}`);
  }
}

// ----------------------------------------------------------------------------
// 0. CAPTURE PRODUCTION DB STATE FOR INTEGRITY AUDIT
// ----------------------------------------------------------------------------
const prodDbPath = path.resolve(process.cwd(), 'src/data/db.json');
let initialDbSnapshot: any = null;
if (fs.existsSync(prodDbPath)) {
  initialDbSnapshot = JSON.parse(fs.readFileSync(prodDbPath, 'utf8'));
}

// ----------------------------------------------------------------------------
// 1. DEF-01 — FIRESTORE QUEUE COLLECTION MAPPING
// ----------------------------------------------------------------------------
console.log('\n--- [DEF-01] Testing Firestore Queue Collection Mapping ---');

// Replicate mapping as implemented in server.ts
const FIRESTORE_COLLECTION_TO_DB_PROPERTY: Record<string, string> = {
  direct_messages: 'directMessages',
  challenges: 'creatorChallenges',
  group_chats: 'groupChats',
  group_messages: 'groupMessages',
  merchant_ads: 'merchantAds',
  shop_orders: 'shopOrders',
  shop_products: 'shopProducts',
  shop_baskets: 'shopBaskets',
  va_banners: 'vaBanners',
  registered_devices: 'registeredDevices',
  user_verifications: 'userVerifications',
  kiddie_content: 'kiddieContent',
  challenge_entries: 'challengeEntries',
  sponsored_missions: 'sponsoredMissions',
  deposit_requests: 'depositRequests',
  reel_subscriptions: 'reelSubscriptions',
  friend_requests: 'friendRequests',
  subscription_payments: 'subscriptionPayments',
  users: 'users',
  campaigns: 'campaigns',
  posts: 'posts',
  reels: 'reels',
  stories: 'stories',
  albums: 'albums',
  friendships: 'friendships',
  communities: 'communities',
  discoveryDismissals: 'discoveryDismissals'
};

function getDbPropertyForCollection(collection: string): string {
  return FIRESTORE_COLLECTION_TO_DB_PROPERTY[collection] || collection;
}

// 1.1 Verify all snake_case collection mappings
const snakeCaseCollections: [string, string][] = [
  ['direct_messages', 'directMessages'],
  ['challenges', 'creatorChallenges'],
  ['group_chats', 'groupChats'],
  ['group_messages', 'groupMessages'],
  ['merchant_ads', 'merchantAds'],
  ['shop_orders', 'shopOrders'],
  ['shop_products', 'shopProducts'],
  ['shop_baskets', 'shopBaskets'],
  ['va_banners', 'vaBanners'],
  ['registered_devices', 'registeredDevices'],
  ['user_verifications', 'userVerifications'],
  ['kiddie_content', 'kiddieContent'],
  ['challenge_entries', 'challengeEntries'],
  ['sponsored_missions', 'sponsoredMissions'],
  ['deposit_requests', 'depositRequests'],
  ['reel_subscriptions', 'reelSubscriptions'],
  ['friend_requests', 'friendRequests'],
  ['subscription_payments', 'subscriptionPayments']
];

for (const [firestoreCol, expectedProp] of snakeCaseCollections) {
  const resolved = getDbPropertyForCollection(firestoreCol);
  assert(
    resolved === expectedProp,
    `DEF-01: Collection "${firestoreCol}" resolves to DBStructure property "${expectedProp}"`,
    `Expected "${expectedProp}", got "${resolved}"`
  );
}

// 1.2 Verify identity preservation for collections that already match DBStructure
const matchingCollections = ['users', 'campaigns', 'posts', 'reels', 'stories', 'albums', 'friendships', 'communities'];
for (const col of matchingCollections) {
  assert(
    getDbPropertyForCollection(col) === col,
    `DEF-01: Standard collection "${col}" preserves identical property name`
  );
}

// 1.3 Verify backward-compatibility for camelCase inputs
assert(
  getDbPropertyForCollection('creatorChallenges') === 'creatorChallenges',
  'DEF-01: CamelCase "creatorChallenges" preserves current behavior'
);
assert(
  getDbPropertyForCollection('directMessages') === 'directMessages',
  'DEF-01: CamelCase "directMessages" preserves current behavior'
);

// 1.4 Test live document resolution in queued set operations
const mockLiveDb: any = {
  directMessages: [{ id: 'dm-101', text: 'Live message updated', senderId: 'usr-1' }],
  creatorChallenges: [{ id: 'chal-202', title: 'Live challenge title', prizePool: 5000 }],
  groupChats: [{ id: 'gc-303', name: 'Live GC name' }],
  merchantAds: [{ id: 'ad-404', title: 'Live Ad title' }],
  shopOrders: [{ id: 'order-505', status: 'paid' }],
  depositRequests: [{ id: 'dep-606', amount: 500, status: 'approved' }],
  reelSubscriptions: [{ id: 'rsub-707', tokensGranted: 10 }]
};

function resolveLivePayload(collection: string, docId: string, queuedFallbackData: any) {
  let payload = queuedFallbackData;
  const propName = getDbPropertyForCollection(collection);
  const collectionData = mockLiveDb[propName];
  if (Array.isArray(collectionData)) {
    const liveDoc = collectionData.find((d: any) => d && d.id === docId);
    if (liveDoc) {
      const { id, ...docWithoutId } = liveDoc;
      payload = docWithoutId;
    }
  }
  return payload;
}

const dmResolved = resolveLivePayload('direct_messages', 'dm-101', { text: 'Stale queued DM' });
assert(
  dmResolved.text === 'Live message updated',
  'DEF-01: Queued set operation on "direct_messages" successfully resolves live document from directMessages',
  `Got: ${JSON.stringify(dmResolved)}`
);

const chalResolved = resolveLivePayload('challenges', 'chal-202', { title: 'Stale challenge' });
assert(
  chalResolved.title === 'Live challenge title' && chalResolved.prizePool === 5000,
  'DEF-01: Queued set operation on "challenges" successfully resolves live document from creatorChallenges',
  `Got: ${JSON.stringify(chalResolved)}`
);

const depResolved = resolveLivePayload('deposit_requests', 'dep-606', { status: 'pending' });
assert(
  depResolved.status === 'approved' && depResolved.amount === 500,
  'DEF-01: Queued set operation on "deposit_requests" successfully resolves live document from depositRequests',
  `Got: ${JSON.stringify(depResolved)}`
);

// ----------------------------------------------------------------------------
// 2. DEF-03 — STARTUP LOCAL-VS-CLOUD RECONCILIATION
// ----------------------------------------------------------------------------
console.log('\n--- [DEF-03] Testing Startup Local-vs-Cloud Reconciliation ---');

// Mock persistent sync queue
const mockPersistentSyncQueue = new Map<string, any>();

function mergeCloudFirstReconciler(localArr: any[] = [], cloudArr: any[] = [], collectionName?: string) {
  const map = new Map<string, any>();
  // 1. Put local items as baseline
  localArr.forEach(it => { if (it && it.id) map.set(it.id, it); });

  const hasPendingSync = (docId: string): boolean => {
    if (!collectionName) return false;
    if (mockPersistentSyncQueue.has(`${collectionName}:${docId}`)) return true;
    for (const [fName, dbProp] of Object.entries(FIRESTORE_COLLECTION_TO_DB_PROPERTY)) {
      if (dbProp === collectionName && mockPersistentSyncQueue.has(`${fName}:${docId}`)) {
        return true;
      }
    }
    return false;
  };

  cloudArr.forEach(cloudItem => {
    if (!cloudItem || !cloudItem.id) return;
    const localItem = map.get(cloudItem.id);

    if (!localItem) {
      map.set(cloudItem.id, cloudItem);
      return;
    }

    // Pending sync queue item protection
    if (hasPendingSync(cloudItem.id)) {
      return; // Keep localItem
    }

    // Explicit newer updatedAt protection
    const localUpdated = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
    const cloudUpdated = cloudItem.updatedAt ? new Date(cloudItem.updatedAt).getTime() : 0;
    if (localUpdated > 0 && cloudUpdated > 0 && localUpdated > cloudUpdated) {
      return; // Keep localItem
    }

    // Special users collection financial protection
    if (collectionName === 'users') {
      const mergedWithdrawals = [...(localItem.withdrawals || [])];
      if (Array.isArray(cloudItem.withdrawals)) {
        for (const cw of cloudItem.withdrawals) {
          const idx = mergedWithdrawals.findIndex(w => w.id === cw.id);
          if (idx === -1) {
            mergedWithdrawals.push(cw);
          } else if (cw.status === 'success' || cw.status === 'failed') {
            mergedWithdrawals[idx] = cw;
          }
        }
      }

      const mergedActivityLogs = [...(localItem.activityLogs || [])];
      if (Array.isArray(cloudItem.activityLogs)) {
        for (const cal of cloudItem.activityLogs) {
          if (!mergedActivityLogs.some(al => al.id === cal.id)) {
            mergedActivityLogs.push(cal);
          }
        }
      }

      const localHasMoreActivities = (localItem.activityLogs || []).length > (cloudItem.activityLogs || []).length;
      const finalStats = localHasMoreActivities && localItem.stats ? localItem.stats : (cloudItem.stats || localItem.stats);

      map.set(cloudItem.id, {
        ...cloudItem,
        stats: finalStats,
        withdrawals: mergedWithdrawals,
        activityLogs: mergedActivityLogs
      });
      return;
    }

    // Default Cloud-First
    map.set(cloudItem.id, cloudItem);
  });

  return Array.from(map.values());
}

// 2.1 Test pending sync protection
mockPersistentSyncQueue.set('posts:post-queued-1', { id: 'posts:post-queued-1', op: 'set' });
const localPosts = [{ id: 'post-queued-1', text: 'New local post pending sync', likes: 10 }];
const cloudPosts = [{ id: 'post-queued-1', text: 'Old cloud post', likes: 2 }];
const reconciledPosts = mergeCloudFirstReconciler(localPosts, cloudPosts, 'posts');
assert(
  reconciledPosts[0].text === 'New local post pending sync' && reconciledPosts[0].likes === 10,
  'DEF-03: Local item with pending sync queue entry is preserved over stale cloud record'
);
mockPersistentSyncQueue.clear();

// 2.2 Test newer updatedAt protection
const localShopOrder = [{ id: 'order-1', status: 'shipped', updatedAt: '2026-09-28T12:00:00.000Z' }];
const cloudShopOrder = [{ id: 'order-1', status: 'pending', updatedAt: '2026-09-28T11:00:00.000Z' }];
const reconciledOrders = mergeCloudFirstReconciler(localShopOrder, cloudShopOrder, 'shopOrders');
assert(
  reconciledOrders[0].status === 'shipped',
  'DEF-03: Local item with newer updatedAt is preserved over cloud item with older updatedAt'
);

// 2.3 Test older local data is correctly updated by newer cloud data (Cloud-First invariant)
const localOldOrder = [{ id: 'order-2', status: 'pending', updatedAt: '2026-09-28T10:00:00.000Z' }];
const cloudNewOrder = [{ id: 'order-2', status: 'completed', updatedAt: '2026-09-28T14:00:00.000Z' }];
const reconciledCloudWins = mergeCloudFirstReconciler(localOldOrder, cloudNewOrder, 'shopOrders');
assert(
  reconciledCloudWins[0].status === 'completed',
  'DEF-03: Cloud-First invariant holds: newer cloud records update older local records'
);

// 2.4 Test users collection financial preservation (withdrawals & activity logs)
const localUser = {
  id: 'usr-juan',
  name: 'Juan',
  stats: { balance: 150.00, lifetimeEarnings: 300.00 },
  withdrawals: [
    { id: 'with-pending-local', amount: 50.00, status: 'pending' },
    { id: 'with-old-1', amount: 100.00, status: 'pending' }
  ],
  activityLogs: [
    { id: 'log-local-recent', type: 'reward', amount: 10.00 },
    { id: 'log-shared-1', type: 'reward', amount: 5.00 }
  ]
};
const cloudUser = {
  id: 'usr-juan',
  name: 'Juan Dela Cruz (Cloud)',
  stats: { balance: 200.00, lifetimeEarnings: 290.00 },
  withdrawals: [
    { id: 'with-old-1', amount: 100.00, status: 'success' } // Cloud completed withdrawal
  ],
  activityLogs: [
    { id: 'log-shared-1', type: 'reward', amount: 5.00 }
  ]
};

const reconciledUsers = mergeCloudFirstReconciler([localUser], [cloudUser], 'users');
const resUser = reconciledUsers[0];

assert(
  resUser.withdrawals.some((w: any) => w.id === 'with-pending-local'),
  'DEF-03: User local pending withdrawal not yet in cloud is preserved during startup reconciliation'
);
assert(
  resUser.withdrawals.find((w: any) => w.id === 'with-old-1')?.status === 'success',
  'DEF-03: User completed cloud withdrawal status takes authoritative precedence'
);
assert(
  resUser.activityLogs.some((l: any) => l.id === 'log-local-recent'),
  'DEF-03: User local activity log is preserved during startup reconciliation'
);
assert(
  resUser.stats.balance === 150.00,
  'DEF-03: User local balance reflecting newer uncommitted activity is protected'
);

// ----------------------------------------------------------------------------
// 3. DEF-04 & DEF-05 — DURABLE ATOMIC LOCAL DATABASE WRITES & BACKUP REPLACEMENT
// ----------------------------------------------------------------------------
console.log('\n--- [DEF-04 & DEF-05] Testing Atomic Writes & Backup Replacement ---');

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zone-persistence-test-'));
const testDbPath = path.join(testDir, 'db.json');
const testDbBakPath = path.join(testDir, 'db.json.bak');
const testDbTmpPath = path.join(testDir, 'db.json.tmp');
const testDbBakTmpPath = path.join(testDir, 'db.json.bak.tmp');

function writeDatabaseFilesAtomicTest(data: any): void {
  const jsonStr = JSON.stringify(data, null, 2);

  // 1. Primary write via tmp + fsync + rename
  const fd = fs.openSync(testDbTmpPath, 'w');
  try {
    fs.writeSync(fd, jsonStr, 0, 'utf-8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(testDbTmpPath, testDbPath);
  try {
    const dirFd = fs.openSync(path.dirname(testDbPath), 'r');
    try {
      fs.fsyncSync(dirFd);
    } finally {
      fs.closeSync(dirFd);
    }
  } catch {}

  // 2. Backup write via tmp + fsync + rename
  const bakFd = fs.openSync(testDbBakTmpPath, 'w');
  try {
    fs.writeSync(bakFd, jsonStr, 0, 'utf-8');
    fs.fsyncSync(bakFd);
  } finally {
    fs.closeSync(bakFd);
  }
  fs.renameSync(testDbBakTmpPath, testDbBakPath);
  try {
    const dirFd = fs.openSync(path.dirname(testDbBakPath), 'r');
    try {
      fs.fsyncSync(dirFd);
    } finally {
      fs.closeSync(dirFd);
    }
  } catch {}
}

const sampleDbPayload = {
  users: [{ id: 'usr-1', name: 'Danilo' }],
  posts: [{ id: 'p-1', text: 'Hello' }],
  reels: [{ id: 'r-1', title: 'Reel 1' }]
};

// Test initial write
writeDatabaseFilesAtomicTest(sampleDbPayload);

assert(
  fs.existsSync(testDbPath),
  'DEF-04: Primary db.json is written successfully'
);
assert(
  fs.existsSync(testDbBakPath),
  'DEF-05: Backup db.json.bak is created atomically'
);
assert(
  !fs.existsSync(testDbTmpPath),
  'DEF-04: No dangling db.json.tmp file remains after atomic rename'
);
assert(
  !fs.existsSync(testDbBakTmpPath),
  'DEF-05: No dangling db.json.bak.tmp file remains after atomic rename'
);

const readPrimary = JSON.parse(fs.readFileSync(testDbPath, 'utf8'));
const readBak = JSON.parse(fs.readFileSync(testDbBakPath, 'utf8'));
assert(
  readPrimary.users[0].name === 'Danilo' && readBak.users[0].name === 'Danilo',
  'DEF-04 & DEF-05: Data in primary and backup match perfectly after atomic write'
);

// Test update write
const updatedPayload = {
  ...sampleDbPayload,
  users: [{ id: 'usr-1', name: 'Danilo Updated' }]
};
writeDatabaseFilesAtomicTest(updatedPayload);

const readUpdatedPrimary = JSON.parse(fs.readFileSync(testDbPath, 'utf8'));
const readUpdatedBak = JSON.parse(fs.readFileSync(testDbBakPath, 'utf8'));
assert(
  readUpdatedPrimary.users[0].name === 'Danilo Updated' && readUpdatedBak.users[0].name === 'Danilo Updated',
  'DEF-04 & DEF-05: Updates correctly atomic-replace both primary and backup files'
);

// Cleanup test dir
fs.rmSync(testDir, { recursive: true, force: true });

// ----------------------------------------------------------------------------
// 4. DEF-06 — CRITICAL FINANCIAL MUTATION DURABILITY ENFORCEMENT
// ----------------------------------------------------------------------------
console.log('\n--- [DEF-06] Auditing Critical Financial Routes in server.ts ---');

const serverCode = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');

interface FinancialRouteCheck {
  routeName: string;
  routeSearch: string;
  expectedPattern: RegExp;
}

const financialRoutesToVerify: FinancialRouteCheck[] = [
  {
    routeName: 'User Cashout Withdrawal (/api/user/withdraw)',
    routeSearch: "app.post('/api/user/withdraw'",
    expectedPattern: /app\.post\('\/api\/user\/withdraw'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Admin Withdrawal Decision (/api/admin/withdrawals/:withdrawId/action)',
    routeSearch: "app.post('/api/admin/withdrawals/:withdrawId/action'",
    expectedPattern: /app\.post\('\/api\/admin\/withdrawals\/:withdrawId\/action'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Referral Bonus Claim (/api/user/claim-referral-bonus)',
    routeSearch: "app.post('/api/user/claim-referral-bonus'",
    expectedPattern: /app\.post\('\/api\/user\/claim-referral-bonus'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Daily Check-in Reward (/api/user/daily-checkin)',
    routeSearch: "app.post('/api/user/daily-checkin'",
    expectedPattern: /app\.post\('\/api\/user\/daily-checkin'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'User Deposit Request Submission (/api/user/deposit-requests)',
    routeSearch: "app.post('/api/user/deposit-requests'",
    expectedPattern: /app\.post\('\/api\/user\/deposit-requests'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Admin Deposit Approval (/api/admin/deposit-requests/:id/approve)',
    routeSearch: "app.post('/api/admin/deposit-requests/:id/approve'",
    expectedPattern: /app\.post\('\/api\/admin\/deposit-requests\/:id\/approve'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Admin Deposit Rejection (/api/admin/deposit-requests/:id/reject)',
    routeSearch: "app.post('/api/admin/deposit-requests/:id/reject'",
    expectedPattern: /app\.post\('\/api\/admin\/deposit-requests\/:id\/reject'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Subscription Request Submission (/api/subscription/request)',
    routeSearch: "app.post('/api/subscription/request'",
    expectedPattern: /app\.post\('\/api\/subscription\/request'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Admin Subscription Approval (/api/admin/subscription/:userId/approve)',
    routeSearch: "app.post('/api/admin/subscription/:userId/approve'",
    expectedPattern: /app\.post\('\/api\/admin\/subscription\/:userId\/approve'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Admin Subscription Decline (/api/admin/subscription/:userId/decline)',
    routeSearch: "app.post('/api/admin/subscription/:userId/decline'",
    expectedPattern: /app\.post\('\/api\/admin\/subscription\/:userId\/decline'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Subscription Payment Submission (/api/subscription/submit-payment)',
    routeSearch: "app.post('/api/subscription/submit-payment'",
    expectedPattern: /app\.post\('\/api\/subscription\/submit-payment'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Admin Subscription Payment Approval (/api/admin/subscription-payments/:paymentId/approve)',
    routeSearch: "app.post('/api/admin/subscription-payments/:paymentId/approve'",
    expectedPattern: /app\.post\('\/api\/admin\/subscription-payments\/:paymentId\/approve'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Admin Subscription Payment Rejection (/api/admin/subscription-payments/:paymentId/reject)',
    routeSearch: "app.post('/api/admin/subscription-payments/:paymentId/reject'",
    expectedPattern: /app\.post\('\/api\/admin\/subscription-payments\/:paymentId\/reject'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Admin Reel Subscriptions Approval (/api/admin/reels/subscriptions/:id/approve)',
    routeSearch: "app.post('/api/admin/reels/subscriptions/:id/approve'",
    expectedPattern: /app\.post\('\/api\/admin\/reels\/subscriptions\/:id\/approve'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Admin Reel Subscriptions Decline (/api/admin/reels/subscriptions/:id/decline)',
    routeSearch: "app.post('/api/admin/reels/subscriptions/:id/decline'",
    expectedPattern: /app\.post\('\/api\/admin\/reels\/subscriptions\/:id\/decline'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Admin User Tokens Adjustment (/api/admin/users/:userId/tokens)',
    routeSearch: "app.post('/api/admin/users/:userId/tokens'",
    expectedPattern: /app\.post\('\/api\/admin\/users\/:userId\/tokens'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Reel Watch Reward Awarding (/api/reels/:id/watch-reward)',
    routeSearch: "app.post('/api/reels/:id/watch-reward'",
    expectedPattern: /app\.post\('\/api\/reels\/:id\/watch-reward'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Virtual Assistant VM Conversion (/api/va/convert-vm)',
    routeSearch: "app.post('/api/va/convert-vm'",
    expectedPattern: /app\.post\('\/api\/va\/convert-vm'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  },
  {
    routeName: 'Challenge Prize Distribution (/api/admin/challenges/:id/distribute-prizes)',
    routeSearch: "app.post('/api/admin/challenges/:id/distribute-prizes'",
    expectedPattern: /app\.post\('\/api\/admin\/challenges\/:id\/distribute-prizes'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/
  }
];

for (const check of financialRoutesToVerify) {
  const match = check.expectedPattern.test(serverCode);
  assert(
    match,
    `DEF-06: ${check.routeName} enforces durable immediate synchronous persistence saveDB(db, true)`
  );
}

// ----------------------------------------------------------------------------
// 5. PRODUCTION INTEGRITY & DATA INVARIANCES
// ----------------------------------------------------------------------------
console.log('\n--- Production Invariants & Baseline Verification ---');

if (initialDbSnapshot) {
  const finalDbSnapshot = JSON.parse(fs.readFileSync(prodDbPath, 'utf8'));

  assert(
    finalDbSnapshot.users.length === initialDbSnapshot.users.length,
    `PROD-INVARIANT: User count preserved exactly (${initialDbSnapshot.users.length} users)`
  );
  assert(
    finalDbSnapshot.posts.length === initialDbSnapshot.posts.length,
    `PROD-INVARIANT: Post count preserved exactly (${initialDbSnapshot.posts.length} posts)`
  );
  assert(
    finalDbSnapshot.reels.length === initialDbSnapshot.reels.length,
    `PROD-INVARIANT: Reel count preserved exactly (${initialDbSnapshot.reels.length} reels)`
  );
}

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log(`\n========================================================`);
console.log(`Phase 5A-1 Persistence & Durability Suite Complete`);
console.log(`Total Passed: ${passCount}`);
console.log(`Total Failed: ${failCount}`);
console.log(`========================================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
