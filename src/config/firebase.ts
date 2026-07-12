import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (!getApps().length) {
      if (!import.meta.env.VITE_FIREBASE_API_KEY) {
        throw new Error(
          'Firebase não configurado: defina VITE_FIREBASE_API_KEY e demais variáveis VITE_FIREBASE_* no .env',
        )
      }
      app = initializeApp(firebaseConfig)
    } else {
      app = getApp()
    }
  }
  return app
}

export function getAuthInstance(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp())
  }
  return auth
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp())
  }
  return db
}

/** Verifica se o Firebase está configurado (útil para feature flags) */
export function isFirebaseConfigured(): boolean {
  return !!import.meta.env.VITE_FIREBASE_API_KEY
}