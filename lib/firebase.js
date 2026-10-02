import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, get, push, set, update, onValue, remove, query, orderByChild, equalTo, increment, serverTimestamp, runTransaction, onDisconnect, limitToLast } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { firebaseConfig } from './firebase-config';

// Check if we have the minimum required configuration
const isConfigValid = !!firebaseConfig.apiKey && !!firebaseConfig.projectId && !!firebaseConfig.databaseURL;

let app;
let db;
let auth;
let storage;
let googleProvider;

// Only initialize Firebase on the client side and if the config is valid
// This prevents errors during Next.js build time when environment variables might be missing
// Initialize Firebase
if (isConfigValid) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getDatabase(app);
    auth = getAuth(app);
    storage = getStorage(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
}

export { app, db, auth, storage, storageRef, uploadBytes, getDownloadURL, deleteObject, googleProvider, ref, get, push, set, update, onValue, remove, query, orderByChild, equalTo, increment, serverTimestamp, runTransaction, onDisconnect, limitToLast };
