

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore'

// This function is designed to be called ONCE on the client side.
// It handles initialization of Firebase services.
export function initializeFirebase(): { firebaseApp: FirebaseApp, auth: Auth, firestore: Firestore } {
  if (getApps().length) {
    const app = getApp();
    return {
      firebaseApp: app,
      auth: getAuth(app),
      firestore: getFirestore(app),
    }
  }

  const firebaseApp = initializeApp(firebaseConfig);
  
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
