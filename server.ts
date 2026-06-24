import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Firestore } from '@google-cloud/firestore';
import { INITIAL_CAMPAIGNS } from './src/data/campaigns';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

const DB_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');

// --- FIREBASE CONFIGURATION & INITIALIZATION ---
let firebaseConfigObj = {
  projectId: "feisty-listener-3d2jw",
  appId: "1:828078909829:web:ce668cbe71588119b33cec",
  apiKey: "AIzaSyCxS9Nt3GHIfo82RSuDEvzYrdJtpJSFTHk",
  authDomain: "feisty-listener-3d2jw.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-a97ac6ad-011f-411e-9d04-596438effa7f",
  storageBucket: "feisty-listener-3d2jw.firebasestorage.app",
  messagingSenderId: "828078909829"
};

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfigObj = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  console.error('Warning: Failed to load dynamic firebase-applet-config.json, using defaults.', e);
}

let isFirestoreActive = false;
let firestore: any = null;

const rawServiceAccountValue = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
let serviceAccountData: any = null;

if (rawServiceAccountValue) {
  if (rawServiceAccountValue.startsWith('{')) {
    // Sa tingin natin ito ay raw JSON string
    try {
      serviceAccountData = JSON.parse(rawServiceAccountValue);
      console.log('🗝️ GCP: Na-parse ang raw JSON credentials mula sa FIREBASE_SERVICE_ACCOUNT environment variable.');
    } catch (err) {
      console.error('⚠️ GCP: Failed parsing inline JSON from FIREBASE_SERVICE_ACCOUNT. Susubukan nating basahin bilang file path kung ito ay path pala...', err);
    }
  }
  
  // Kung hindi pa rin na-parse at baka ito ay file path (e.g. Render Secret File)
  if (!serviceAccountData) {
    try {
      const fs = require('fs');
      if (fs.existsSync(rawServiceAccountValue)) {
        const fileContent = fs.readFileSync(rawServiceAccountValue, 'utf-8');
        serviceAccountData = JSON.parse(fileContent);
        console.log('🗝️ GCP: Matagumpay na nabasa ang credentials mula sa tinuturong file path sa FIREBASE_SERVICE_ACCOUNT:', rawServiceAccountValue);
      }
    } catch (err) {
      console.error('⚠️ GCP: Failed reading service account file from specfied path:', err);
    }
  }
}

const hasServiceAccount = !!serviceAccountData;
const isOnGoogleCloud = !!process.env.K_SERVICE || !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (hasServiceAccount || isOnGoogleCloud) {
  try {
    const isCustomProject = hasServiceAccount && serviceAccountData?.project_id && (serviceAccountData.project_id !== firebaseConfigObj.projectId);
    
    const firestoreOptions: any = {
      projectId: hasServiceAccount ? (serviceAccountData.project_id || firebaseConfigObj.projectId) : firebaseConfigObj.projectId,
    };

    // If it's a custom deployed project (like on Render), use its default database,
    // otherwise use the workspace-specific firestoreDatabaseId if defined.
    if (!isCustomProject && firebaseConfigObj.firestoreDatabaseId) {
      firestoreOptions.databaseId = firebaseConfigObj.firestoreDatabaseId;
    }

    if (hasServiceAccount) {
      firestoreOptions.credentials = serviceAccountData;
      console.log(`🗝️ GCP: Gagamitin ang nahanap na FIREBASE_SERVICE_ACCOUNT para sa project: ${firestoreOptions.projectId}`);
    }

    firestore = new Firestore(firestoreOptions);
    isFirestoreActive = true;
    console.log('☁️ Firestore client initialized successfully.');
  } catch (err) {
    console.error('⚠️ Failed to initialize Firestore client. Falling back to local storage:', err);
    isFirestoreActive = false;
    firestore = null;
  }
} else {
  console.log('⚠️ No Firebase credentials detected (please configure FIREBASE_SERVICE_ACCOUNT env var on Render.com). Falling back to local db.json storage.');
  isFirestoreActive = false;
  firestore = null;
}

// --- DATABASE TYPES ---
interface Subscription {
  status: 'none' | 'pending' | 'active' | 'expired';
  planId: '1month' | '2months' | '3months' | '4months' | null;
  requestedPlanName?: string | null;
  requestedAmount?: number | null;
  requestedAt?: string | null;
  approvedAt?: string | null;
  expiresAt?: string | null;
}

interface UserSession {
  id: string;
  email: string;
  password?: string;
  name: string;
  avatar: string;
  referralCode: string;
  invitedBy?: string; // referralCode of referrer
  isAdmin: boolean;
  createdAt?: string;
  subscription?: Subscription;
  completedCampaignIds?: string[]; // track completed campaigns centrally
  stats: {
    balance: number;
    lifetimeEarnings: number;
    completedTasksCount: number;
    dailyCheckInDate: string | null;
  };
  withdrawals: {
    id: string;
    accountName: string;
    gcashNumber: string;
    amount: number;
    status: 'pending' | 'processing' | 'success' | 'failed';
    createdAt: string;
    referenceNo: string;
  }[];
  activityLogs: {
    id: string;
    type: 'reward' | 'withdraw' | 'bonus';
    title: string;
    amount: number;
    timestamp: string;
    details: string;
  }[];
  referredFriends: {
    id: string;
    name: string;
    avatar: string;
    currentEarnings: number;
    bonusClaimed: boolean;
    joinedAt: string;
  }[];
}

interface DBStructure {
  users: UserSession[];
  campaigns?: any[];
}

// --- HELPER TO INITIALIZE AND GET DATABASE ---
function loadDB(): DBStructure {
  const envAdminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const envAdminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePassword123';
  const envAdminName = process.env.ADMIN_NAME || 'System Administrator';

  // Ensure the src/data directory exists
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const loaded: DBStructure = JSON.parse(data);
      // Synchronize/Update admin credentials dynamically from environment info
      const admin = loaded.users.find(u => u.isAdmin);
      if (admin) {
        admin.email = envAdminEmail;
        admin.password = envAdminPassword;
        admin.name = envAdminName;
      }
      if (!loaded.campaigns || loaded.campaigns.length === 0) {
        loaded.campaigns = INITIAL_CAMPAIGNS;
      }
      return loaded;
    } catch (e) {
      console.error('Error reading database file, resetting...', e);
    }
  }

  // Generate unique code helper
  const genRef = () => 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  // Create default seed database
  const defaultDB: DBStructure = {
    users: [
      // 1. Core Admin Account
      {
        id: 'admin-rosco',
        email: envAdminEmail,
        password: envAdminPassword,
        name: envAdminName,
        avatar: '👑',
        referralCode: 'ADMIN-ROSCO',
        isAdmin: true,
        stats: {
          balance: 0,
          lifetimeEarnings: 0,
          completedTasksCount: 0,
          dailyCheckInDate: null
        },
        withdrawals: [],
        activityLogs: [
          {
            id: 'log-seed-admin',
            type: 'bonus',
            title: 'System Initialized',
            amount: 0,
            timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
            details: 'Naka-online na ang GCash Click-Earn Cloud Server. Handa nang subaybayan ang aktibidad ng mga mamamayan!'
          }
        ],
        referredFriends: []
      },
      // 2. Mock Test User 1
      {
        id: 'user-juan',
        email: 'juan@example.ph',
        password: 'Password123',
        name: 'Juan Dela Cruz',
        avatar: '👨‍💻',
        referralCode: 'REF-JUAN77',
        isAdmin: false,
        stats: {
          balance: 145.00,
          lifetimeEarnings: 345.00,
          completedTasksCount: 16,
          dailyCheckInDate: new Date().toLocaleDateString('fil-PH')
        },
        withdrawals: [
          {
            id: 'with-seed-1',
            accountName: 'Juan Dela Cruz',
            gcashNumber: '09171234567',
            amount: 200.00,
            status: 'pending',
            createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toLocaleString('fil-PH', { hour12: true }),
            referenceNo: 'REF' + Math.floor(1000000000 + Math.random() * 9000000000)
          }
        ],
        activityLogs: [
          {
            id: 'log-seed-juan-1',
            type: 'withdraw',
            title: 'Nagsumite ng GCash Cashout',
            amount: 200.00,
            timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toLocaleString('fil-PH', { hour12: true }),
            details: 'Humihiling ng ₱200.00 cashout sa GCash number 09171234567. Naghihintay ng pag-approve ng admin.'
          },
          {
            id: 'log-seed-juan-2',
            type: 'reward',
            title: 'Shopee PH Tipid Hacks 2026 Completed',
            amount: 12.50,
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleString('fil-PH', { hour12: true }),
            details: 'Nanood ng website upang matutunan ang Piso deals at libreng shipping guide.'
          }
        ],
        referredFriends: []
      },
      // 3. Mock Test User 2
      {
        id: 'user-clara',
        email: 'clara@example.ph',
        password: 'Password123',
        name: 'Maria Clara Santos',
        avatar: '👩‍⚕️',
        referralCode: 'REF-CLARAS',
        invitedBy: 'ADMIN-ROSCO', // Admin can claim bonus for Clara if Clara earnings reach 500!
        isAdmin: false,
        stats: {
          balance: 280.00,
          lifetimeEarnings: 530.00,
          completedTasksCount: 25,
          dailyCheckInDate: null
        },
        withdrawals: [
          {
            id: 'with-seed-2',
            accountName: 'Maria Clara Santos',
            gcashNumber: '09187654321',
            amount: 250.00,
            status: 'success',
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toLocaleString('fil-PH', { hour12: true }),
            referenceNo: 'REF5830184321'
          }
        ],
        activityLogs: [
          {
            id: 'log-seed-clara-1',
            type: 'withdraw',
            title: 'GCash Cashout Approved',
            amount: 250.00,
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toLocaleString('fil-PH', { hour12: true }),
            details: 'Nabayaran na ang ₱250.00 cashout sa iyong GCash wallet.'
          }
        ],
        referredFriends: []
      }
    ],
    campaigns: INITIAL_CAMPAIGNS
  };

  // Add Maria Clara as admin's referred friend at the start
  defaultDB.users[0].referredFriends.push({
    id: 'user-clara',
    name: 'Maria Clara Santos',
    avatar: '👩‍⚕️',
    currentEarnings: 530.00, // already reached 500! Ready to claim!
    bonusClaimed: false,
    joinedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  });

  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(defaultDB, null, 2), 'utf-8');
  return defaultDB;
}

function saveDB(data: DBStructure) {
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  uploadToFirestore(data).catch(err => {
    console.error('Error uploading db changes to Firestore:', err);
  });
}

async function uploadToFirestore(data: DBStructure) {
  if (!isFirestoreActive || !firestore) {
    return;
  }
  try {
    const batchValues = data.users.map(async (u) => {
      const uDocRef = firestore.collection('users').doc(u.id);
      const { id, ...uWithoutId } = u;
      await uDocRef.set(uWithoutId);
    });

    let campPromises: Promise<any>[] = [];
    if (data.campaigns) {
      campPromises = data.campaigns.map(async (c) => {
        const cDocRef = firestore.collection('campaigns').doc(c.id);
        const { id, ...cWithoutId } = c;
        await cDocRef.set(cWithoutId);
      });
    }

    await Promise.all([...batchValues, ...campPromises]);
    console.log('☁️ GCash Click-Earn: Firebase Firestore cloud backup completed successfully.');
  } catch (err) {
    console.error('❌ Failed background write to Firestore:', err);
  }
}

async function syncFromFirestore() {
  if (!isFirestoreActive || !firestore) {
    console.log('ℹ️ Local fallback active: Sini-synchronize ay lalaktawan dahil walang nakitang Firebase credentials.');
    return;
  }
  try {
    const envAdminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const envAdminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePassword123';
    const envAdminName = process.env.ADMIN_NAME || 'System Administrator';

    // Ensure directory exists
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const usersColRef = firestore.collection('users');
    const qSnapshot = await usersColRef.get();
    
    const dbUsers: any[] = [];
    qSnapshot.forEach((docSnap) => {
      dbUsers.push({ id: docSnap.id, ...docSnap.data() });
    });

    const campaignsColRef = firestore.collection('campaigns');
    const cSnapshot = await campaignsColRef.get();
    const dbCampaigns: any[] = [];
    cSnapshot.forEach((docSnap) => {
      dbCampaigns.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (dbUsers.length > 0) {
      console.log(`📱 Found ${dbUsers.length} users in Firestore. Overwriting local cache...`);
      const loadedDB: DBStructure = { 
        users: dbUsers,
        campaigns: dbCampaigns.length > 0 ? dbCampaigns : INITIAL_CAMPAIGNS
      };
      
      // Update/synchronize admin details if needed
      const admin = loadedDB.users.find(u => u.isAdmin);
      if (admin) {
        admin.email = envAdminEmail;
        admin.password = envAdminPassword;
        admin.name = envAdminName;
      }
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(loadedDB, null, 2), 'utf-8');
    } else {
      console.log('🌱 Firestore cloud database is empty. Seeding defaults from local template...');
      // Load local database or create a new one using loadDB
      const localDB = loadDB(); // This creates db.json locally if empty
      
      // Now seed Firestore
      const batchPromises = localDB.users.map(async (u) => {
        const uDocRef = firestore.collection('users').doc(u.id);
        const { id, ...uWithoutId } = u;
        await uDocRef.set(uWithoutId);
      });

      let seedCampPromises: Promise<any>[] = [];
      if (localDB.campaigns) {
        seedCampPromises = localDB.campaigns.map(async (c) => {
          const cDocRef = firestore.collection('campaigns').doc(c.id);
          const { id, ...cWithoutId } = c;
          await cDocRef.set(cWithoutId);
        });
      }

      await Promise.all([...batchPromises, ...seedCampPromises]);
      console.log('✅ Seeding of Firestore complete.');
    }
  } catch (err) {
    console.error('⚠️ Could not sync with Firestore at startup. Using local database fallback:', err);
  }
}

// Ensure database is initialized (will be updated dynamically during startup sync)
let database = loadDB();

// --- AUTH MIDDLEWARE ---
function generateToken(userId: string) {
  return userId; // Simple pass-through for simulation token
}

function hasActiveAccess(user: UserSession): boolean {
  if (user.isAdmin) return true;
  
  const regDate = user.createdAt ? new Date(user.createdAt) : new Date();
  const passedMs = Date.now() - regDate.getTime();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  
  // Free trial access for exactly 1 day (24 hours)
  if (passedMs < oneDayInMs) {
    return true;
  }
  
  // If registered more than 1 day ago, must have active, unexpired subscription
  const sub = user.subscription;
  if (!sub || sub.status !== 'active') {
    return false;
  }
  
  if (sub.expiresAt) {
    return new Date(sub.expiresAt).getTime() > Date.now();
  }
  
  return false;
}

// ============================================
//               AUTHENTICATION
// ============================================

// REGISTER
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, avatar, referralCode } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Kailangan ibigay ang email, password, at pangalan.' });
  }

  const db = loadDB();
  const lowerEmail = email.toLowerCase().trim();

  const userExists = db.users.find(u => u.email.toLowerCase() === lowerEmail);
  if (userExists) {
    return res.status(400).json({ error: 'Ang email na ito ay may rehistradong account na.' });
  }

  // Generate individual referral code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let myCode = 'REF-';
  for (let i = 0; i < 6; i++) {
    myCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const userId = 'user-api-' + Date.now();
  const defaultAvatar = avatar || '👤';

  // Create new user session structure
  const newUser: UserSession = {
    id: userId,
    email: email.trim(),
    password: password,
    name: name.trim(),
    avatar: defaultAvatar,
    referralCode: myCode,
    isAdmin: false,
    createdAt: new Date().toISOString(),
    subscription: {
      status: 'none',
      planId: null,
      requestedPlanName: null,
      requestedAmount: null,
      requestedAt: null,
      expiresAt: null
    },
    stats: {
      balance: 25.00, // Starting Welcome Bonus
      lifetimeEarnings: 25.00,
      completedTasksCount: 0,
      dailyCheckInDate: null
    },
    withdrawals: [],
    activityLogs: [
      {
        id: 'log-welcome-' + Date.now(),
        type: 'bonus',
        title: 'Salamat sa pagre-register! Libreng Pang-umpisang Pera',
        amount: 25.00,
        timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
        details: 'Nakatanggap ka ng libreng ₱25.00 bilang Welcome Gift.'
      }
    ],
    referredFriends: []
  };

  // If registering with a referral code
  if (referralCode) {
    const codeClean = referralCode.trim().toUpperCase();
    const referrer = db.users.find(u => u.referralCode === codeClean);
    if (referrer) {
      newUser.invitedBy = codeClean;
      // Add this new user to the referrer's referred list!
      referrer.referredFriends.push({
        id: userId,
        name: newUser.name,
        avatar: newUser.avatar,
        currentEarnings: 25.00, // Starts with their initial balance
        bonusClaimed: false,
        joinedAt: new Date().toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' })
      });
      
      // Also notify referrer with a customized activity log
      referrer.activityLogs.unshift({
        id: 'log-ref-join-' + Date.now(),
        type: 'bonus',
        title: `Sumali gamit ang Link mo si ${newUser.name}`,
        amount: 0,
        timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
        details: `${newUser.name} ay gumawa ng account gamit ang iyong link. Makakakuha ka ng ₱5.00 kapag naka-ipon siya ng kanyang unang ₱100.00!`
      });
    }
  }

  db.users.push(newUser);
  saveDB(db);

  const { password: _, ...userSafe } = newUser as any;
  res.json({ user: userSafe, token: generateToken(userId) });
});

// LOGIN
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Kailangan ibigay ang email at password.' });
  }

  const db = loadDB();
  const lowerEmail = email.toLowerCase().trim();

  const user = db.users.find(u => u.email.toLowerCase() === lowerEmail);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Maling email o password. Pakisubukang muli.' });
  }

  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe, token: generateToken(user.id) });
});

// AUTO-RESTORE SESSION ENDPOINT
app.post('/api/auth/auto-restore', (req, res) => {
  const { email, password, name, avatar, stats, withdrawals, activityLogs, referredFriends } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Kailangan ibigay ang email, password, at pangalan.' });
  }

  const db = loadDB();
  const lowerEmail = email.toLowerCase().trim();

  let user = db.users.find(u => u.email.toLowerCase() === lowerEmail);

  if (!user) {
    // Re-create and restore the exact profile state from localStorage credentials
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let myCode = 'REF-';
    for (let i = 0; i < 6; i++) {
      myCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    user = {
      id: 'user-restore-' + Date.now(),
      email: email.trim(),
      password: password,
      name: name.trim(),
      avatar: avatar || '👤',
      referralCode: myCode,
      isAdmin: false,
      createdAt: new Date().toISOString(),
      subscription: {
        status: 'none',
        planId: null,
        requestedPlanName: null,
        requestedAmount: null,
        requestedAt: null,
        expiresAt: null
      },
      stats: stats || {
        balance: 25.00,
        lifetimeEarnings: 25.00,
        completedTasksCount: 0,
        dailyCheckInDate: null
      },
      withdrawals: withdrawals || [],
      activityLogs: activityLogs || [],
      referredFriends: referredFriends || []
    };

    db.users.push(user);
    saveDB(db);
  } else {
    // If user already exists inside current session memory, verify passwords
    if (user.password !== password) {
      return res.status(401).json({ error: 'Suriing mabuti ang email at password.' });
    }
  }

  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe, token: generateToken(user.id) });
});

// GOOGLE SIGN IN OR SIGN UP SIMULATION
app.post('/api/auth/google', (req, res) => {
  const { email, name, avatar, referralCode } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Kailangan ibigay ang Google account details.' });
  }

  const db = loadDB();
  const lowerEmail = email.toLowerCase().trim();

  let user = db.users.find(u => u.email.toLowerCase() === lowerEmail);

  // If user doesn't exist, create it on-the-fly (Sign Up)
  if (!user) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let myCode = 'REF-';
    for (let i = 0; i < 6; i++) {
      myCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const userId = 'user-google-' + Date.now();
    const defaultAvatar = avatar || '🌐';

    user = {
      id: userId,
      email: email.trim(),
      // No standard password since they used Google Sign-In
      name: name.trim(),
      avatar: defaultAvatar,
      referralCode: myCode,
      isAdmin: false,
      createdAt: new Date().toISOString(),
      subscription: {
        status: 'none',
        planId: null,
        requestedPlanName: null,
        requestedAmount: null,
        requestedAt: null,
        expiresAt: null
      },
      stats: {
        balance: 25.00,
        lifetimeEarnings: 25.00,
        completedTasksCount: 0,
        dailyCheckInDate: null
      },
      withdrawals: [],
      activityLogs: [
        {
          id: 'log-welcome-' + Date.now(),
          type: 'bonus',
          title: 'Welcome! Google Sign-up Activated',
          amount: 25.00,
          timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
          details: 'Nakatanggap ka ng libreng ₱25.00 bilang Welcome Gift sa pag-login gamit ang Google.'
        }
      ],
      referredFriends: []
    };

    // Referrer tracking
    if (referralCode) {
      const codeClean = referralCode.trim().toUpperCase();
      const referrer = db.users.find(u => u.referralCode === codeClean);
      if (referrer) {
        user.invitedBy = codeClean;
        referrer.referredFriends.push({
          id: userId,
          name: user.name,
          avatar: user.avatar,
          currentEarnings: 25.00,
          bonusClaimed: false,
          joinedAt: new Date().toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' })
        });
        referrer.activityLogs.unshift({
          id: 'log-ref-join-' + Date.now(),
          type: 'bonus',
          title: `Sumali gamit ang Link mo si ${user.name} (Google)`,
          amount: 0,
          timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
          details: `${user.name} ay gumawa ng account gamit ang Google Sign-In at iyong referral link. Makakakuha ka ng ₱5.00 kapag naka-ipon siya ng kanyang unang ₱100.00!`
        });
      }
    }

    db.users.push(user);
    saveDB(db);
  }

  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe, token: generateToken(user.id) });
});

// GET USER PROFILE
app.get('/api/user/profile', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Lumalabas na naka-Logout ka. Mag-login muna.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang gumagamit.' });
  }

  // Check subscription expiration
  let dbChanged = false;
  
  if (!user.createdAt) {
    user.createdAt = new Date().toISOString();
    dbChanged = true;
  }
  
  if (!user.subscription) {
    user.subscription = {
      status: 'none',
      planId: null,
      requestedPlanName: null,
      requestedAmount: null,
      requestedAt: null,
      expiresAt: null
    };
    dbChanged = true;
  } else if (user.subscription.status === 'active' && user.subscription.expiresAt) {
    if (new Date(user.subscription.expiresAt).getTime() < Date.now()) {
      user.subscription.status = 'expired';
      user.activityLogs.unshift({
        id: 'expire-sub-' + Date.now(),
        type: 'bonus',
        title: 'Expired na ang iyong Subscription 🚫',
        amount: 0,
        timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
        details: 'Ang iyong premium subscription access ay natapos na ngayon. Mangyaring pumili muli ng subscription plan upang muling ma-reopen ang iyong dashboard access.'
      });
      dbChanged = true;
    }
  }

  // Update referred friends' progress live in referrer's profile screen
  // By matching referredFriends with their actual current earnings on our DB!
  let isFriendListModified = false;
  const synchronizedReferredFriends = user.referredFriends.map(friend => {
    const actualFriendUser = db.users.find(u => u.id === friend.id);
    if (actualFriendUser && actualFriendUser.stats.lifetimeEarnings !== friend.currentEarnings) {
      isFriendListModified = true;
      return {
        ...friend,
        currentEarnings: actualFriendUser.stats.lifetimeEarnings
      };
    }
    return friend;
  });

  if (isFriendListModified) {
    user.referredFriends = synchronizedReferredFriends;
    dbChanged = true;
  }

  if (dbChanged) {
    saveDB(db);
  }

  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe });
});

// --- CAMPAIGNS ENDPOINTS ---
app.get('/api/campaigns', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const allCampaigns = db.campaigns || INITIAL_CAMPAIGNS;

  if (user.isAdmin) {
    // Admins see all campaigns to view and manage them
    return res.json({ campaigns: allCampaigns });
  }

  // Regular users see exactly 3 random (deterministic per day, per user) campaigns
  const todayStr = new Date().toISOString().split('T')[0];
  const selectionSeedStr = `${todayStr}-${user.id}`;
  
  // Seeded Random helper function
  function mulberry32(a: number) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  }

  let hash = 0;
  for (let i = 0; i < selectionSeedStr.length; i++) {
    hash = (hash << 5) - hash + selectionSeedStr.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  const rand = mulberry32(Math.abs(hash));
  const pool = [...allCampaigns];
  const selected: any[] = [];
  const count = Math.min(3, pool.length);

  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rand() * pool.length);
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }

  // Mark completion status matching the user's completedCampaignIds array
  const completedIds = user.completedCampaignIds || [];
  const campaignsWithStatus = selected.map(c => ({
    ...c,
    completed: completedIds.includes(c.id)
  }));

  res.json({ campaigns: campaignsWithStatus });
});

app.post('/api/admin/campaigns', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Sapat na Admin privileges ay kailangan.' });
  }

  const { campaign } = req.body;
  if (!campaign || !campaign.id || !campaign.title || !campaign.url) {
    return res.status(400).json({ error: 'Invalid campaign body submission.' });
  }

  if (!db.campaigns) {
    db.campaigns = INITIAL_CAMPAIGNS;
  }

  // Add the new custom campaign at the start
  db.campaigns.unshift(campaign);
  saveDB(db);

  res.json({ success: true, campaigns: db.campaigns });
});

app.delete('/api/admin/campaigns/:id', async (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Sapat na Admin privileges ay kailangan.' });
  }

  const campaignId = req.params.id;
  if (!db.campaigns) {
    db.campaigns = INITIAL_CAMPAIGNS;
  }

  const initialLength = db.campaigns.length;
  db.campaigns = db.campaigns.filter(c => c.id !== campaignId);

  if (db.campaigns.length === initialLength) {
    return res.status(404).json({ error: 'Hindi mahanap ang campaign.' });
  }

  saveDB(db);

  // If firestore is active, also delete the document from Firestore campaigns collection
  if (isFirestoreActive && firestore) {
    try {
      await firestore.collection('campaigns').doc(campaignId).delete();
      console.log(`🗑️ Deleted campaign ${campaignId} from Firestore collection.`);
    } catch (err) {
      console.error(`❌ Failed to delete campaign ${campaignId} from Firestore:`, err);
    }
  }

  res.json({ success: true, campaigns: db.campaigns });
});

// COMPLETED TASK REWARD SYNC
app.post('/api/user/task-complete', (req, res) => {
  const userId = req.headers.authorization;
  const { campaignId, rewardAmount, title, details } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated Request.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang gumagamit.' });
  }

  if (!hasActiveAccess(user)) {
    return res.status(403).json({ error: 'Expired na ang iyong trial o subscription. Mangyaring kumuha ng access plan upang magpatuloy.' });
  }

  const reward = Number(rewardAmount);
  user.stats.balance = Number((user.stats.balance + reward).toFixed(2));
  user.stats.lifetimeEarnings = Number((user.stats.lifetimeEarnings + reward).toFixed(2));
  user.stats.completedTasksCount += 1;

  if (campaignId) {
    if (!user.completedCampaignIds) {
      user.completedCampaignIds = [];
    }
    if (!user.completedCampaignIds.includes(campaignId)) {
      user.completedCampaignIds.push(campaignId);
    }
  }

  // Record logs
  user.activityLogs.unshift({
    id: 'log-' + Date.now(),
    type: 'reward',
    title: title || 'Nood Campaign Reward',
    amount: reward,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: details || `Nakumpleto mo ang panonood ng website at may gantimpala kang ₱${reward.toFixed(2)}.`
  });

  // If this user has a referrer, we also sync their current earnings inside referrer's friend entry!
  if (user.invitedBy) {
    const referrer = db.users.find(u => u.referralCode === user.invitedBy);
    if (referrer) {
      const friendEntryIdx = referrer.referredFriends.findIndex(f => f.id === user.id);
      if (friendEntryIdx !== -1) {
        const oldEarnings = referrer.referredFriends[friendEntryIdx].currentEarnings;
        referrer.referredFriends[friendEntryIdx].currentEarnings = user.stats.lifetimeEarnings;

        // If friend just reached 100 lifetime earnings, notify referrer
        if (oldEarnings < 100 && user.stats.lifetimeEarnings >= 100) {
          referrer.activityLogs.unshift({
            id: 'log-ref-alert-' + Date.now(),
            type: 'bonus',
            title: `⭐ Target Naabot ni ${user.name}!`,
            amount: 5.00,
            timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
            details: `Umabot na sa ₱100.00 ang naiipong kita ng na-invite mong si ${user.name}! Pwede mo nang pitasin ang iyong ₱5.00 Bonus sa Referee Section!`
          });
        }
      }
    }
  }

  saveDB(db);
  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe });
});

// CLAIM REFERRAL BONUS
app.post('/api/user/claim-referral-bonus', (req, res) => {
  const userId = req.headers.authorization;
  const { friendId } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!hasActiveAccess(user)) {
    return res.status(403).json({ error: 'Expired na ang iyong trial o subscription. Mangyaring kumuha ng access plan upang magpatuloy.' });
  }

  const friend = user.referredFriends.find(f => f.id === friendId);
  if (!friend) {
    return res.status(404).json({ error: 'Hindi nakita si friend sa mga invited mo.' });
  }

  // Check if they actual reach 100 (sync actual user info)
  const actualFriend = db.users.find(u => u.id === friendId);
  const realFriendEarnings = actualFriend ? actualFriend.stats.lifetimeEarnings : friend.currentEarnings;

  if (realFriendEarnings < 100) {
    return res.status(400).json({ error: `Humihingi ng paumanhin: Kailangan muna maabot ni ${friend.name} ang ₱100.00 lifetime earnings. (Kasalukuyan: ₱${realFriendEarnings.toFixed(2)})` });
  }

  if (friend.bonusClaimed) {
    return res.status(400).json({ error: 'Siningil mo na ang reward para kay kaibigan.' });
  }

  // Upgrade status
  friend.bonusClaimed = true;
  friend.currentEarnings = realFriendEarnings;

  // Add reward to referrer
  user.stats.balance = Number((user.stats.balance + 5.00).toFixed(2));
  user.stats.lifetimeEarnings = Number((user.stats.lifetimeEarnings + 5.00).toFixed(2));

  user.activityLogs.unshift({
    id: 'log-ref-claimed-' + Date.now(),
    type: 'bonus',
    title: `Na-claim ang Referral Bonus (${friend.name})`,
    amount: 5.00,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Salamat sa pag-akay kay ${friend.name}! Matagumpay nating naitala ang iyong ₱5.00 bonus.`
  });

  saveDB(db);
  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe });
});

// SUBMIT WITHDRAWAL REQUEST
app.post('/api/user/withdraw', (req, res) => {
  const userId = req.headers.authorization;
  const { accountName, gcashNumber, amount } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Naka-Logout. Lumagda muna upang mag-withdraw.' });
  }

  const requestedAmount = Number(amount);
  if (isNaN(requestedAmount) || requestedAmount < 100) {
    return res.status(400).json({ error: 'Ang minimum na withdrawal ay ₱100.00.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi maiproseso: User not found.' });
  }

  if (!hasActiveAccess(user)) {
    return res.status(403).json({ error: 'Expired na ang iyong trial o subscription. Mangyaring kumuha ng access plan upang magpatuloy.' });
  }

  if (user.stats.balance < requestedAmount) {
    return res.status(400).json({ error: 'Kulang ang iyong kasalukuyang balanse sa hinihiling na withdrawal.' });
  }

  // Deduct from balance
  user.stats.balance = Number((user.stats.balance - requestedAmount).toFixed(2));

  // Create request
  const newWithdrawal = {
    id: 'with-' + Date.now(),
    accountName: accountName.trim(),
    gcashNumber: gcashNumber.trim(),
    amount: requestedAmount,
    status: 'pending' as const,
    createdAt: new Date().toLocaleString('fil-PH', { hour12: true }),
    referenceNo: 'REF' + Math.floor(1000000000 + Math.random() * 9000000000)
  };

  user.withdrawals.unshift(newWithdrawal);

  // Log activity
  user.activityLogs.unshift({
    id: 'log-withdraw-' + Date.now(),
    type: 'withdraw',
    title: 'Nagsumite ng GCash Cashout',
    amount: requestedAmount,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Humiling ka ng ₱${requestedAmount.toFixed(2)} cashout papunta sa GCash Number: ${gcashNumber}. Naghihintay ito ng pagsusuri ng Admin.`
  });

  saveDB(db);
  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe });
});

// DAILY CHECKIN SYNC
app.post('/api/user/daily-checkin', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) return res.status(401).json({ error: 'Access Denied.' });

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (!hasActiveAccess(user)) {
    return res.status(403).json({ error: 'Expired na ang iyong trial o subscription. Mangyaring kumuha ng access plan upang magpatuloy.' });
  }

  const todayStr = new Date().toLocaleDateString('fil-PH');
  if (user.stats.dailyCheckInDate === todayStr) {
    return res.status(400).json({ error: 'Nakuha mo na ang iyong arawang gantimpala para sa araw na ito.' });
  }

  const checkinReward = 1.00;
  user.stats.balance = Number((user.stats.balance + checkinReward).toFixed(2));
  user.stats.lifetimeEarnings = Number((user.stats.lifetimeEarnings + checkinReward).toFixed(2));
  user.stats.dailyCheckInDate = todayStr;

  user.activityLogs.unshift({
    id: 'log-checkin-' + Date.now(),
    type: 'bonus',
    title: 'Daily Check-In Reward Nakuha',
    amount: checkinReward,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Pumasok ka ngayong araw at ginawaran ka ng libreng ₱${checkinReward.toFixed(2)}.`
  });

  saveDB(db);
  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe });
});


// ============================================
//               ADMIN FUNCTIONS
// ============================================

// GET ALL USERS AND STATS (For Admin dashboard)
app.get('/api/admin/dashboard', (req, res) => {
  const adminId = req.headers.authorization;
  if (!adminId) {
    return res.status(401).json({ error: 'Naka-loob lamang ito sa Admin.' });
  }

  const db = loadDB();
  const adminUser = db.users.find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Wala kang pahintulot na tingnan ang page na ito.' });
  }

  // Construct a summary list for tracking across devices
  const allUsersStats = db.users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    avatar: u.avatar,
    isAdmin: u.isAdmin,
    stats: u.stats,
    withdrawalsCount: u.withdrawals.length,
    referralCode: u.referralCode,
    referredFriendsCount: u.referredFriends.length,
    lastActivities: u.activityLogs.slice(0, 10), // last 10 activities
    createdAt: u.createdAt || null,
    subscription: u.subscription || null
  }));

  // Gather all withdrawal requests across everyone to manage in one central hub
  const pendingAndAllWithdrawals: {
    userId: string;
    userName: string;
    userAvatar: string;
    request: any;
  }[] = [];

  db.users.forEach(u => {
    u.withdrawals.forEach(w => {
      pendingAndAllWithdrawals.push({
        userId: u.id,
        userName: u.name,
        userAvatar: u.avatar,
        request: w
      });
    });
  });

  // Sort withdrawals by ID or timestamp (newest first)
  pendingAndAllWithdrawals.sort((a, b) => b.request.createdAt.localeCompare(a.request.createdAt));

  res.json({
    users: allUsersStats,
    withdrawals: pendingAndAllWithdrawals
  });
});

// ACTION APPROVE/DECLINE WITHDRAWAL
app.post('/api/admin/withdrawals/:withdrawId/action', (req, res) => {
  const adminId = req.headers.authorization;
  const { withdrawId } = req.params;
  const { action } = req.body; // 'approve' or 'decline'

  if (!adminId) {
    return res.status(401).json({ error: 'Admin signature required.' });
  }

  const db = loadDB();
  const adminUser = db.users.find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Pahintulot ay nakareserba lamang sa Admin.' });
  }

  // Find user and withdrawal request 
  let targetUser: UserSession | undefined;
  let targetWithdrawalIndex = -1;

  for (const user of db.users) {
    const idx = user.withdrawals.findIndex(w => w.id === withdrawId);
    if (idx !== -1) {
      targetUser = user;
      targetWithdrawalIndex = idx;
      break;
    }
  }

  if (!targetUser || targetWithdrawalIndex === -1) {
    return res.status(404).json({ error: 'Hindi nahanap ang partikular na withdrawal request.' });
  }

  const reqObj = targetUser.withdrawals[targetWithdrawalIndex];
  if (reqObj.status !== 'pending' && reqObj.status !== 'processing') {
    return res.status(400).json({ error: `Ang kahilingang ito ay tapos na (Kasalukuyang Status: ${reqObj.status}).` });
  }

  if (action === 'approve') {
    reqObj.status = 'success';
    
    // Add success logger
    targetUser.activityLogs.unshift({
      id: 'admin-action-' + Date.now(),
      type: 'withdraw',
      title: 'GCash Cashout Approved!',
      amount: reqObj.amount,
      timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
      details: `Inaprubahan ng Admin ang iyong cashout na nagkakahalaga ng ₱${reqObj.amount.toFixed(2)}. Matagumpay itong naipadala sa GCash number mo!`
    });
  } else if (action === 'decline') {
    reqObj.status = 'failed';
    
    // Refund user balance
    targetUser.stats.balance = Number((targetUser.stats.balance + reqObj.amount).toFixed(2));

    // Add decline logger
    targetUser.activityLogs.unshift({
      id: 'admin-action-' + Date.now(),
      type: 'withdraw',
      title: 'GCash Cashout Tinanggihan (Refunded)',
      amount: reqObj.amount,
      timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
      details: `Tinanggihan ng Admin ang iyong withdrawal request para sa ₱${reqObj.amount.toFixed(2)}. Binalik ang pera sa iyong balance.`
    });
  } else {
    return res.status(400).json({ error: 'Maling desisyon. Approve o Decline lang ang pwedeng gawin.' });
  }

  saveDB(db);
  res.json({ success: true, message: `Desisyon ay naitala nang matagumpay.` });
});

// SIMULATE MOCK FRIEND EVENT FROM SERVER
app.post('/api/admin/simulate-mock-friend', (req, res) => {
  const { referrerId } = req.body;
  const db = loadDB();

  const referrer = db.users.find(u => u.id === referrerId);
  if (!referrer) return res.status(404).json({ error: 'Referrer not found' });

  const randomSub = Math.floor(100 + Math.random() * 900);
  const friendName = 'Piloto Dela Cruz #' + randomSub;

  const codeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randCode = 'REF-';
  for (let i = 0; i < 6; i++) randCode += codeChars.charAt(Math.floor(Math.random() * codeChars.length));

  // Register friend as actual user in backend!
  const mockFriend: UserSession = {
    id: 'mock-user-' + randomSub,
    email: `piloto${randomSub}@simulator.com`,
    password: 'Password123',
    name: friendName,
    avatar: '🧑‍🚀',
    referralCode: randCode,
    invitedBy: referrer.referralCode,
    isAdmin: false,
    stats: {
      balance: 100,
      lifetimeEarnings: 100,
      completedTasksCount: 4,
      dailyCheckInDate: null
    },
    withdrawals: [],
    activityLogs: [
      {
        id: 'mock-log-1',
        type: 'bonus',
        title: 'Joined platform',
        amount: 25.00,
        timestamp: new Date().toLocaleString(),
        details: 'Signed up under referral code ' + referrer.referralCode
      }
    ],
    referredFriends: []
  };

  db.users.push(mockFriend);

  // Link in referrer's profile list
  referrer.referredFriends.push({
    id: mockFriend.id,
    name: friendName,
    avatar: '🧑‍🚀',
    currentEarnings: 100,
    bonusClaimed: false,
    joinedAt: new Date().toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  });

  referrer.activityLogs.unshift({
    id: 'mock-notif-' + Date.now(),
    type: 'bonus',
    title: `Sumali gamit ang link mo si ${friendName}`,
    amount: 0,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Salamat sa pagtawag kay ${friendName}! Pumasok siya sa server. Makukuha mo ang ₱5.00 kapag naabot niya ang ₱100 na kabuuang kita.`
  });

  saveDB(db);
  res.json({ success: true, user: referrer });
});

// SIMULATE ANOTHER COMPLETED REWARD FROM THE FRIEND TO DEMONSTRATE MILESTONE REACHED IN THE REFERRER PANEL
app.post('/api/admin/simulate-friend-earnings', (req, res) => {
  const { friendId } = req.body;
  const db = loadDB();

  // Find friend user
  const friend = db.users.find(u => u.id === friendId);
  if (!friend) return res.status(404).json({ error: 'Kaibigan ay hindi nahanap.' });

  // Add earnings to push them over the edges
  friend.stats.lifetimeEarnings = Math.min(100, friend.stats.lifetimeEarnings + 150);
  friend.stats.balance += 150;

  // Sync back to their referrer referredFriends entry
  if (friend.invitedBy) {
    const referrer = db.users.find(u => u.referralCode === friend.invitedBy);
    if (referrer) {
      const entry = referrer.referredFriends.find(f => f.id === friendId);
      if (entry) {
        entry.currentEarnings = friend.stats.lifetimeEarnings;
        
        if (friend.stats.lifetimeEarnings >= 500 && !entry.bonusClaimed) {
          referrer.activityLogs.unshift({
            id: 'mock-earn-reach-' + Date.now(),
            type: 'bonus',
            title: `⭐ Milestone Naabot ni ${friend.name}!`,
            amount: 5.00,
            timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
            details: `Mayroon nang higit sa ₱100.00 na kita si ${friend.name}! Iyong i-claim ang iyong ₱5.00 Referral reward ngayon.`
          });
        }
      }
    }
  }

  saveDB(db);
  res.json({ success: true });
});


// ============================================
//         SUBSCRIPTION ENDPOINTS
// ============================================

// REQUEST A PLAN
app.post('/api/subscription/request', (req, res) => {
  const userId = req.headers.authorization;
  const { planId } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna.' });
  }

  const allowedPlans: Record<string, { name: string; amount: number }> = {
    '1month': { name: '1 Month Access', amount: 200 },
    '2months': { name: '2 Months Access', amount: 500 },
    '3months': { name: '3 Months Access', amount: 1000 },
    '4months': { name: '4 Months Access', amount: 2000 }
  };

  if (!planId || !allowedPlans[planId]) {
    return res.status(400).json({ error: 'Maling subscription plan na pinili.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang gumagamit.' });
  }

  const targetPlan = allowedPlans[planId];

  user.subscription = {
    status: 'pending',
    planId: planId,
    requestedPlanName: targetPlan.name,
    requestedAmount: targetPlan.amount,
    requestedAt: new Date().toISOString()
  };

  user.activityLogs.unshift({
    id: 'sub-req-' + Date.now(),
    type: 'bonus',
    title: 'Nakabinbing Subscription Request ⏳',
    amount: 0,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Humiling ka ng access para sa ${targetPlan.name} (₱${targetPlan.amount.toFixed(2)}). Naghihintay ito ng aprubal mula sa Admin.`
  });

  saveDB(db);
  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe });
});

// ADMIN APPROVE SUBSCRIPTION
app.post('/api/admin/subscription/:userId/approve', (req, res) => {
  const adminId = req.headers.authorization;
  const { userId } = req.params;

  if (!adminId) {
    return res.status(401).json({ error: 'Naka-loob lamang ito sa Admin.' });
  }

  const db = loadDB();
  const adminUser = db.users.find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Wala kang pahintulot na gawin ito.' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!user.subscription || user.subscription.status !== 'pending') {
    return res.status(400).json({ error: 'Walang nakabinbing subscription request ang user na ito.' });
  }

  const planId = user.subscription.planId;
  let validityDays = 30;
  if (planId === '2months') validityDays = 60;
  else if (planId === '3months') validityDays = 90;
  else if (planId === '4months') validityDays = 120;

  const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

  user.subscription = {
    status: 'active',
    planId: planId,
    requestedPlanName: user.subscription.requestedPlanName,
    requestedAmount: user.subscription.requestedAmount,
    requestedAt: user.subscription.requestedAt,
    approvedAt: new Date().toISOString(),
    expiresAt: expiresAt
  };

  user.activityLogs.unshift({
    id: 'sub-app-' + Date.now(),
    type: 'bonus',
    title: 'Subscription Activated! 🎉',
    amount: 0,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Binuksan ng Admin ang iyong account para sa ${user.subscription.requestedPlanName}. Valid ang access mo hanggang sa ${new Date(expiresAt).toLocaleDateString('fil-PH', { month: 'long', day: 'numeric', year: 'numeric' })}.`
  });

  saveDB(db);
  res.json({ success: true, message: `Subscription ay matagumpay na inaprubahan.` });
});

// ADMIN DECLINE SUBSCRIPTION
app.post('/api/admin/subscription/:userId/decline', (req, res) => {
  const adminId = req.headers.authorization;
  const { userId } = req.params;

  if (!adminId) {
    return res.status(401).json({ error: 'Naka-loob lamang ito sa Admin.' });
  }

  const db = loadDB();
  const adminUser = db.users.find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Wala kang pahintulot na gawin ito.' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!user.subscription || user.subscription.status !== 'pending') {
    return res.status(400).json({ error: 'Walang nakabinbing subscription request ang user na ito.' });
  }

  const planName = user.subscription.requestedPlanName || 'Subscription';

  user.subscription = {
    status: 'none',
    planId: null,
    requestedPlanName: null,
    requestedAmount: null,
    requestedAt: null,
    expiresAt: null
  };

  user.activityLogs.unshift({
    id: 'sub-dec-' + Date.now(),
    type: 'bonus',
    title: 'Subscription Rejected ❌',
    amount: 0,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: `Ang iyong hiling para sa ${planName} ay tinanggihan ng admin. Mangyaring i-verify ang iyong de-posito o makipag-ugnayan sa Admin.`
  });

  saveDB(db);
  res.json({ success: true, message: `Subscription ay matagumpay na tinanggihan.` });
});

// SIMULATE TRIAL EXPIRATION FOR QUICK TESTING & DEMONSTRATION
app.post('/api/user/simulate-expire', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna.' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  // Set registration date back 2 days so they are past the 1-day free trial limit
  user.createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  // Reset active subscription so they gets trial-expired block
  user.subscription = {
    status: 'none',
    planId: null,
    requestedPlanName: null,
    requestedAmount: null,
    requestedAt: null,
    expiresAt: null
  };

  user.activityLogs.unshift({
    id: 'sim-expire-' + Date.now(),
    type: 'bonus',
    title: 'Simulated 1-Day Trial Expiration',
    amount: 0,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: 'Tinapos ang iyong 1-day free trial para sa mabilisang pagsusuri ng subscription features.'
  });

  saveDB(db);
  const { password: _, ...userSafe } = user as any;
  res.json({ user: userSafe });
});


// ============================================
//            VITE MIDDLEWARE SETUP
// ============================================

const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  console.log('🔄 Sini-synchronize ang database sa live Cloud Firestore...');
  await syncFromFirestore();

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 GCash Click-Earn running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
