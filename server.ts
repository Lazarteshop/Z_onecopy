import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Firestore } from '@google-cloud/firestore';
import { INITIAL_CAMPAIGNS } from './src/data/campaigns';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// --- IN-MEMORY USER ONLINE STATUS TRACKING ---
const activeUsersMap: Record<string, number> = {};

app.use((req, res, next) => {
  const token = req.headers.authorization;
  if (token) {
    activeUsersMap[token] = Date.now();
  }
  next();
});

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
  isBanned?: boolean; // banned from Z-one or app
  zonedUsers?: string[]; // userIds followed/zoned
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

interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  text: string;
  createdAt: string;
}

interface ActiveCall {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  type: 'video' | 'voice';
  status: 'ringing' | 'accepted' | 'declined' | 'ended';
  createdAt: string;
  callerSignal?: string;
  receiverSignal?: string;
  callerCandidates?: string;
  receiverCandidates?: string;
}

interface DBStructure {
  users: UserSession[];
  campaigns?: any[];
  posts?: any[];
  directMessages?: DirectMessage[];
  activeCalls?: ActiveCall[];
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
      if (!loaded.campaigns || loaded.campaigns.length < INITIAL_CAMPAIGNS.length) {
        const existingIds = new Set(loaded.campaigns ? loaded.campaigns.map((c: any) => c.id) : []);
        const newCampaignsToAdd = INITIAL_CAMPAIGNS.filter(c => !existingIds.has(c.id));
        loaded.campaigns = [...(loaded.campaigns || []), ...newCampaignsToAdd];
        try {
          fs.writeFileSync(DB_FILE_PATH, JSON.stringify(loaded, null, 2));
        } catch (writeErr) {
          console.error('Failed to write back updated campaigns to db.json', writeErr);
        }
      }
      if (!loaded.posts) {
        loaded.posts = [
          {
            id: 'post-welcome',
            userId: 'admin-rosco',
            userName: 'System Administrator',
            userAvatar: '👑',
            text: 'Welcome sa Z-one! Ang pinakabagong social media portal kung saan pwede kayong mag-post, mag-like, mag-comment, at mag-Zone (Follow) sa bawat isa. Iwasan po natin ang bastos/pornographic na content at bad words upang maiwasan ang ma-banned. Happy Click-Earning!',
            mediaUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&auto=format&fit=crop&q=60',
            mediaType: 'image',
            likes: [],
            comments: [
              {
                id: 'comment-seed-1',
                userId: 'user-juan',
                userName: 'Juan Dela Cruz',
                userAvatar: '👨‍💻',
                text: 'Wow, napakagandang platform naman nito! Salamat admin!',
                createdAt: new Date(Date.now() - 3600000).toISOString()
              }
            ],
            createdAt: new Date(Date.now() - 7200000).toISOString()
          }
        ];
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
    posts: [
      {
        id: 'post-welcome',
        userId: 'admin-rosco',
        userName: 'System Administrator',
        userAvatar: '👑',
        text: 'Welcome sa Z-one! Ang pinakabagong social media portal kung saan pwede kayong mag-post, mag-like, mag-comment, at mag-Zone (Follow) sa bawat isa. Iwasan po natin ang bastos/pornographic na content at bad words upang maiwasan ang ma-banned. Happy Click-Earning!',
        mediaUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&auto=format&fit=crop&q=60',
        mediaType: 'image',
        likes: [],
        comments: [
          {
            id: 'comment-seed-1',
            userId: 'user-juan',
            userName: 'Juan Dela Cruz',
            userAvatar: '👨‍💻',
            text: 'Wow, napakagandang platform naman nito! Salamat admin!',
            createdAt: new Date(Date.now() - 3600000).toISOString()
          }
        ],
        createdAt: new Date(Date.now() - 7200000).toISOString()
      }
    ],
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
      try {
        const uDocRef = firestore.collection('users').doc(u.id);
        const { id, ...uWithoutId } = u;
        // Safeguard Firestore 1MB limit for user documents by replacing huge base64 avatars with a standard emoji
        if (uWithoutId.avatar && uWithoutId.avatar.startsWith('data:') && uWithoutId.avatar.length > 500000) {
          uWithoutId.avatar = '👤';
        }
        await uDocRef.set(uWithoutId);
      } catch (userErr) {
        console.error(`Error saving user ${u.id} to Firestore:`, userErr);
      }
    });

    let campPromises: Promise<any>[] = [];
    if (data.campaigns) {
      campPromises = data.campaigns.map(async (c) => {
        try {
          const cDocRef = firestore.collection('campaigns').doc(c.id);
          const { id, ...cWithoutId } = c;
          await cDocRef.set(cWithoutId);
        } catch (campErr) {
          console.error(`Error saving campaign ${c.id} to Firestore:`, campErr);
        }
      });
    }

    let postPromises: Promise<any>[] = [];
    if (data.posts) {
      postPromises = data.posts.map(async (p) => {
        try {
          const pDocRef = firestore.collection('posts').doc(p.id);
          const { id, ...pWithoutId } = p;
          // Safeguard Firestore 1MB limit for posts by replacing huge base64 media with a standard placeholder
          if (pWithoutId.mediaUrl && pWithoutId.mediaUrl.startsWith('data:') && pWithoutId.mediaUrl.length > 500000) {
            if (pWithoutId.mediaType === 'video') {
              pWithoutId.mediaUrl = 'https://assets.mixkit.co/videos/preview/mixkit-holding-a-smartphone-with-a-green-screen-34440-large.mp4';
            } else {
              pWithoutId.mediaUrl = 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&auto=format&fit=crop&q=60';
            }
          }
          await pDocRef.set(pWithoutId);
        } catch (postErr) {
          console.error(`Error saving post ${p.id} to Firestore:`, postErr);
        }
      });
    }

    let dmPromises: Promise<any>[] = [];
    if (data.directMessages) {
      dmPromises = data.directMessages.map(async (dm) => {
        try {
          const dmDocRef = firestore.collection('direct_messages').doc(dm.id);
          const { id, ...dmWithoutId } = dm;
          await dmDocRef.set(dmWithoutId);
        } catch (dmErr) {
          console.error(`Error saving DM ${dm.id} to Firestore:`, dmErr);
        }
      });
    }

    await Promise.all([...batchValues, ...campPromises, ...postPromises, ...dmPromises]);
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

    const postsColRef = firestore.collection('posts');
    const pSnapshot = await postsColRef.get();
    const dbPosts: any[] = [];
    pSnapshot.forEach((docSnap) => {
      dbPosts.push({ id: docSnap.id, ...docSnap.data() });
    });

    const dmColRef = firestore.collection('direct_messages');
    let dbDMs: any[] = [];
    try {
      const dmSnapshot = await dmColRef.get();
      dmSnapshot.forEach((docSnap) => {
        dbDMs.push({ id: docSnap.id, ...docSnap.data() });
      });
    } catch (e) {
      console.log('No direct_messages collection yet in Firestore');
    }

    if (dbUsers.length > 0) {
      console.log(`📱 Found ${dbUsers.length} users in Firestore. Overwriting local cache...`);
      const loadedDB: DBStructure = { 
        users: dbUsers,
        campaigns: dbCampaigns.length > 0 ? dbCampaigns : INITIAL_CAMPAIGNS,
        posts: dbPosts.length > 0 ? dbPosts : undefined,
        directMessages: dbDMs.length > 0 ? dbDMs : undefined
      };
      
      // Update/synchronize admin details if needed
      const admin = loadedDB.users.find(u => u.isAdmin);
      if (admin) {
        admin.email = envAdminEmail;
        admin.password = envAdminPassword;
        admin.name = envAdminName;
      }
      if (!loadedDB.posts) {
        const temp = loadDB();
        loadedDB.posts = temp.posts;
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

      let seedPostPromises: Promise<any>[] = [];
      if (localDB.posts) {
        seedPostPromises = localDB.posts.map(async (p) => {
          const pDocRef = firestore.collection('posts').doc(p.id);
          const { id, ...pWithoutId } = p;
          await pDocRef.set(pWithoutId);
        });
      }

      let seedDmPromises: Promise<any>[] = [];
      if (localDB.directMessages) {
        seedDmPromises = localDB.directMessages.map(async (dm) => {
          const dmDocRef = firestore.collection('direct_messages').doc(dm.id);
          const { id, ...dmWithoutId } = dm;
          await dmDocRef.set(dmWithoutId);
        });
      }

      await Promise.all([...batchPromises, ...seedCampPromises, ...seedPostPromises, ...seedDmPromises]);
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

  if (user.isBanned) {
    return res.status(403).json({ error: '🔴 Ang iyong account ay banned ng administrator dahil sa paglabag sa Community Rules ng Z-one.' });
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

// UPDATE USER PROFILE PIC / DETAILS
app.post('/api/user/update-profile', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna.' });
  }

  const { avatar, name } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang gumagamit.' });
  }

  if (avatar) {
    user.avatar = avatar;
  }
  if (name && name.trim()) {
    user.name = name.trim();
  }

  // Also update all posts of this user with the new avatar and name
  if (db.posts) {
    db.posts.forEach(p => {
      if (p.userId === userId) {
        if (avatar) p.userAvatar = avatar;
        if (name) p.userName = name.trim();
      }
      // Also comments
      if (p.comments) {
        p.comments.forEach(c => {
          if (c.userId === userId) {
            if (avatar) c.userAvatar = avatar;
            if (name) c.userName = name.trim();
          }
        });
      }
    });
  }

  saveDB(db);
  const { password: _, ...userSafe } = user as any;
  res.json({ success: true, user: userSafe, message: 'Matagumpay na na-update ang iyong profile!' });
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
    withdrawals: u.withdrawals,
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


// ============================================
//            Z-ONE SOCIAL PLATFORM APIs
// ============================================

const PROHIBITED_PORN_WORDS = [
  "porn", "pornography", "sex", "nude", "naked", "bold", "x-rated", "pussy", "dick", "tits", "suso", "kantutan", "kantot", "puke", "titi", "pepe", "pekpek", "bastos"
];

const SWEAR_WORDS = [
  "gago", "putangina", "tangina", "putang ina", "tang ina", "pukinangina", "tarantado", "ulol", "pakyaw", "pakyu", "fuck", "shit", "bitch", "asshole"
];

function containsInappropriateContent(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return PROHIBITED_PORN_WORDS.some(word => lower.includes(word));
}

function filterSwearWords(text: string): string {
  if (!text) return text;
  let filtered = text;
  for (const word of SWEAR_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  }
  return filtered;
}

// Check if user is banned helper
function isUserBanned(db: DBStructure, userId: string): boolean {
  const user = db.users.find(u => u.id === userId);
  return !!(user && user.isBanned);
}

// GET REAL-TIME NETFLIX FEED FROM OFFICIAL YOUTUBE RSS
app.get('/api/zone/netflix', async (req, res) => {
  try {
    const response = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=UCWOA1ZGywLkidgaeLD_5v3g');
    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube RSS feed: ${response.statusText}`);
    }
    const xmlText = await response.text();

    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const entries: any[] = [];
    let match;

    while ((match = entryRegex.exec(xmlText)) !== null) {
      const entryContent = match[1];

      // Extract video ID
      const videoIdMatch = entryContent.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || entryContent.match(/<id>yt:video:(.*?)<\/id>/);
      const videoId = videoIdMatch ? videoIdMatch[1].trim() : '';

      // Extract title
      const titleMatch = entryContent.match(/<title>(.*?)<\/title>/);
      let title = titleMatch ? titleMatch[1].trim() : '';
      title = title
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");

      // Extract description
      const descMatch = entryContent.match(/<media:description>([\s\S]*?)<\/media:description>/) || entryContent.match(/<summary>([\s\S]*?)<\/summary>/);
      let description = descMatch ? descMatch[1].trim() : 'No description available.';
      description = description
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");

      if (description.length > 200) {
        description = description.substring(0, 197) + '...';
      }

      // Extract published date
      const publishedMatch = entryContent.match(/<published>(.*?)<\/published>/);
      const publishedDateStr = publishedMatch ? publishedMatch[1].trim() : new Date().toISOString();
      const publishedDate = new Date(publishedDateStr);
      const formattedDate = publishedDate.toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' });

      // Extract thumbnail
      const thumbnailMatch = entryContent.match(/<media:thumbnail[^>]*url=["'](.*?)["']/);
      const thumbnail = thumbnailMatch ? thumbnailMatch[1].trim() : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      // Formulate metadata categories dynamically based on title keywords
      let category = 'NETFLIX PREMIUM';
      let badgeColor = 'bg-rose-950 text-rose-300 border-rose-900';
      const upperTitle = title.toUpperCase();
      if (upperTitle.includes('TRAILER')) {
        category = 'OFFICIAL TRAILER';
        badgeColor = 'bg-rose-950/80 text-rose-300 border-rose-800';
      } else if (upperTitle.includes('TEASER')) {
        category = 'OFFICIAL TEASER';
        badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-800';
      } else if (upperTitle.includes('CLIP') || upperTitle.includes('SCENE')) {
        category = 'EXCLUSIVE CLIP';
        badgeColor = 'bg-indigo-950/80 text-indigo-300 border-indigo-800';
      } else if (upperTitle.includes('ANNOUNCEMENT') || upperTitle.includes('REVEAL')) {
        category = 'ANNOUNCEMENT';
        badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      } else if (upperTitle.includes('SEASON') || upperTitle.includes('EPISODE')) {
        category = 'SERIES REVEAL';
        badgeColor = 'bg-sky-950/80 text-sky-300 border-sky-800';
      }

      const duration = (2 + (title.length % 3)) + ':' + String(10 + (title.length % 50)).padStart(2, '0');
      const likesCount = ((title.length * 7) % 50) + 1.2;
      const likes = likesCount.toFixed(1) + 'M';

      const tags = ['netflix', 'trailers'];
      if (upperTitle.includes('SQUID') || upperTitle.includes('GAME')) tags.push('squidgame');
      if (upperTitle.includes('WEDNESDAY')) tags.push('wednesday');
      if (upperTitle.includes('STRANGER')) tags.push('strangerthings');
      if (upperTitle.includes('COBRA')) tags.push('cobrakai');
      if (upperTitle.includes('ANIME')) tags.push('anime');
      if (tags.length < 3) tags.push('newrelease');

      if (videoId && title) {
        entries.push({
          id: videoId,
          title,
          category,
          badgeColor,
          source: 'Netflix YouTube Feed',
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          image: thumbnail,
          duration,
          likes,
          description,
          tags,
          date: formattedDate
        });
      }
    }

    if (entries.length === 0) {
      throw new Error('No valid entries parsed from RSS feed.');
    }

    res.json({ success: true, videos: entries });
  } catch (err: any) {
    console.error('Error fetching/parsing Netflix RSS feed, falling back to curated list:', err);
    res.json({ 
      success: false, 
      message: 'Failed to fetch live feed, loaded cached list.',
      videos: [
        {
          id: 'pSSTXbWpUjg',
          title: 'Squid Game | Season 2 Official Teaser | Netflix',
          category: 'OFFICIAL TEASER',
          badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-800',
          source: 'Netflix International',
          embedUrl: 'https://www.youtube.com/embed/pSSTXbWpUjg',
          youtubeUrl: 'https://www.youtube.com/watch?v=pSSTXbWpUjg',
          image: 'https://img.youtube.com/vi/pSSTXbWpUjg/maxresdefault.jpg',
          duration: '2:15',
          likes: '4.8M',
          description: 'The game never stops. Three years after winning Squid Game, Player 456 remains determined to find the people behind the game and put an end to their vicious sport.',
          tags: ['squidgame', 'netflix', 'teaser'],
          date: 'Jun 26, 2026'
        },
        {
          id: '3SAnTf2q0Gg',
          title: 'Wednesday Season 2 | Back in Production | Netflix',
          category: 'ANNOUNCEMENT',
          badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
          source: 'Netflix International',
          embedUrl: 'https://www.youtube.com/embed/3SAnTf2q0Gg',
          youtubeUrl: 'https://www.youtube.com/watch?v=3SAnTf2q0Gg',
          image: 'https://img.youtube.com/vi/3SAnTf2q0Gg/maxresdefault.jpg',
          duration: '1:48',
          likes: '3.2M',
          description: 'More mayhem, mystery and murder. Wednesday Addams is returning to Nevermore Academy with new mysteries, new characters, and her signature dark charm.',
          tags: ['wednesday', 'netflix', 'mystery'],
          date: 'May 15, 2026'
        },
        {
          id: 'fD_0Nre31m4',
          title: 'Stranger Things 5 | The Final Season Episode Titles | Netflix',
          category: 'SERIES REVEAL',
          badgeColor: 'bg-sky-950/80 text-sky-300 border-sky-800',
          source: 'Netflix International',
          embedUrl: 'https://www.youtube.com/embed/fD_0Nre31m4',
          youtubeUrl: 'https://www.youtube.com/watch?v=fD_0Nre31m4',
          image: 'https://img.youtube.com/vi/fD_0Nre31m4/maxresdefault.jpg',
          duration: '1:55',
          likes: '5.1M',
          description: 'The final adventure begins. In the fall of 1987, one last adventure begins as Hawkins faces the ultimate threat from the Upside Down. Stream the epic conclusion.',
          tags: ['strangerthings', 'netflix', 'scifi'],
          date: 'Apr 10, 2026'
        },
        {
          id: '4S37f8Z_Yc4',
          title: 'One Piece Season 2 | Cast Read-Through & Behind The Scenes | Netflix',
          category: 'EXCLUSIVE CLIP',
          badgeColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-800',
          source: 'Netflix Anime',
          embedUrl: 'https://www.youtube.com/embed/4S37f8Z_Yc4',
          youtubeUrl: 'https://www.youtube.com/watch?v=4S37f8Z_Yc4',
          image: 'https://img.youtube.com/vi/4S37f8Z_Yc4/maxresdefault.jpg',
          duration: '2:05',
          likes: '2.5M',
          description: 'The Straw Hat Pirates head to the Grand Line! Luffy, Zoro, Nami, Usopp, and Sanji are ready for new adventures, dangerous seas, and legendary enemies.',
          tags: ['onepiece', 'netflix', 'anime'],
          date: 'Mar 2, 2026'
        }
      ]
    });
  }
});

// DYNAMIC LIVE TV STREAM PARSER FROM PUBLIC REPOSITORIES
app.get('/api/zone/livetv', async (req, res) => {
  try {
    const response = await fetch('https://raw.githubusercontent.com/iptv-org/iptv/gh-pages/countries/ph.m3u');
    if (!response.ok) {
      throw new Error(`Failed to fetch ph.m3u: ${response.statusText}`);
    }
    const m3uText = await response.text();
    
    const lines = m3uText.split('\n');
    const channels: any[] = [];
    let currentChannel: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#EXTINF:')) {
        // Parse metadata from EXTINF
        const infoPart = line.substring(8);
        const commaIndex = infoPart.lastIndexOf(',');
        let name = commaIndex !== -1 ? infoPart.substring(commaIndex + 1).trim() : 'Unknown Channel';
        
        // Parse attributes
        const idMatch = infoPart.match(/tvg-id="([^"]+)"/);
        const logoMatch = infoPart.match(/tvg-logo="([^"]+)"/);
        const groupMatch = infoPart.match(/group-title="([^"]+)"/);

        // Standardize clean name
        const id = idMatch ? idMatch[1] : `stream-${Math.random().toString(36).substr(2, 9)}`;
        const logoUrl = logoMatch ? logoMatch[1] : '';
        const rawGroup = groupMatch ? groupMatch[1] : 'Philippines TV';
        
        // Better clean name (remove parentheses with quality or specs)
        name = name.replace(/\s*\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

        // Assign nice emojis depending on content
        let emoji = '📺';
        if (name.toLowerCase().includes('news') || rawGroup.toLowerCase().includes('news')) emoji = '📰';
        else if (name.toLowerCase().includes('sport') || rawGroup.toLowerCase().includes('sport')) emoji = '⚽';
        else if (name.toLowerCase().includes('hope') || name.toLowerCase().includes('faith') || rawGroup.toLowerCase().includes('religious')) emoji = '✝️';
        else if (name.toLowerCase().includes('anime') || name.toLowerCase().includes('blast') || name.toLowerCase().includes('kids')) emoji = '🎮';
        else if (name.toLowerCase().includes('music') || name.toLowerCase().includes('radio')) emoji = '🎵';
        else if (name.toLowerCase().includes('business') || name.toLowerCase().includes('bilyonaryo')) emoji = '💼';

        currentChannel = {
          id,
          name,
          network: rawGroup || 'Local Stream',
          logo: emoji,
          url: '', // set next line
          description: `Live streaming feed for ${name} from public IPTV repository.`
        };
      } else if (line.startsWith('http://') || line.startsWith('https://')) {
        if (currentChannel) {
          currentChannel.url = line;
          // Filter out streams that don't look like HLS
          const isHls = line.includes('.m3u8') || line.includes('/playlist') || line.includes('.m3u') || line.includes('/stream');
          if (isHls) {
            channels.push(currentChannel);
          }
          currentChannel = null;
        }
      }
    }

    // Sort channels by name so they look neat
    channels.sort((a, b) => a.name.localeCompare(b.name));

    // Ensure we have a unique list by url
    const uniqueChannelsMap = new Map();
    for (const ch of channels) {
      uniqueChannelsMap.set(ch.url, ch);
    }
    const uniqueChannels = Array.from(uniqueChannelsMap.values());

    res.json({ success: true, channels: uniqueChannels });
  } catch (err: any) {
    console.error('Error fetching dynamic IPTV M3U, returning curated static streams instead:', err);
    // In case of error/offline/CORS/network block, we return the curated fallback list
    res.json({ 
      success: false, 
      message: 'Unable to reach live registry. Fallback channels loaded.',
      channels: [
        {
          id: 'stream-cltv36',
          name: 'CLTV 36 (Central Luzon TV) - News & Lifestyle',
          network: 'CLTV 36 Regional',
          logo: '📡',
          url: 'https://live.cltv36.tv:5443/LiveApp/streams/cltvlive.m3u8',
          description: 'Sundan ang mga pinakabagong balita, kaganapan, kultura, at pamumuhay sa buong Pampanga at Gitnang Luzon.'
        },
        {
          id: 'stream-abantetv',
          name: 'Abante TV - National News & Talks',
          network: 'Abante TV',
          logo: '📰',
          url: 'https://amg19223-amg19223c12-amgplt0352.playout.now3.amagi.tv/playlist/amg19223-amg19223c12-amgplt0352/playlist.m3u8',
          description: 'Live na balitaan, talakayan sa maiinit na isyu, at pampublikong serbisyo mula sa Abante Tonite network.'
        },
        {
          id: 'stream-hope',
          name: 'Hope Channel Philippines - Family & Faith',
          network: 'Hope Channel',
          logo: '✝️',
          url: 'https://jstre.am/live/jsl:7A1swL7Fhlh.m3u8',
          description: 'Pampamilyang palabas na naghahatid ng inspirasyon, kalusugan, pamumuhay, at turo ng Salita ng Diyos.'
        },
        {
          id: 'stream-bilyonaryo',
          name: 'Bilyonaryo News Channel (BNC) - Finance & Business',
          network: 'Bilyonaryo News',
          logo: '💼',
          url: 'https://amg19223-amg19223c11-amgplt0352.playout.now3.amagi.tv/playlist/amg19223-amg19223c11-amgplt0352/playlist.m3u8',
          description: 'Ang nangungunang premium na balitang pangnegosyo, pananalapi, ekonomiya, at pambansang balitaan sa bansa.'
        },
        {
          id: 'stream-premier',
          name: 'Premier Sports Channel',
          network: 'Premier Sports',
          logo: '⚽',
          url: 'https://amg19223-amg19223c3-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c3-amgplt0351/playlist.m3u8',
          description: 'Panoorin ang pinakapaboritong laro sa basketball, football, tennis, at combat sports ng live.'
        },
        {
          id: 'stream-premier2',
          name: 'Premier Sports 2 Channel',
          network: 'Premier Sports 2',
          logo: '🏎️',
          url: 'https://amg19223-amg19223c4-amgplt0351.playout.now3.amagi.tv/playlist/amg19223-amg19223c4-amgplt0351/playlist.m3u8',
          description: 'Karagdagang live sports coverage tulad ng motorsport, athletics, at combat championships.'
        },
        {
          id: 'stream-aniblast',
          name: 'Ani-Blast Channel',
          network: 'Ani-Blast',
          logo: '🎮',
          url: 'https://amg19223-amg19223c9-amgplt0019.playout.now3.amagi.tv/playlist/amg19223-amg19223c9-amgplt0019/playlist.m3u8',
          description: 'I-enjoy ang pinakamahusay na mga localized anime series na dinala sa wikang Filipino/Tagalog.'
        }
      ]
    });
  }
});

// GET ONLINE USER IDS
app.get('/api/zone/online', (req, res) => {
  const now = Date.now();
  // Gather users active in the last 60 seconds (generous window for heartbeats/polling)
  const onlineIds = Object.keys(activeUsersMap).filter(id => now - activeUsersMap[id] < 60000);
  
  // Always include admin-rosco and user-juan as online mock users for visual reference
  if (!onlineIds.includes('admin-rosco')) {
    onlineIds.push('admin-rosco');
  }
  if (!onlineIds.includes('user-juan')) {
    onlineIds.push('user-juan');
  }
  
  // Keep user-clara as offline (unless she is logged in and active), so they see red dot!
  res.json({ onlineUserIds: onlineIds });
});

// 1. GET ALL POSTS
app.get('/api/zone/posts', (req, res) => {
  const db = loadDB();
  const posts = db.posts || [];
  const userId = req.headers.authorization;

  // Sort posts: always newest first
  const sortedPosts = [...posts].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  res.json({ posts: sortedPosts });
});

// 2. CREATE A NEW POST
app.post('/api/zone/posts', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna upang makapag-post.' });
  }

  const { text, mediaUrl, mediaType } = req.body;
  const db = loadDB();

  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Ang iyong account ay banned sa system. Hindi ka pwedeng mag-post.' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  // Auto-delete / Reject inappropriate posts (porn, nude, bastos)
  const isBase64Media = mediaUrl && (mediaUrl.startsWith('data:') || mediaUrl.startsWith('blob:'));
  const isMediaInappropriate = mediaUrl && !isBase64Media && containsInappropriateContent(mediaUrl);

  if (containsInappropriateContent(text) || isMediaInappropriate) {
    return res.status(400).json({ 
      error: '⚠️ [AUTO-DELETE]: Ang post na ito ay hinarang at hindi inilathala dahil naglalaman ito ng malalaswang salita o pornographic content (Nude/Porn content are strictly forbidden!).' 
    });
  }

  // Clean swear words
  const cleanedText = filterSwearWords(text);

  const newPost = {
    id: 'post-' + Date.now(),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar || '👤',
    text: cleanedText,
    mediaUrl: mediaUrl || undefined,
    mediaType: mediaType || undefined,
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  };

  if (!db.posts) {
    db.posts = [];
  }
  db.posts.push(newPost);
  saveDB(db);

  res.json({ success: true, post: newPost, message: 'Matagumpay na na-post sa Z-one!' });
});

// 3. TOGGLE LIKE
app.post('/api/zone/posts/:postId/like', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login upang mag-like.' });
  }

  const { postId } = req.params;
  const db = loadDB();

  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Banned ka sa Z-one.' });
  }

  if (!db.posts) db.posts = [];
  const post = db.posts.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Hindi mahanap ang post.' });
  }

  const likeIndex = post.likes.indexOf(userId);
  if (likeIndex > -1) {
    post.likes.splice(likeIndex, 1); // Unlike
  } else {
    post.likes.push(userId); // Like
  }

  saveDB(db);
  res.json({ success: true, likes: post.likes });
});

// 4. POST COMMENT
app.post('/api/zone/posts/:postId/comment', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login upang mag-comment.' });
  }

  const { postId } = req.params;
  const { text } = req.body;
  const db = loadDB();

  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Banned ka sa Z-one.' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Walang nilalaman ang iyong comment.' });
  }

  if (containsInappropriateContent(text)) {
    return res.status(400).json({ 
      error: '⚠️ [AUTO-DELETE COMMENT]: Hinarang ang iyong comment dahil naglalaman ito ng bastos o malalaswang salita.' 
    });
  }

  const cleanedComment = filterSwearWords(text);

  if (!db.posts) db.posts = [];
  const post = db.posts.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Hindi mahanap ang post.' });
  }

  const newComment = {
    id: 'comment-' + Date.now(),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar || '👤',
    text: cleanedComment,
    createdAt: new Date().toISOString()
  };

  post.comments.push(newComment);
  saveDB(db);

  res.json({ success: true, comments: post.comments });
});

// 4b. SHARE POST
app.post('/api/zone/posts/:postId/share', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna upang makapag-share.' });
  }

  const { postId } = req.params;
  const { text } = req.body; // Optional text caption when sharing
  const db = loadDB();

  if (isUserBanned(db, userId)) {
    return res.status(403).json({ error: 'Banned ka sa Z-one.' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!db.posts) db.posts = [];
  const originalPost = db.posts.find(p => p.id === postId);
  if (!originalPost) {
    return res.status(404).json({ error: 'Hindi mahanap ang post na ishe-share.' });
  }

  // Auto-delete / Reject inappropriate captions
  const cleanedText = text ? filterSwearWords(text) : '';
  if (text && containsInappropriateContent(text)) {
    return res.status(400).json({ 
      error: '⚠️ [AUTO-DELETE]: Ang share caption ay hinarang dahil naglalaman ito ng malalaswang salita.' 
    });
  }

  // Create new post representing the share
  const newPost = {
    id: 'post-' + Date.now(),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar || '👤',
    text: cleanedText,
    likes: [],
    comments: [],
    createdAt: new Date().toISOString(),
    sharedPost: {
      id: originalPost.sharedPost ? originalPost.sharedPost.id : originalPost.id,
      userId: originalPost.sharedPost ? originalPost.sharedPost.userId : originalPost.userId,
      userName: originalPost.sharedPost ? originalPost.sharedPost.userName : originalPost.userName,
      userAvatar: originalPost.sharedPost ? originalPost.sharedPost.userAvatar : originalPost.userAvatar,
      text: originalPost.sharedPost ? originalPost.sharedPost.text : originalPost.text,
      mediaUrl: originalPost.sharedPost ? originalPost.sharedPost.mediaUrl : originalPost.mediaUrl,
      mediaType: originalPost.sharedPost ? originalPost.sharedPost.mediaType : originalPost.mediaType,
      createdAt: originalPost.sharedPost ? originalPost.sharedPost.createdAt : originalPost.createdAt
    }
  };

  db.posts.push(newPost);
  saveDB(db);

  res.json({ success: true, post: newPost, message: 'Matagumpay na na-share ang post!' });
});

// 5. TOGGLE ZONE (FOLLOW)
app.post('/api/zone/users/:targetUserId/toggle-zone', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Mag-login muna.' });
  }

  const { targetUserId } = req.params;
  if (userId === targetUserId) {
    return res.status(400).json({ error: 'Hindi mo pwedeng i-Zone ang iyong sarili!' });
  }

  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  const targetUser = db.users.find(u => u.id === targetUserId);

  if (!user || !targetUser) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  if (!user.zonedUsers) {
    user.zonedUsers = [];
  }

  const zonedIndex = user.zonedUsers.indexOf(targetUserId);
  let isZoned = false;
  if (zonedIndex > -1) {
    user.zonedUsers.splice(zonedIndex, 1); // Unzone
  } else {
    user.zonedUsers.push(targetUserId); // Zone
    isZoned = true;
  }

  saveDB(db);
  res.json({ success: true, isZoned, zonedUsersCount: user.zonedUsers.length, zonedUsers: user.zonedUsers });
});

// 6. ADMIN GET ALL USERS FOR MODERATION
app.get('/api/admin/moderation/users', (req, res) => {
  const adminId = req.headers.authorization;
  if (!adminId) {
    return res.status(401).json({ error: 'Admin access required.' });
  }

  const db = loadDB();
  const adminUser = db.users.find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Wala kang pahintulot na tingnan ito.' });
  }

  const safeUsers = db.users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    isBanned: !!u.isBanned,
    isAdmin: !!u.isAdmin,
    createdAt: u.createdAt,
    zonedUsersCount: (u.zonedUsers || []).length
  }));

  res.json({ users: safeUsers });
});

// 7. ADMIN BAN/UNBAN USER
app.post('/api/admin/moderation/users/:userId/toggle-ban', (req, res) => {
  const adminId = req.headers.authorization;
  if (!adminId) {
    return res.status(401).json({ error: 'Admin access required.' });
  }

  const { userId } = req.params;
  const db = loadDB();
  const adminUser = db.users.find(u => u.id === adminId && u.isAdmin);
  if (!adminUser) {
    return res.status(403).json({ error: 'Wala kang pahintulot na gawin ito.' });
  }

  if (userId === adminId) {
    return res.status(400).json({ error: 'Hindi mo pwedeng i-ban ang iyong sarili.' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Hindi mahanap ang user.' });
  }

  user.isBanned = !user.isBanned;

  if (!user.activityLogs) {
    user.activityLogs = [];
  }

  // Add notification inside user activity log
  user.activityLogs.unshift({
    id: 'ban-toggle-' + Date.now(),
    type: 'bonus',
    title: user.isBanned ? '🔴 ACCOUNT BANNED' : '🟢 ACCOUNT UNBANNED',
    amount: 0,
    timestamp: new Date().toLocaleString('fil-PH', { hour12: true }),
    details: user.isBanned 
      ? 'Ika-banned ng administrator ang iyong account dahil sa paglabag sa Community Rules ng Z-one.'
      : 'Binawi ng administrator ang pagka-ban sa iyong account. Sumunod po tayo sa community rules.'
  });

  saveDB(db);
  res.json({ success: true, isBanned: user.isBanned, message: `Matagumpay na ${user.isBanned ? 'banned' : 'unbanned'} ang user.` });
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
//       Z-ONE SOCIAL DMs & CALLS API
// ============================================

// 1. GET ALL MY DIRECT MESSAGES
app.get('/api/zone/messages', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }
  const db = loadDB();
  const messages = db.directMessages || [];
  const myMessages = messages.filter(m => m.senderId === userId || m.receiverId === userId);
  res.json({ messages: myMessages });
});

// 2. SEND A DIRECT MESSAGE
app.post('/api/zone/messages', (req, res) => {
  const senderId = req.headers.authorization;
  if (!senderId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }
  const { receiverId, text } = req.body;
  if (!receiverId || !text || !text.trim()) {
    return res.status(400).json({ error: 'Kinakailangan ang receiver at mensahe.' });
  }

  const db = loadDB();
  const sender = db.users.find(u => u.id === senderId);
  const receiver = db.users.find(u => u.id === receiverId);

  if (!sender || !receiver) {
    return res.status(404).json({ error: 'Hindi mahanap ang sender o receiver.' });
  }

  if (isUserBanned(db, senderId)) {
    return res.status(403).json({ error: 'Ang iyong account ay banned sa system.' });
  }

  const filteredText = filterSwearWords(text);

  const newMsg: DirectMessage = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    senderId,
    senderName: sender.name,
    senderAvatar: sender.avatar,
    receiverId,
    receiverName: receiver.name,
    receiverAvatar: receiver.avatar,
    text: filteredText,
    createdAt: new Date().toISOString()
  };

  if (!db.directMessages) {
    db.directMessages = [];
  }
  db.directMessages.push(newMsg);
  saveDB(db);

  res.json({ success: true, message: newMsg });
});

// 3. GET ACTIVE CALLS FOR USER (POLLING)
app.get('/api/zone/calls', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }
  const db = loadDB();
  const activeCalls = db.activeCalls || [];
  // Filter active calling/ringing/accepted sessions in the last 60 seconds
  const myCalls = activeCalls.filter(c => 
    (c.callerId === userId || c.receiverId === userId) && 
    c.status !== 'ended' && 
    c.status !== 'declined' &&
    (Date.now() - new Date(c.createdAt).getTime() < 60000)
  );
  res.json({ calls: myCalls });
});

// 4. INITIATE OR UPDATE CALL SESSION STATE
app.post('/api/zone/calls', (req, res) => {
  const callerId = req.headers.authorization;
  if (!callerId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }
  const { receiverId, type, status, callId } = req.body;
  const db = loadDB();

  if (!db.activeCalls) {
    db.activeCalls = [];
  }

  if (callId) {
    const call = db.activeCalls.find(c => c.id === callId);
    if (call) {
      if (status) call.status = status;
      if (req.body.callerSignal) call.callerSignal = req.body.callerSignal;
      if (req.body.receiverSignal) call.receiverSignal = req.body.receiverSignal;
      if (req.body.callerCandidates) call.callerCandidates = req.body.callerCandidates;
      if (req.body.receiverCandidates) call.receiverCandidates = req.body.receiverCandidates;
      saveDB(db);
      return res.json({ success: true, call });
    }
    return res.status(404).json({ error: 'Hindi mahanap ang call session.' });
  }

  if (!receiverId) {
    return res.status(400).json({ error: 'Kinakailangan ang receiverId.' });
  }

  const caller = db.users.find(u => u.id === callerId);
  const receiver = db.users.find(u => u.id === receiverId);

  if (!caller || !receiver) {
    return res.status(404).json({ error: 'Hindi mahanap ang users.' });
  }

  // Filter out and end existing calling session between these users
  db.activeCalls = db.activeCalls.filter(c => 
    !(c.callerId === callerId && c.receiverId === receiverId) &&
    !(c.callerId === receiverId && c.receiverId === callerId)
  );

  const newCall: ActiveCall = {
    id: 'call-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    callerId,
    callerName: caller.name,
    callerAvatar: caller.avatar,
    receiverId,
    receiverName: receiver.name,
    receiverAvatar: receiver.avatar,
    type: type || 'voice',
    status: 'ringing',
    createdAt: new Date().toISOString()
  };

  db.activeCalls.push(newCall);
  saveDB(db);

  res.json({ success: true, call: newCall });
});

// 5. END ACTIVE CALL SESSION
app.post('/api/zone/calls/end', (req, res) => {
  const userId = req.headers.authorization;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }
  const { callId } = req.body;
  const db = loadDB();
  if (db.activeCalls) {
    const call = db.activeCalls.find(c => c.id === callId);
    if (call) {
      call.status = 'ended';
      saveDB(db);
      return res.json({ success: true });
    }
  }
  res.json({ success: false, message: 'Wala nang active call session.' });
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
