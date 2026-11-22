'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db, ref, update, increment } from '@/lib/firebase';
import { pathToKey } from '@/lib/activityTracker';

const IDLE_TIMEOUT_MS = 60 * 1000; // 60 seconds without interaction = idle
const SYNC_INTERVAL_MS = 20 * 1000; // Sync to database every 20 seconds of active time

export default function ActivityTracker() {
    const { user, profile } = useAuth();
    const pathname = usePathname();

    // Refs to keep track of mutable state without re-triggering effects
    const lastInteractionRef = useRef(Date.now());
    const isIdleRef = useRef(false);
    const accumulatedSecondsRef = useRef(0);
    const currentPathRef = useRef(pathname);
    const visitedInSessionRef = useRef(new Set());
    const userRef = useRef(user);
    const profileRef = useRef(profile);

    // Keep refs up to date
    useEffect(() => {
        userRef.current = user;
        profileRef.current = profile;
    }, [user, profile]);

    // Check if user is authenticated (not anonymous)
    const isAuthenticated = Boolean(user && !user.isAnonymous);

    // Flush accumulated time to Firebase Realtime Database
    const flushTime = async (forcedPath = null, isNewVisit = false) => {
        const currentUser = userRef.current;
        if (!currentUser || currentUser.isAnonymous || !db) return;

        const path = forcedPath || currentPathRef.current || '/';

        // Do not track activity on /admin pages
        if (!path || path.startsWith('/admin')) return;

        const pageKey = pathToKey(path);
        const secondsToFlush = accumulatedSecondsRef.current;

        // Nothing to flush and not a new visit
        if (secondsToFlush <= 0 && !isNewVisit) return;

        // Reset buffer immediately
        accumulatedSecondsRef.current = 0;

        const currentProfile = profileRef.current;
        const displayName = `${currentProfile?.firstName || ''} ${currentProfile?.lastName || ''}`.trim() ||
            currentUser.displayName ||
            'Étudiant';
        const email = currentUser.email || currentProfile?.email || '';
        const filiere = currentProfile?.filiere || '';
        const now = Date.now();

        const updates = {};

        if (secondsToFlush > 0) {
            updates[`userActivity/${currentUser.uid}/totalTime`] = increment(secondsToFlush);
            updates[`userActivity/${currentUser.uid}/lastActive`] = now;
            updates[`userActivity/${currentUser.uid}/displayName`] = displayName;
            updates[`userActivity/${currentUser.uid}/email`] = email;
            if (filiere) updates[`userActivity/${currentUser.uid}/filiere`] = filiere;

            updates[`userActivity/${currentUser.uid}/pages/${pageKey}/path`] = path;
            updates[`userActivity/${currentUser.uid}/pages/${pageKey}/timeSpent`] = increment(secondsToFlush);
            updates[`userActivity/${currentUser.uid}/pages/${pageKey}/lastVisited`] = now;

            updates[`pageActivity/${pageKey}/path`] = path;
            updates[`pageActivity/${pageKey}/totalTime`] = increment(secondsToFlush);
            updates[`pageActivity/${pageKey}/lastActive`] = now;
        }

        if (isNewVisit) {
            updates[`userActivity/${currentUser.uid}/lastActive`] = now;
            updates[`userActivity/${currentUser.uid}/displayName`] = displayName;
            updates[`userActivity/${currentUser.uid}/email`] = email;
            if (filiere) updates[`userActivity/${currentUser.uid}/filiere`] = filiere;

            updates[`userActivity/${currentUser.uid}/pages/${pageKey}/path`] = path;
            updates[`userActivity/${currentUser.uid}/pages/${pageKey}/visits`] = increment(1);
            updates[`userActivity/${currentUser.uid}/pages/${pageKey}/lastVisited`] = now;
            updates[`userActivity/${currentUser.uid}/pageViews`] = increment(1);

            updates[`pageActivity/${pageKey}/path`] = path;
            updates[`pageActivity/${pageKey}/visits`] = increment(1);
            updates[`pageActivity/${pageKey}/lastActive`] = now;
        }

        if (Object.keys(updates).length > 0) {
            try {
                await update(ref(db), updates);
            } catch (err) {
                console.error('[ActivityTracker] Failed to flush activity:', err);
                // Put back un-flushed seconds if needed
                if (secondsToFlush > 0) {
                    accumulatedSecondsRef.current += secondsToFlush;
                }
            }
        }
    };

    // User interaction listeners to detect idle state
    useEffect(() => {
        if (!isAuthenticated) return;

        const handleUserActivity = () => {
            lastInteractionRef.current = Date.now();
            if (isIdleRef.current) {
                isIdleRef.current = false;
            }
        };

        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab switched or minimized: flush current activity
                isIdleRef.current = true;
                flushTime(currentPathRef.current, false);
            } else {
                // Tab active again
                lastInteractionRef.current = Date.now();
                isIdleRef.current = false;
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        const handleBeforeUnload = () => {
            flushTime(currentPathRef.current, false);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isAuthenticated]);

    // Timer loop: increments active seconds every second and periodically flushes
    useEffect(() => {
        if (!isAuthenticated) return;

        const interval = setInterval(() => {
            if (document.hidden) return;

            // Do not accumulate time if user is on /admin
            const currentPath = currentPathRef.current || '';
            if (currentPath.startsWith('/admin')) {
                accumulatedSecondsRef.current = 0;
                return;
            }

            const now = Date.now();
            const timeSinceInteraction = now - lastInteractionRef.current;

            if (timeSinceInteraction >= IDLE_TIMEOUT_MS) {
                if (!isIdleRef.current) {
                    isIdleRef.current = true;
                    // Flush accumulated time before marking idle
                    flushTime(currentPathRef.current, false);
                }
                return;
            }

            // User is active and tab is visible: add 1 second
            accumulatedSecondsRef.current += 1;

            // Periodic database sync
            if (accumulatedSecondsRef.current >= SYNC_INTERVAL_MS / 1000) {
                flushTime(currentPathRef.current, false);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isAuthenticated]);

    // Handle route / pathname transitions
    useEffect(() => {
        if (!isAuthenticated) return;

        const previousPath = currentPathRef.current;
        const newPath = pathname || '/';

        // If path changed and previous path was not admin, flush old path first
        if (previousPath && previousPath !== newPath && !previousPath.startsWith('/admin')) {
            flushTime(previousPath, false);
        }

        currentPathRef.current = newPath;
        lastInteractionRef.current = Date.now();
        isIdleRef.current = false;

        // Do not record visit or track if new path is /admin
        if (newPath.startsWith('/admin')) {
            accumulatedSecondsRef.current = 0;
            return;
        }

        // Record visit for the new path
        const visitKey = `${user?.uid}:${newPath}`;
        const isNewVisit = !visitedInSessionRef.current.has(visitKey);
        if (isNewVisit) {
            visitedInSessionRef.current.add(visitKey);
            flushTime(newPath, true);
        }
    }, [pathname, isAuthenticated, user?.uid]);

    return null;
}
