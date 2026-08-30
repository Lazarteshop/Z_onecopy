import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import rawConfig from '../firebase-applet-config.json';

const fallbackConfig = {
  projectId: "feisty-listener-3d2jw",
  appId: "1:828078909829:web:ce668cbe71588119b33cec",
  apiKey: "AIzaSyCxS9Nt3GHIfo82RSuDEvzYrdJtpJSFTHk",
  authDomain: "feisty-listener-3d2jw.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-websiteviewerand-39fa42c9-2ddb-4a73-9de1-b8f9fc2b550c",
  storageBucket: "feisty-listener-3d2jw.firebasestorage.app",
  messagingSenderId: "828078909829"
};

const mergedConfig = {
  ...fallbackConfig,
  ...(rawConfig || {})
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  if (mergedConfig.apiKey && mergedConfig.projectId) {
    if (!getApps().length) {
      app = initializeApp(mergedConfig);
    } else {
      app = getApp();
    }

    if (app) {
      try {
        const dbId = mergedConfig.firestoreDatabaseId;
        db = dbId && dbId !== '(default)' && dbId !== 'default' 
          ? getFirestore(app, dbId) 
          : getFirestore(app);
      } catch (dbErr) {
        console.warn('⚠️ Firestore initialization fallback:', dbErr);
        try {
          db = getFirestore(app);
        } catch {}
      }

      try {
        auth = getAuth(app);
      } catch (authErr) {
        console.warn('⚠️ Firebase Auth initialization fallback:', authErr);
      }
    }
  }
} catch (err) {
  console.warn('⚠️ Firebase safe initialization caught error:', err);
}

export { app, db, auth };
export default app;
