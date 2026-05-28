import { initializeApp } from 'firebase/app';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export async function loginWithEmailPassword(email: string, password: string) {
  if (!auth) throw new Error('Firebase Auth is not configured.');
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function registerWithEmailPassword(email: string, password: string) {
  if (!auth) throw new Error('Firebase Auth is not configured.');
  return createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function logoutFirebaseUser() {
  if (!auth) return;
  await signOut(auth);
}

export async function getFirebaseIdToken(forceRefresh = false): Promise<string> {
  if (!auth?.currentUser) {
    throw new Error('You must be signed in to access protected backend services.');
  }
  return auth.currentUser.getIdToken(forceRefresh);
}

export function onFirebaseAuthChanged(
  callback: (user: FirebaseUser | null) => void,
  onError?: (error: Error) => void,
) {
  if (!auth) return () => undefined;
  return onAuthStateChanged(
    auth,
    callback,
    (error) => {
      if (onError) onError(error as Error);
    }
  );
}
