import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import backupConfig from "../../firebase-applet-config.json";

const metaEnv = (import.meta as any).env || {};

if (!metaEnv.VITE_FIREBASE_API_KEY) {
  console.warn('Using backup Firebase config from firebase-applet-config.json. Set VITE_FIREBASE_* variables in .env for production.');
}

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || backupConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || backupConfig.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || backupConfig.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || backupConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || backupConfig.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || backupConfig.appId,
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || backupConfig.firestoreDatabaseId || "(default)",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId,
);
export const storage = getStorage(app);

// Connectivity check as required by Firebase skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error: any) {
    if (error?.message?.includes("the client is offline")) {
      console.warn(
        "Firestore is offline. Check your network or Firebase configuration.",
      );
    }
  }
}
testConnection();
