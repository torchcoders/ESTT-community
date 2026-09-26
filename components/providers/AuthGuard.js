'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProfileCompletionDialog from '@/components/profile/ProfileCompletionDialog';

const publicPaths = ['/', '/login', '/signup', '/verify-success'];

export default function AuthGuard({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, loading } = useAuth();
    const isPublicPath = publicPaths.some((path) => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`));
    const isRegisteredUser = user && !user.isAnonymous;
    const profileNeedsCompletion = isRegisteredUser && (!profile ||
        !profile.firstName?.trim() ||
        !profile.lastName?.trim() ||
        !profile.startYear?.toString().trim() ||
        !profile.filiere?.trim() ||
        profile.filiere.toLowerCase().includes('compl'));

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
        </>
    );
}