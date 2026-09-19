import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth, type User } from 'firebase/auth';
import { addDoc, collection, getFirestore, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const firebaseConfigured = Object.values(config).every(Boolean);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

if (firebaseConfigured) {
  app = getApps()[0] || initializeApp(config);
  auth = getAuth(app);
  firestore = getFirestore(app);
}

export const getFirebaseUser = async (): Promise<User> => {
  if (!auth) throw new Error('Firebase is not configured');
  if (auth.currentUser) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
};

export const saveCapabilityEvent = async (capability: string) => {
  if (!firestore) throw new Error('Firebase is not configured');
  const user = await getFirebaseUser();
  await addDoc(collection(firestore, 'capabilityEvents'), {
    capability,
    userId: user.uid,
    createdAt: new Date()
  });
};