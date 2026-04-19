import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const vitest = import.meta.env.VITEST === true;

const REQUIRED_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

function missingKeys() {
  return REQUIRED_KEYS.filter((k) => !import.meta.env[k]);
}

export const firebaseConfigured = vitest || missingKeys().length === 0;

const firebaseConfig = vitest
  ? {
      apiKey: 'vitest-stub',
      authDomain: 'vitest.local',
      projectId: 'vitest-stub',
      storageBucket: 'vitest-stub.appspot.com',
      messagingSenderId: '000000000000',
      appId: '1:000000000000:web:viteststub',
    }
  : firebaseConfigured
    ? {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        ...(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
          ? { measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID }
          : {}),
      }
    : null;

if (!firebaseConfigured && !vitest) {
  console.warn(
    `[firebase] Missing env: ${missingKeys().join(', ')}. Google sign-in disabled. Fill frontend/.env to enable.`,
  );
}

export const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;

const fnRegion = String(import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || '').trim();
export const functions = app ? (fnRegion ? getFunctions(app, fnRegion) : getFunctions(app)) : null;

const useEmu =
  firebaseConfigured &&
  !vitest &&
  typeof window !== 'undefined' &&
  String(import.meta.env.VITE_FIREBASE_USE_EMULATORS || '').toLowerCase() === 'true';

if (useEmu) {
  const host = String(import.meta.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1').trim() || '127.0.0.1';
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
  connectFunctionsEmulator(functions, host, 5001);
}

/** Resolves to Analytics in the browser when supported; null otherwise (SSR/tests). */
export const analyticsPromise =
  firebaseConfigured &&
  !vitest &&
  typeof window !== 'undefined' &&
  import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    ? isSupported().then((ok) => (ok ? getAnalytics(app) : null))
    : Promise.resolve(null);
