import { runMonetagBoundaryTests, getManilaTimeStatus } from '../src/utils/monetagScheduler.js';

console.log('🧪 Running Monetag Scheduler Boundary & Asia/Manila (UTC+8) Timezone Verification Tests...\n');

const suite = runMonetagBoundaryTests();

console.log('================ BOUNDARY TEST SUITE ================');
console.log(`Total Tests Run: ${suite.results.length}`);
console.log(`All Passed: ${suite.allPassed ? '✅ YES' : '❌ NO'}`);
console.log('=====================================================\n');

let failedCount = 0;
suite.results.forEach((r, idx) => {
  const symbol = r.passed ? '🟢 PASS' : '🔴 FAIL';
  if (!r.passed) failedCount++;
  console.log(`${symbol} [${idx + 1}/${suite.results.length}] ${r.testName}`);
  console.log(`    Manila Time:     ${r.manilaTime}`);
  console.log(`    Expected Active: ${r.expectedActive}`);
  console.log(`    Actual Active:   ${r.actualActive}`);
});

console.log('\n--- 1. SPECIFIC EXPLICIT ASIA/MANILA (+08:00) WINDOW TESTS ---');
const explicitManilaTests = [
  // 1:00 AM sequence
  { label: '01:00:00 AM Manila (+08:00)', iso: '2026-09-05T01:00:00+08:00', expected: true },
  { label: '01:00:30 AM Manila (+08:00)', iso: '2026-09-05T01:00:30+08:00', expected: true },
  { label: '01:00:59 AM Manila (+08:00)', iso: '2026-09-05T01:00:59+08:00', expected: true },
  { label: '01:01:00 AM Manila (+08:00)', iso: '2026-09-05T01:01:00+08:00', expected: false },
  { label: '01:29:59 AM Manila (+08:00)', iso: '2026-09-05T01:29:59+08:00', expected: false },
  { label: '01:30:00 AM Manila (+08:00)', iso: '2026-09-05T01:30:00+08:00', expected: true },
  { label: '01:30:30 AM Manila (+08:00)', iso: '2026-09-05T01:30:30+08:00', expected: true },
  { label: '01:30:59 AM Manila (+08:00)', iso: '2026-09-05T01:30:59+08:00', expected: true },
  { label: '01:31:00 AM Manila (+08:00)', iso: '2026-09-05T01:31:00+08:00', expected: false },

  // 1:00 PM sequence (13:00)
  { label: '01:00:00 PM Manila (+08:00)', iso: '2026-09-05T13:00:00+08:00', expected: true },
  { label: '01:00:59 PM Manila (+08:00)', iso: '2026-09-05T13:00:59+08:00', expected: true },
  { label: '01:01:00 PM Manila (+08:00)', iso: '2026-09-05T13:01:00+08:00', expected: false },
  { label: '01:30:00 PM Manila (+08:00)', iso: '2026-09-05T13:30:00+08:00', expected: true },
  { label: '01:30:59 PM Manila (+08:00)', iso: '2026-09-05T13:30:59+08:00', expected: true },
  { label: '01:31:00 PM Manila (+08:00)', iso: '2026-09-05T13:31:00+08:00', expected: false },

  // 12:00 PM Noon boundary
  { label: '12:00:00 PM Noon Manila (+08:00)', iso: '2026-09-05T12:00:00+08:00', expected: true },
  { label: '12:00:59 PM Noon Manila (+08:00)', iso: '2026-09-05T12:00:59+08:00', expected: true },
  { label: '12:01:00 PM Noon Manila (+08:00)', iso: '2026-09-05T12:01:00+08:00', expected: false },
  { label: '12:30:00 PM Noon Manila (+08:00)', iso: '2026-09-05T12:30:00+08:00', expected: true },
  { label: '12:30:59 PM Noon Manila (+08:00)', iso: '2026-09-05T12:30:59+08:00', expected: true },
  { label: '12:31:00 PM Noon Manila (+08:00)', iso: '2026-09-05T12:31:00+08:00', expected: false },

  // 12:00 AM Midnight boundary
  { label: '12:00:00 AM Midnight Manila (+08:00)', iso: '2026-09-05T00:00:00+08:00', expected: true },
  { label: '12:00:59 AM Midnight Manila (+08:00)', iso: '2026-09-05T00:00:59+08:00', expected: true },
  { label: '12:01:00 AM Midnight Manila (+08:00)', iso: '2026-09-05T00:01:00+08:00', expected: false },
  { label: '12:30:00 AM Midnight Manila (+08:00)', iso: '2026-09-05T00:30:00+08:00', expected: true },
  { label: '12:30:59 AM Midnight Manila (+08:00)', iso: '2026-09-05T00:30:59+08:00', expected: true },
  { label: '12:31:00 AM Midnight Manila (+08:00)', iso: '2026-09-05T00:31:00+08:00', expected: false },
];

let allExplicitPassed = true;
explicitManilaTests.forEach(t => {
  const d = new Date(t.iso);
  const status = getManilaTimeStatus(d);
  const pass = status.isWithinWindow === t.expected;
  if (!pass) allExplicitPassed = false;
  console.log(`${pass ? '🟢 PASS' : '🔴 FAIL'}: ${t.label} -> Manila: ${status.formattedTime} [Active: ${status.isWithinWindow}]`);
});

console.log('\n--- 2. PROOF THAT FOREIGN/DEVICE TIMEZONES (PST/PDT/UTC) DO NOT OVERRIDE ASIA/MANILA ---');
// Scenario A: User device is in US Pacific Time (PDT, UTC-7).
// 01:00:00 AM PDT in Los Angeles is 16:00:00 (4:00 PM) in Manila.
// In Manila, minute is 00, so it IS active because it's 4:00 PM in Manila!
// But 01:15:00 AM PDT is 16:15:00 in Manila -> INACTIVE.
// 01:30:00 AM PDT is 16:30:00 in Manila -> ACTIVE (half-hour window).
// 10:00:00 AM PDT is 01:00:00 AM (next day) in Manila -> ACTIVE.
const deviceTimezoneTests = [
  {
    name: '10:00:00 AM PDT in California (= 01:00:00 AM in Manila)',
    iso: '2026-09-04T10:00:00-07:00',
    expectedManilaHour: 1,
    expectedManilaMinute: 0,
    expectedActive: true
  },
  {
    name: '10:00:59 AM PDT in California (= 01:00:59 AM in Manila)',
    iso: '2026-09-04T10:00:59-07:00',
    expectedManilaHour: 1,
    expectedManilaMinute: 0,
    expectedActive: true
  },
  {
    name: '10:01:00 AM PDT in California (= 01:01:00 AM in Manila)',
    iso: '2026-09-04T10:01:00-07:00',
    expectedManilaHour: 1,
    expectedManilaMinute: 1,
    expectedActive: false
  },
  {
    name: '10:30:00 AM PDT in California (= 01:30:00 AM in Manila)',
    iso: '2026-09-04T10:30:00-07:00',
    expectedManilaHour: 1,
    expectedManilaMinute: 30,
    expectedActive: true
  },
  {
    name: '10:30:59 AM PDT in California (= 01:30:59 AM in Manila)',
    iso: '2026-09-04T10:30:59-07:00',
    expectedManilaHour: 1,
    expectedManilaMinute: 30,
    expectedActive: true
  },
  {
    name: '10:31:00 AM PDT in California (= 01:31:00 AM in Manila)',
    iso: '2026-09-04T10:31:00-07:00',
    expectedManilaHour: 1,
    expectedManilaMinute: 31,
    expectedActive: false
  },
  {
    name: '01:05:00 AM PDT in California (= 16:05:00 PM in Manila -> INACTIVE)',
    iso: '2026-09-05T01:05:00-07:00',
    expectedManilaHour: 16,
    expectedManilaMinute: 5,
    expectedActive: false
  },
  {
    name: '17:00:00 UTC (= 01:00:00 AM in Manila -> ACTIVE)',
    iso: '2026-09-04T17:00:00Z',
    expectedManilaHour: 1,
    expectedManilaMinute: 0,
    expectedActive: true
  },
  {
    name: '17:30:00 UTC (= 01:30:00 AM in Manila -> ACTIVE)',
    iso: '2026-09-04T17:30:00Z',
    expectedManilaHour: 1,
    expectedManilaMinute: 30,
    expectedActive: true
  }
];

let allDeviceTestsPassed = true;
deviceTimezoneTests.forEach(t => {
  const d = new Date(t.iso);
  const status = getManilaTimeStatus(d);
  const pass = status.isWithinWindow === t.expectedActive &&
               status.hours === t.expectedManilaHour &&
               status.minutes === t.expectedManilaMinute;
  if (!pass) allDeviceTestsPassed = false;
  console.log(`${pass ? '🟢 PASS' : '🔴 FAIL'}: ${t.name}`);
  console.log(`    Result: ${status.formattedTime}, Active: ${status.isWithinWindow}`);
});

console.log('\n--- 3. 24-HOUR CONTINUOUS SEQUENCE VALIDATION (ASIA/MANILA UTC+8) ---');
let all24HoursPassed = true;
for (let hour = 0; hour < 24; hour++) {
  const padH = String(hour).padStart(2, '0');
  
  // Test :00:00 (ACTIVE)
  const d00 = new Date(`2026-08-28T${padH}:00:00+08:00`);
  const s00 = getManilaTimeStatus(d00);
  if (!s00.isWithinWindow) {
    all24HoursPassed = false;
    console.error(`❌ FAILED at ${padH}:00:00 - expected ACTIVE`);
  }

  // Test :00:59 (ACTIVE)
  const d0059 = new Date(`2026-08-28T${padH}:00:59+08:00`);
  const s0059 = getManilaTimeStatus(d0059);
  if (!s0059.isWithinWindow) {
    all24HoursPassed = false;
    console.error(`❌ FAILED at ${padH}:00:59 - expected ACTIVE`);
  }

  // Test :01:00 (INACTIVE)
  const d01 = new Date(`2026-08-28T${padH}:01:00+08:00`);
  const s01 = getManilaTimeStatus(d01);
  if (s01.isWithinWindow) {
    all24HoursPassed = false;
    console.error(`❌ FAILED at ${padH}:01:00 - expected INACTIVE`);
  }

  // Test :29:59 (INACTIVE)
  const d29 = new Date(`2026-08-28T${padH}:29:59+08:00`);
  const s29 = getManilaTimeStatus(d29);
  if (s29.isWithinWindow) {
    all24HoursPassed = false;
    console.error(`❌ FAILED at ${padH}:29:59 - expected INACTIVE`);
  }

  // Test :30:00 (ACTIVE)
  const d30 = new Date(`2026-08-28T${padH}:30:00+08:00`);
  const s30 = getManilaTimeStatus(d30);
  if (!s30.isWithinWindow) {
    all24HoursPassed = false;
    console.error(`❌ FAILED at ${padH}:30:00 - expected ACTIVE`);
  }

  // Test :30:59 (ACTIVE)
  const d3059 = new Date(`2026-08-28T${padH}:30:59+08:00`);
  const s3059 = getManilaTimeStatus(d3059);
  if (!s3059.isWithinWindow) {
    all24HoursPassed = false;
    console.error(`❌ FAILED at ${padH}:30:59 - expected ACTIVE`);
  }

  // Test :31:00 (INACTIVE)
  const d31 = new Date(`2026-08-28T${padH}:31:00+08:00`);
  const s31 = getManilaTimeStatus(d31);
  if (s31.isWithinWindow) {
    all24HoursPassed = false;
    console.error(`❌ FAILED at ${padH}:31:00 - expected INACTIVE`);
  }

  // Test :59:59 (INACTIVE)
  const d59 = new Date(`2026-08-28T${padH}:59:59+08:00`);
  const s59 = getManilaTimeStatus(d59);
  if (s59.isWithinWindow) {
    all24HoursPassed = false;
    console.error(`❌ FAILED at ${padH}:59:59 - expected INACTIVE`);
  }
}

if (all24HoursPassed) {
  console.log('✅ ALL 24 HOURS (00:00 to 23:30, AM & PM) VALIDATED: Exact 60s windows at :00 and :30 in Asia/Manila confirmed!');
} else {
  console.error('❌ 24-hour sequence validation failed.');
  process.exit(1);
}

if (!suite.allPassed || !allExplicitPassed || !allDeviceTestsPassed || !all24HoursPassed) {
  console.error('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n🎉 ALL TIMEZONE AND WINDOW TESTS PASSED 100% (AUTHORITATIVE ASIA/MANILA UTC+8).');
}
