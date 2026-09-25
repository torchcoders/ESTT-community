'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const publicPaths = ['/', '/login', '/signup', '/verify-success'];

export default function AuthGuard({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading } = useAuth();
    const isPublicPath = publicPaths.some((path) => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`));
    const isRegisteredUser = user && !user.isAnonymous;

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

    return children;
}