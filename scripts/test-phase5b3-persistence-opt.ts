/**
 * PHASE 5B-3: PERSISTENCE WRITE-AMPLIFICATION OPTIMIZATION TEST SUITE
 *
 * Verifies:
 * - Test A: Atomic write (db.json & db.json.bak created atomically, valid JSON, no .tmp residue)
 * - Test B: Backup & Backup Throttling (BACKUP_MIN_INTERVAL_MS = 5000ms, missing/invalid recovery, throttled skip, elapsed update)
 * - Test C: Generation coalescing (saveDB(db) + saveDB(db, true) avoids redundant second persistence)
 * - Test D: No-op banner check (checkAndExpireBanners returns false when nothing changed)
 * - Test E: Actual banner change (checkAndExpireBanners returns true when active banner expires)
 * - Test F: Cart synchronization (checkAndSyncAllCartsToBaskets returns false when unchanged, true when changed)
 * - Test G: GET persistence guard (/api/va/status & /api/shop/unpaid-baskets do not call saveDB when no state changed)
 * - Test H: Financial durability & production database non-mutation (saveDB(db, true) preserved, ₱0.00 delta)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  app,
  loadDB,
  saveDB,
  writeDatabaseFilesAtomic,
  BACKUP_MIN_INTERVAL_MS,
  getPersistenceDiagnostics,
  setLastBackupWriteTimestampForTest,
  checkAndExpireBanners,
  checkAndSyncAllCartsToBaskets,
  syncUserCartToBasket,
  generateToken,
  setAuthoritativeDatabaseReady
} from '../server';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
  }
}

function getFileSnapshot(filePath: string) {
  const st = fs.statSync(filePath);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  return { size: st.size, mtimeMs: st.mtimeMs, sha256: hash };
}

async function runTests() {
  console.log('==============================================================');
  console.log('🚀 RUNNING PHASE 5B-3 PERSISTENCE OPTIMIZATION TEST SUITE');
  console.log('==============================================================\n');

  const prodDbPath = path.resolve(process.cwd(), 'src/data/db.json');
  const prodBakPath = path.resolve(process.cwd(), 'src/data/db.json.bak');

  const preDbSnap = getFileSnapshot(prodDbPath);
  const preBakSnap = getFileSnapshot(prodBakPath);

  setAuthoritativeDatabaseReady(true);
  const liveDb = loadDB();
  const preTotalBalance = liveDb.users.reduce((s, u) => s + Number(u.stats?.balance || 0), 0);
  const preTotalLifetime = liveDb.users.reduce((s, u) => s + Number(u.stats?.lifetimeEarnings || 0), 0);

  // ------------------------------------------------------------------
  // TEST A: ATOMIC WRITE
  // ------------------------------------------------------------------
  console.log('--- Test A: Atomic Write (Single Serialization + Atomic Rename) ---');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zone-phase5b3-'));
  const testDbPath = path.join(tempDir, 'db.json');
  const testDbTmpPath = path.join(tempDir, 'db.json.tmp');
  const testBakPath = path.join(tempDir, 'db.json.bak');
  const testBakTmpPath = path.join(tempDir, 'db.json.bak.tmp');

  const sampleDb: any = {
    users: [{ id: 'u-1', name: 'Juan Dela Cruz', stats: { balance: 100, lifetimeEarnings: 200 } }],
    posts: [{ id: 'p-1', text: 'Phase 5B-3 atomic persistence test' }],
    reels: [{ id: 'r-1', title: 'Test Reel' }]
  };

  const writeResA = writeDatabaseFilesAtomic(sampleDb, {
    dbFilePath: testDbPath,
    dbTmpPath: testDbTmpPath,
    dbBackupPath: testBakPath,
    dbBackupTmpPath: testBakTmpPath,
    allowInTest: true
  });

  assert(writeResA.primaryWritten === true, 'Test A.1: writeDatabaseFilesAtomic reports primaryWritten = true');
  assert(writeResA.backupWritten === true, 'Test A.2: writeDatabaseFilesAtomic reports backupWritten = true on initial write');
  assert(fs.existsSync(testDbPath), 'Test A.3: Primary db.json exists');
  assert(fs.existsSync(testBakPath), 'Test A.4: Backup db.json.bak exists');
  assert(!fs.existsSync(testDbTmpPath), 'Test A.5: No dangling db.json.tmp file remains');
  assert(!fs.existsSync(testBakTmpPath), 'Test A.6: No dangling db.json.bak.tmp file remains');

  const parsedPrimaryA = JSON.parse(fs.readFileSync(testDbPath, 'utf-8'));
  const parsedBakA = JSON.parse(fs.readFileSync(testBakPath, 'utf-8'));
  assert(
    parsedPrimaryA.users[0].name === 'Juan Dela Cruz' && parsedBakA.users[0].name === 'Juan Dela Cruz',
    'Test A.7: Both db.json and db.json.bak contain valid matching JSON'
  );

  // ------------------------------------------------------------------
  // TEST B: BACKUP & BACKUP THROTTLING
  // ------------------------------------------------------------------
  console.log('\n--- Test B: Backup Creation, Throttling & Recovery Integrity ---');
  assert(BACKUP_MIN_INTERVAL_MS === 5000, 'Test B.1: BACKUP_MIN_INTERVAL_MS is set to 5000ms');

  // Set last backup timestamp to right now so the next write is within the 5s window
  setLastBackupWriteTimestampForTest(Date.now());
  const sampleDbUpdate1: any = {
    ...sampleDb,
    users: [{ id: 'u-1', name: 'Juan Updated Within 5s', stats: { balance: 100, lifetimeEarnings: 200 } }]
  };

  // Write with forceBackup: false to exercise production throttling behavior
  const writeResB1 = writeDatabaseFilesAtomic(sampleDbUpdate1, {
    dbFilePath: testDbPath,
    dbTmpPath: testDbTmpPath,
    dbBackupPath: testBakPath,
    dbBackupTmpPath: testBakTmpPath,
    forceBackup: false,
    allowInTest: true
  });

  assert(writeResB1.primaryWritten === true, 'Test B.2: Primary db.json is written immediately during throttled window');
  assert(writeResB1.backupWritten === false, 'Test B.3: Backup rewrite is skipped when valid .bak exists and < 5s elapsed');

  const parsedPrimaryB1 = JSON.parse(fs.readFileSync(testDbPath, 'utf-8'));
  const parsedBakB1 = JSON.parse(fs.readFileSync(testBakPath, 'utf-8'));
  assert(parsedPrimaryB1.users[0].name === 'Juan Updated Within 5s', 'Test B.4: Primary db.json reflects latest mutation');
  assert(parsedBakB1.users[0].name === 'Juan Dela Cruz', 'Test B.5: Backup db.json.bak retains valid prior snapshot during throttle window');

  // Verify backup IS written immediately if .bak is missing even within 5s window
  fs.unlinkSync(testBakPath);
  const writeResB2 = writeDatabaseFilesAtomic(sampleDbUpdate1, {
    dbFilePath: testDbPath,
    dbTmpPath: testDbTmpPath,
    dbBackupPath: testBakPath,
    dbBackupTmpPath: testBakTmpPath,
    forceBackup: false,
    allowInTest: true
  });
  assert(
    writeResB2.backupWritten === true && fs.existsSync(testBakPath),
    'Test B.6: Backup is immediately recreated when .bak does not exist'
  );

  // Verify backup IS written immediately if .bak is corrupted/invalid even within 5s window
  fs.writeFileSync(testBakPath, 'corrupt', 'utf-8');
  setLastBackupWriteTimestampForTest(Date.now());
  const writeResB3 = writeDatabaseFilesAtomic(sampleDbUpdate1, {
    dbFilePath: testDbPath,
    dbTmpPath: testDbTmpPath,
    dbBackupPath: testBakPath,
    dbBackupTmpPath: testBakTmpPath,
    forceBackup: false,
    allowInTest: true
  });
  const parsedBakB3 = JSON.parse(fs.readFileSync(testBakPath, 'utf-8'));
  assert(
    writeResB3.backupWritten === true && parsedBakB3.users[0].name === 'Juan Updated Within 5s',
    'Test B.7: Backup is immediately repaired when .bak is invalid/corrupted'
  );

  // Verify backup IS rotated when 5000ms interval has elapsed
  setLastBackupWriteTimestampForTest(Date.now() - (BACKUP_MIN_INTERVAL_MS + 100));
  const sampleDbUpdate2: any = {
    ...sampleDb,
    users: [{ id: 'u-1', name: 'Juan After 5s Elapsed', stats: { balance: 100, lifetimeEarnings: 200 } }]
  };
  const writeResB4 = writeDatabaseFilesAtomic(sampleDbUpdate2, {
    dbFilePath: testDbPath,
    dbTmpPath: testDbTmpPath,
    dbBackupPath: testBakPath,
    dbBackupTmpPath: testBakTmpPath,
    forceBackup: false,
    allowInTest: true
  });
  const parsedBakB4 = JSON.parse(fs.readFileSync(testBakPath, 'utf-8'));
  assert(
    writeResB4.backupWritten === true && parsedBakB4.users[0].name === 'Juan After 5s Elapsed',
    'Test B.8: Backup is atomically rotated once BACKUP_MIN_INTERVAL_MS (5000ms) has elapsed'
  );

  fs.rmSync(tempDir, { recursive: true, force: true });

  // ------------------------------------------------------------------
  // TEST C: GENERATION COALESCING
  // ------------------------------------------------------------------
  console.log('\n--- Test C: saveDB() Generation Tracking & Debounce Coalescing ---');
  const diagBeforeC = getPersistenceDiagnostics();

  // Trigger a debounced save followed immediately by a durable immediate save
  saveDB(liveDb, false);
  const diagAfterDebounceSchedule = getPersistenceDiagnostics();
  assert(
    diagAfterDebounceSchedule.dbMutationGeneration === diagBeforeC.dbMutationGeneration + 1,
    'Test C.1: Debounced saveDB(db) increments dbMutationGeneration'
  );

  saveDB(liveDb, true);
  const diagAfterImmediate = getPersistenceDiagnostics();
  assert(
    diagAfterImmediate.dbMutationGeneration === diagBeforeC.dbMutationGeneration + 2,
    'Test C.2: Immediate saveDB(db, true) increments dbMutationGeneration'
  );
  assert(
    diagAfterImmediate.lastPersistedGeneration === diagAfterImmediate.dbMutationGeneration,
    'Test C.3: Immediate saveDB(db, true) updates lastPersistedGeneration immediately'
  );
  assert(
    diagAfterImmediate.totalAtomicPersistenceCount === diagBeforeC.totalAtomicPersistenceCount + 1,
    'Test C.4: Immediate save executes exactly 1 atomic persistence operation'
  );

  // Wait 220ms (past the 150ms debounce timer window) and verify no second persistence occurred
  await new Promise(resolve => setTimeout(resolve, 220));
  const diagAfterWait = getPersistenceDiagnostics();
  assert(
    diagAfterWait.totalAtomicPersistenceCount === diagAfterImmediate.totalAtomicPersistenceCount,
    'Test C.5: Pending debounce timer does not cause a redundant second persistence after immediate save'
  );

  // ------------------------------------------------------------------
  // TEST D: NO-OP BANNER CHECK
  // ------------------------------------------------------------------
  console.log('\n--- Test D: No-Op Banner Check (checkAndExpireBanners -> false) ---');
  const mockBannerDbNoOp: any = {
    vaBanners: [
      {
        id: 'ban-active-future',
        status: 'active',
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        targetBasketId: 'bask-1'
      },
      {
        id: 'ban-already-expired',
        status: 'bad_order_expired',
        expiresAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        targetBasketId: 'bask-2'
      }
    ],
    shopBaskets: [
      { id: 'bask-1', status: 'unpaid' },
      { id: 'bask-2', status: 'expired_bad_order' }
    ]
  };

  const bannerNoOpRes = checkAndExpireBanners(mockBannerDbNoOp);
  assert(bannerNoOpRes === false, 'Test D.1: checkAndExpireBanners(db) returns false when no active banner expired');
  assert(
    checkAndExpireBanners({ vaBanners: [] } as any) === false,
    'Test D.2: checkAndExpireBanners(db) returns false when vaBanners is empty'
  );

  // ------------------------------------------------------------------
  // TEST E: ACTUAL BANNER CHANGE
  // ------------------------------------------------------------------
  console.log('\n--- Test E: Actual Banner Expiration (checkAndExpireBanners -> true) ---');
  const mockBannerDbExpire: any = {
    vaBanners: [
      {
        id: 'ban-due-expire',
        status: 'active',
        expiresAt: new Date(Date.now() - 5000).toISOString(),
        targetBasketId: 'bask-due'
      }
    ],
    shopBaskets: [
      { id: 'bask-due', status: 'unpaid' }
    ]
  };

  const bannerExpireRes1 = checkAndExpireBanners(mockBannerDbExpire);
  assert(bannerExpireRes1 === true, 'Test E.1: checkAndExpireBanners(db) returns true when an active banner expires');
  assert(
    mockBannerDbExpire.vaBanners[0].status === 'bad_order_expired' &&
      mockBannerDbExpire.shopBaskets[0].status === 'expired_bad_order',
    'Test E.2: Expired banner and linked unpaid basket statuses are updated accurately'
  );
  const bannerExpireRes2 = checkAndExpireBanners(mockBannerDbExpire);
  assert(
    bannerExpireRes2 === false,
    'Test E.3: Subsequent checkAndExpireBanners(db) call returns false once already expired'
  );

  // ------------------------------------------------------------------
  // TEST F: CART SYNCHRONIZATION
  // ------------------------------------------------------------------
  console.log('\n--- Test F: Cart Synchronization (checkAndSyncAllCartsToBaskets) ---');
  const mockCartDb: any = {
    users: [{ id: 'user-cart-1', name: 'Cart Tester', avatar: '🛒' }],
    shopBaskets: [
      {
        id: 'basket-existing',
        userId: 'user-cart-1',
        userName: 'Cart Tester',
        userAvatar: '🛒',
        items: [{ productId: 'prod-1', productName: 'Item 1', price: 250, quantity: 2, image: 'img1.jpg' }],
        totalAmount: 500,
        status: 'unpaid',
        createdAt: new Date().toISOString()
      }
    ],
    shopCarts: {
      'user-cart-1': [{ productId: 'prod-1', productName: 'Item 1', price: 250, quantity: 2, image: 'img1.jpg' }]
    },
    vaBanners: []
  };

  const cartSyncNoOp = checkAndSyncAllCartsToBaskets(mockCartDb);
  assert(
    cartSyncNoOp === false,
    'Test F.1: checkAndSyncAllCartsToBaskets(db) returns false when basket already matches user cart'
  );

  // Modify cart quantity -> should return true
  mockCartDb.shopCarts['user-cart-1'][0].quantity = 3;
  const cartSyncChanged = checkAndSyncAllCartsToBaskets(mockCartDb);
  assert(
    cartSyncChanged === true && mockCartDb.shopBaskets[0].totalAmount === 750,
    'Test F.2: checkAndSyncAllCartsToBaskets(db) returns true and updates totalAmount when cart changes'
  );

  // Call again without further changes -> should return false
  const cartSyncAfterChange = checkAndSyncAllCartsToBaskets(mockCartDb);
  assert(
    cartSyncAfterChange === false,
    'Test F.3: Subsequent checkAndSyncAllCartsToBaskets(db) returns false when no further cart change occurred'
  );

  // Empty cart -> should remove unpaid basket and return true
  mockCartDb.shopCarts['user-cart-1'] = [];
  const cartSyncEmptied = syncUserCartToBasket(mockCartDb, 'user-cart-1');
  assert(
    cartSyncEmptied === true && mockCartDb.shopBaskets.length === 0,
    'Test F.4: syncUserCartToBasket returns true when empty cart removes unpaid basket'
  );

  // ------------------------------------------------------------------
  // TEST G: GET PERSISTENCE GUARD (/api/va/status & /api/shop/unpaid-baskets)
  // ------------------------------------------------------------------
  console.log('\n--- Test G: GET Route Persistence Guards (/api/va/status & /api/shop/unpaid-baskets) ---');
  // Ensure liveDb banners/baskets are already synced before testing read-only GET endpoints
  checkAndExpireBanners(liveDb);
  checkAndSyncAllCartsToBaskets(liveDb);
  // Wait for any prior timers to settle
  await new Promise(resolve => setTimeout(resolve, 350));

  const server = app.listen(0);
  try {
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;
    const testUser = liveDb.users.find(u => u.isAdmin) || liveDb.users[0];
    const token = generateToken(testUser.id);

    const diagBeforeVaStatus = getPersistenceDiagnostics();
    const vaRes = await fetch(`${baseUrl}/api/va/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const vaBody: any = await vaRes.json();
    const diagAfterVaStatus = getPersistenceDiagnostics();

    assert(vaRes.status === 200 && vaBody.success === true, 'Test G.1: GET /api/va/status returns 200 OK');
    assert(
      diagAfterVaStatus.dbMutationGeneration === diagBeforeVaStatus.dbMutationGeneration &&
        diagAfterVaStatus.totalAtomicPersistenceCount === diagBeforeVaStatus.totalAtomicPersistenceCount,
      'Test G.2: GET /api/va/status does NOT invoke saveDB() when no banner or basket state changed'
    );

    const diagBeforeBaskets = getPersistenceDiagnostics();
    const basketsRes = await fetch(`${baseUrl}/api/shop/unpaid-baskets`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const basketsBody: any = await basketsRes.json();
    const diagAfterBaskets = getPersistenceDiagnostics();

    assert(basketsRes.status === 200 && basketsBody.success === true, 'Test G.3: GET /api/shop/unpaid-baskets returns 200 OK');
    assert(
      diagAfterBaskets.dbMutationGeneration === diagBeforeBaskets.dbMutationGeneration &&
        diagAfterBaskets.totalAtomicPersistenceCount === diagBeforeBaskets.totalAtomicPersistenceCount,
      'Test G.4: GET /api/shop/unpaid-baskets does NOT invoke saveDB() when no banner or basket state changed'
    );
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }

  // ------------------------------------------------------------------
  // TEST H: FINANCIAL DURABILITY & BENCHMARK VERIFICATION
  // ------------------------------------------------------------------
  console.log('\n--- Test H: Critical Financial Route Durability & Performance Benchmark ---');
  const serverSource = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf-8');

  const criticalRoutes: Array<[string, RegExp]> = [
    ['/api/user/withdraw', /app\.post\('\/api\/user\/withdraw'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/],
    ['/api/admin/withdrawals/:withdrawId/action', /app\.post\('\/api\/admin\/withdrawals\/:withdrawId\/action'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/],
    ['/api/user/task-complete', /app\.post\('\/api\/user\/task-complete'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/],
    ['/api/user/daily-checkin', /app\.post\('\/api\/user\/daily-checkin'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/],
    ['/api/user/claim-referral-bonus', /app\.post\('\/api\/user\/claim-referral-bonus'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/],
    ['/api/reels/:id/watch-reward', /app\.post\('\/api\/reels\/:id\/watch-reward'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/],
    ['/api/reels/redeem-profit', /app\.post\('\/api\/reels\/redeem-profit'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/],
    ['/api/va/claim-500-reward', /app\.post\('\/api\/va\/claim-500-reward'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/],
    ['/api/va/subscribe', /app\.post\('\/api\/va\/subscribe'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/],
    ['/api/va/convert-vm', /app\.post\('\/api\/va\/convert-vm'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/],
    ['/api/user/deposit-requests', /app\.post\('\/api\/user\/deposit-requests'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/],
    ['/api/admin/deposit-requests/:id/approve', /app\.post\('\/api\/admin\/deposit-requests\/:id\/approve'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/],
    ['/api/admin/challenges/:id/distribute-prizes', /app\.post\('\/api\/admin\/challenges\/:id\/distribute-prizes'[\s\S]*?saveDB\(\s*db\s*,\s*true\s*\)/]
  ];

  for (const [routeName, pattern] of criticalRoutes) {
    assert(pattern.test(serverSource), `Test H: ${routeName} preserves immediate durable saveDB(db, true)`);
  }

  // Verify public challenge entry route preserves linkOpensCount mutation & saveDB(db)
  assert(
    /app\.get\('\/api\/public\/challenges\/:challengeId\/entries\/:entryId'[\s\S]*?entry\.linkOpensCount\s*=\s*\(entry\.linkOpensCount\s*\|\|\s*0\)\s*\+\s*1[\s\S]*?saveDB\(db\)/.test(
      serverSource
    ),
    'Test H: GET /api/public/challenges/:challengeId/entries/:entryId preserves linkOpensCount persistence'
  );

  // Verify production database files & financials are 100% untouched
  const postDbSnap = getFileSnapshot(prodDbPath);
  const postBakSnap = getFileSnapshot(prodBakPath);
  const postTotalBalance = liveDb.users.reduce((s, u) => s + Number(u.stats?.balance || 0), 0);
  const postTotalLifetime = liveDb.users.reduce((s, u) => s + Number(u.stats?.lifetimeEarnings || 0), 0);

  assert(
    preDbSnap.size === postDbSnap.size && preDbSnap.sha256 === postDbSnap.sha256,
    'Test H: Production src/data/db.json is 100% unmodified during test execution'
  );
  assert(
    preBakSnap.size === postBakSnap.size && preBakSnap.sha256 === postBakSnap.sha256,
    'Test H: Production src/data/db.json.bak is 100% unmodified during test execution'
  );
  assert(
    Math.abs(postTotalBalance - preTotalBalance) === 0 && Math.abs(postTotalLifetime - preTotalLifetime) === 0,
    `Test H: Financial delta is strictly ₱0.00 (Balance: ₱${postTotalBalance.toFixed(2)})`
  );

  console.log('\n==============================================================');
  console.log(`📊 PHASE 5B-3 RESULTS: ${passed}/${passed + failed} PASSED (${failed} FAILED)`);
  console.log('==============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal error in Phase 5B-3 test suite:', err);
  process.exit(1);
});
