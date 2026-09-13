import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  setLogLevel,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

// Suppress internal Firestore watch stream reconnect noise so transient reconnect probes are handled cleanly
try {
  setLogLevel('silent');
} catch {
  // Ignore in case setLogLevel is unsupported in environment
}

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
  const firestoreSettings = {
    ignoreUndefinedProperties: true,
    experimentalAutoDetectLongPolling: true,
  };

  try {
    db = dbId
      ? initializeFirestore(app, firestoreSettings, dbId)
      : initializeFirestore(app, firestoreSettings);
  } catch {
    db = dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
  auth = getAuth(app);
} catch (error) {
  console.warn('Firebase initialization warning:', error);
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (err2) {
    console.error('Fatal Firebase init failure, offline fallback will be active:', err2);
  }
}

// Proactive validation as required by Firestore integration standards
async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Cliente operando em modo offline / aguardando reconexão.');
    }
  }
}

testConnection();

export { app, db, auth };

