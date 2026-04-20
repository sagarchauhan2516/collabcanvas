/**
 * Firebase configuration and service initialization for CollabCanvas.
 * Provides Auth, Firestore, and Analytics services.
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { getAnalytics, logEvent, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyD7SvaIVGBm6s-KKBw29ckMX6hSZigo0Gw',
  authDomain: 'collabcanvas-app.firebaseapp.com',
  projectId: 'collabcanvas-app',
  storageBucket: 'collabcanvas-app.firebasestorage.app',
  messagingSenderId: '268506150325',
  appId: '1:268506150325:web:32a6a80820099d55fd95fc',
};

// Prevent duplicate app initialization in dev hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics only if supported (browser env)
let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((supported) => {
  if (supported) {
    analyticsInstance = getAnalytics(app);
  }
});

// ─── Auth Helpers ────────────────────────────────────────────────────────────

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInAsGuest = () => signInAnonymously(auth);
export const signOutUser = () => signOut(auth);
export { onAuthStateChanged, type FirebaseUser };

// ─── Analytics Helpers ───────────────────────────────────────────────────────

export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (analyticsInstance) {
    logEvent(analyticsInstance, eventName, params);
  }
};

export const ANALYTICS_EVENTS = {
  ELEMENT_ADDED: 'element_added',
  ELEMENT_DELETED: 'element_deleted',
  AI_GENERATION: 'ai_generation',
  CANVAS_EXPORTED: 'canvas_exported',
  CODE_GENERATED: 'code_generated',
  PROJECT_SAVED: 'project_saved',
  PROJECT_LOADED: 'project_loaded',
  USER_SIGNED_IN: 'user_signed_in',
  TEMPLATE_APPLIED: 'template_applied',
  COLLABORATION_JOINED: 'collaboration_joined',
} as const;

// ─── Firestore Project Helpers ───────────────────────────────────────────────

export interface CloudProject {
  id: string;
  name: string;
  elements: any[];
  userId: string;
  savedAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}

/** Save or overwrite a canvas project for the current user. */
export const saveProjectToCloud = async (
  userId: string,
  project: { id: string; name: string; elements: any[] }
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'projects', project.id);
  await setDoc(ref, {
    ...project,
    userId,
    savedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/** Load all projects for a user, ordered by most recently saved. */
export const loadProjectsFromCloud = async (userId: string): Promise<CloudProject[]> => {
  const col = collection(db, 'users', userId, 'projects');
  const q = query(col, orderBy('savedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CloudProject));
};

/** Delete a project from the cloud. */
export const deleteProjectFromCloud = async (userId: string, projectId: string): Promise<void> => {
  const ref = doc(db, 'users', userId, 'projects', projectId);
  await deleteDoc(ref);
};
