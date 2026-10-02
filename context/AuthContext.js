'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInAnonymously,
    linkWithCredential,
    linkWithPopup,
    EmailAuthProvider,
    signOut as firebaseSignOut,
    sendEmailVerification,
    GoogleAuthProvider
} from 'firebase/auth';
import { auth, db, ref, onValue } from '@/lib/firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth || !db) return;

        let unsubscribeProfile = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                if (unsubscribeProfile) unsubscribeProfile();
                setUser(user);
                // Fetch profile data from Realtime Database
                const profileRef = ref(db, `users/${user.uid}`);
                unsubscribeProfile = onValue(profileRef, (snapshot) => {
                    if (snapshot.exists()) {
                        setProfile(snapshot.val());
                    } else {
                        setProfile(null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching profile:", error);
                    setLoading(false);
                });
            } else {
                try {
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error('Anonymous sign-in failed:', error);
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                }
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, []);


    const signIn = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const signUp = (email, password) => {
        if (auth.currentUser?.isAnonymous) {
            const credential = EmailAuthProvider.credential(email, password);
            return linkWithCredential(auth.currentUser, credential);
        }
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const signOut = () => {
        return firebaseSignOut(auth);
    };

    const sendVerification = (user) => {
        return sendEmailVerification(user);
    };

    const signInWithGoogle = async () => {
        const { signInWithPopup } = await import('firebase/auth');
        const { googleProvider, get, set } = await import('@/lib/firebase');

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Get Google Access Token if we need to interact with Google APIs
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const accessToken = credential?.accessToken;

            const email = user.email.toLowerCase();

            let isAllowed = false;
            if (email.endsWith('@etu.uae.ac.ma')) {
                isAllowed = true;
            } else if (email.endsWith('@gmail.com')) {
                const snapshot = await get(ref(db, 'emailExceptions'));
                if (snapshot.exists()) {
                    const exceptions = snapshot.val();
                    const allowedEmails = Object.values(exceptions);
                    if (allowedEmails.includes(email.trim())) {
                        isAllowed = true;
                    }
                }
            }

            if (!isAllowed) {
                await firebaseSignOut(auth);
                throw new Error('Seuls les e-mails académiques (@etu.uae.ac.ma) sont autorisés.');
            }

            // Check if profile exists, if not create one
            const userRef = ref(db, `users/${user.uid}`);
            const profileSnap = await get(userRef);

            if (!profileSnap.exists()) {
                const nameParts = user.displayName ? user.displayName.split(' ') : ['Étudiant', 'ESTT'];
                await set(userRef, {
                    email: email,
                    firstName: nameParts[0] || 'Étudiant',
                    lastName: nameParts.slice(1).join(' ') || 'ESTT',
                    createdAt: Date.now(),
                    filiere: 'À compléter',
                    startYear: new Date().getFullYear().toString()
                });
            }

            return { ...result, accessToken };
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signInWithGoogle, signOut, sendVerification }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
