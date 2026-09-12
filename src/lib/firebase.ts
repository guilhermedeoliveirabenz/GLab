import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  // Initialize firestore with the custom databaseId if specified and enable ignoreUndefinedProperties
  const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
  try {
    db = dbId
      ? initializeFirestore(app, { ignoreUndefinedProperties: true }, dbId)
      : initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    db = dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
  auth = getAuth(app);
} catch (error) {
  console.warn('Firebase initialization warning:', error);
  // Re-attempt with default
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (err2) {
    console.error('Fatal Firebase init failure, offline fallback will be active:', err2);
  }
}

export { app, db, auth };

