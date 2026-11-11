import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

try {
  appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  authInstance = getAuth(appInstance);
} catch {
  // Fallback when running in headless test environments where Auth provider registration is unavailable
  authInstance = null;
}

export const auth = authInstance;
export const googleAuthProvider = new GoogleAuthProvider();

