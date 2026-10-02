'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProfileCompletionDialog from '@/components/profile/ProfileCompletionDialog';
import EmailVerificationPrompt from '@/components/profile/EmailVerificationPrompt';

const publicPaths = ['/', '/login', '/signup', '/verify-success'];
const emailVerificationPromptKey = (uid) => `estt-email-verification-prompt:${uid}`;

export default function AuthGuard({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, loading } = useAuth();
    const [showEmailVerificationPrompt, setShowEmailVerificationPrompt] = useState(false);
    const isPublicPath = publicPaths.some((path) => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`));
    const isRegisteredUser = user && !user.isAnonymous;
    const profileNeedsCompletion = isRegisteredUser && (!profile ||
        !profile.firstName?.trim() ||
        !profile.lastName?.trim() ||
        !profile.startYear?.toString().trim() ||
        !profile.filiere?.trim() ||
        profile.filiere.toLowerCase().includes('compl'));

    useEffect(() => {
        if (loading || !isRegisteredUser || profile?.verifiedEmail === true) {
            setShowEmailVerificationPrompt(false);
            return;
        }

        const sessionKey = emailVerificationPromptKey(user.uid);
        if (window.sessionStorage.getItem(sessionKey)) return;

        window.sessionStorage.setItem(sessionKey, 'shown');
        setShowEmailVerificationPrompt(true);
    }, [isRegisteredUser, loading, profile?.verifiedEmail, user?.uid]);

    useEffect(() => {
        if (!loading && !isRegisteredUser && !isPublicPath) {
            const query = window.location.search;
            const requestedPath = `${pathname}${query ? `?${query}` : ''}`;
            router.replace(`/login?redirect=${encodeURIComponent(requestedPath)}`);
        }
    }, [isPublicPath, isRegisteredUser, loading, pathname, router]);

    if (loading || (!isRegisteredUser && !isPublicPath)) {
        return null;
    }

    return (
        <>
            {children}
            {!isPublicPath && (
                <ProfileCompletionDialog
                    isOpen={Boolean(profileNeedsCompletion)}
                    user={user}
                    profile={profile}
                />
            )}
            {isRegisteredUser && profile?.verifiedEmail !== true && (
                <EmailVerificationPrompt
                    isOpen={showEmailVerificationPrompt}
                    onOpenChange={setShowEmailVerificationPrompt}
                    user={user}
                    profile={profile}
                />
            )}
        </>
    );
}