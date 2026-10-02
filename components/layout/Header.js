'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn, getUserLevel } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Menu, X, Bell, LogOut, User as UserIcon, Search, MessageSquare, Home, Calendar, PlusCircle, ShieldCheck, BookOpen, HelpCircle, ListPlus, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { db, ref, onValue } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

export default function Header() {
    const { user, profile, signOut } = useAuth();
    const isRegisteredUser = user && !user.isAnonymous;
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    
    // Hide header in dedicated chat views
    const isIndividualDM = pathname?.startsWith('/messages/') && pathname !== '/messages';
    const isChat = pathname?.startsWith('/chat');
    
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadDMCount, setUnreadDMCount] = useState(0);
    const [open, setOpen] = useState(false);

    const level = getUserLevel(profile?.startYear);
    const contributionsCount = profile?.contributions ? Object.keys(profile.contributions).length : 0;
    const isMentor = level === 2 && contributionsCount > 5;
    const isSubscribed = profile?.subscription?.expiresAt && profile.subscription.expiresAt > Date.now();

    useEffect(() => {
        if (!isRegisteredUser || !db) return;

        const privateNotifRef = ref(db, `notifications/private/${user.uid}`);
        const unsubPrivate = onValue(privateNotifRef, (snapshot) => {
            const data = snapshot.val() || {};
            const unreadPrivate = Object.values(data).filter(n => !n.read).length;

            const globalNotifRef = ref(db, 'notifications/global');
            onValue(globalNotifRef, (gSnapshot) => {
                const globalData = gSnapshot.val() || {};
                const lastOpenedGlobal = profile?.notifications?.meta?.lastOpenedGlobalAt || 0;
                const unreadGlobal = Object.values(globalData).filter(n => n.createdAt > lastOpenedGlobal).length;

                setUnreadCount(unreadPrivate + unreadGlobal);
            }, { onlyOnce: true });
        });

        return () => {
            unsubPrivate();
        };
    }, [isRegisteredUser, user, profile, db]);

    useEffect(() => {
        if (!isRegisteredUser || !db) return;

        const convRef = ref(db, `userConversations/${user.uid}`);
        const unsubDM = onValue(convRef, (snapshot) => {
            const data = snapshot.val() || {};
            const count = Object.values(data).filter(c => c.unread === true).length;
            setUnreadDMCount(count);
        });

        return () => unsubDM();
    }, [isRegisteredUser, user, db]);

    if (isIndividualDM || isChat) return null;


    if (pathname === '/downloadAndroid' || pathname === '/docs') return null;

    const isActive = (path) => {
        if (path === '/') return pathname === '/';
        return pathname === path || pathname.startsWith(`${path}/`);
    };

    const navItems = isRegisteredUser ? [
        { href: '/', label: 'Accueil', icon: Home },
        ...(isRegisteredUser ? [
            { href: '/browse', label: 'Ressources', icon: BookOpen },
            { href: '/events', label: 'Événements', icon: Calendar },
            { href: '/contribute', label: 'Contribuer', icon: PlusCircle },
            { href: '/chat', label: 'Discussion', icon: MessageSquare },
        ] : []),
    ] : [];

    if (isRegisteredUser) {
        navItems.push({ href: '/my-list', label: 'Ma Liste', icon: ListPlus });
        navItems.push({ href: '/profile', label: 'Profil', icon: UserIcon });
    }

    const isChatPage = pathname === '/chat';

    return (
        <header className={cn(
            "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
            isChatPage && "hidden md:block"
        )}>
            <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link href="/" className="flex items-center space-x-2">
                        <Image
                            src="/assets/images/platform_logo.svg"
                            alt="EST Tétouan Logo"
                            className="h-10 w-auto dark:brightness-0 dark:invert"
                            width={150}
                            height={50}
                            priority
                        />
                    </Link>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-primary",
                                isActive(item.href) ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-4">

                    
                    <div className="hidden md:flex items-center gap-4">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </button>
                        {!isRegisteredUser ? (
                            <>
                                <Button variant="ghost" asChild>
                                    <Link href="/login">Se connecter</Link>
                                </Button>
                                <Button asChild>
                                    <Link href="/signup">S'inscrire</Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <span className="text-sm font-medium text-muted-foreground hidden lg:flex items-center gap-2">
                                    {profile?.firstName ? `Salut, ${profile.firstName}` : user.email}
                                    {(profile?.role || '').toLowerCase() === 'admin' && (
                                        <Link href="/admin">
                                            <Badge variant="secondary" className="bg-yellow-400 text-white border-none text-[8px] px-1 animate-pulse hover:bg-yellow-500 cursor-pointer">
                                                ADMIN
                                            </Badge>
                                        </Link>
                                    )}
                                    {(profile?.role || '').toLowerCase() === 'moderator' && (
                                        <Link href="/moderator">
                                            <Badge variant="secondary" className="bg-blue-600 text-white border-none text-[8px] px-1 animate-pulse hover:bg-blue-700 cursor-pointer">
                                                MODERATEUR
                                            </Badge>
                                        </Link>
                                    )}
                                </span>

                                <Link href="/messages" className="relative p-2 text-muted-foreground hover:text-primary transition-colors">
                                    <MessageSquare className="h-5 w-5" />
                                    {unreadDMCount > 0 && (
                                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                                            {unreadDMCount > 9 ? '9+' : unreadDMCount}
                                        </span>
                                    )}
                                </Link>

                                <Link href="/notifications" className="relative p-2 text-muted-foreground hover:text-primary transition-colors">
                                    <Bell className="h-5 w-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Notifications Bell */}
                    {isRegisteredUser && (
                        <>
                            <Link href="/messages" className="relative p-2 text-muted-foreground hover:text-primary transition-colors md:hidden">
                                <MessageSquare className="h-5 w-5" />
                                {unreadDMCount > 0 && (
                                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                                        {unreadDMCount > 9 ? '9+' : unreadDMCount}
                                    </span>
                                )}
                            </Link>
                            <Link href="/notifications" className="relative p-2 text-muted-foreground hover:text-primary transition-colors md:hidden">
                                <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                            </Link>
                        </>
                    )}



                    {/* Mobile Menu Toggle via Sheet */}
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                className="md:hidden"
                                size="icon"
                            >
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] sm:w-[400px] flex flex-col p-6">
                            <SheetHeader className="text-left mb-6">
                                <SheetTitle className="flex items-center gap-2">
                                    <Image
                                        src="/assets/images/platform_logo.svg"
                                        alt="EST Tétouan Logo"
                                        className="h-8 w-auto dark:brightness-0 dark:invert"
                                        width={120}
                                        height={40}
                                    />
                                </SheetTitle>
                            </SheetHeader>
                            <nav className="flex flex-col gap-1 mt-2">
                                <button
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    className="flex items-center gap-3 px-3 py-3 text-base font-medium transition-colors rounded-xl text-muted-foreground hover:bg-muted"
                                >
                                    {theme === 'dark' ? <Sun className="w-[22px] h-[22px]" /> : <Moon className="w-[22px] h-[22px]" />}
                                    {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                                </button>
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-3 text-base font-medium transition-colors rounded-xl shadow-none",
                                            isActive(item.href) ? "text-primary font-semibold bg-primary/5" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                        onClick={() => setOpen(false)}
                                    >
                                        <item.icon className={cn("w-[22px] h-[22px]", isActive(item.href) ? "opacity-100" : "opacity-70")} />
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>

                            <div className="mt-auto pt-4 border-t border-border pb-2">
                                {!isRegisteredUser ? (
                                    <div className="flex flex-col gap-2">
                                        <Button variant="outline" className="w-full justify-center h-11 shadow-none" asChild onClick={() => setOpen(false)}>
                                            <Link href="/login">Se connecter</Link>
                                        </Button>
                                        <Button className="w-full justify-center h-11 bg-primary hover:bg-primary/90 shadow-none" asChild onClick={() => setOpen(false)}>
                                            <Link href="/signup">S'inscrire</Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-3 px-3 py-2 mb-2">
                                            <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border border-border">
                                                {profile?.photoUrl || profile?.photoURL || user?.photoURL ? (
                                                    <Image src={profile?.photoUrl || profile?.photoURL || user?.photoURL} alt="Profile" fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                        {profile?.firstName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-sm font-semibold text-foreground truncate">
                                                        {profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : 'Étudiant'}
                                                    </span>

                                                    {isSubscribed && (
                                                        <span className="bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-[8px] font-bold px-1 py-0.5 rounded shadow-sm uppercase leading-none">
                                                            PLUS+
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground truncate leading-relaxed opacity-90">{user.email}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1">
                                            <Button variant="ghost" className="w-full justify-start h-11 px-3 text-muted-foreground hover:text-primary hover:bg-muted rounded-xl gap-3 shadow-none" asChild onClick={() => setOpen(false)}>
                                                <Link href="/profile">
                                                    <UserIcon className="w-5 h-5 opacity-70" />
                                                    <span className="font-medium text-sm">Mon Profil</span>
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="w-full justify-start h-11 px-3 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl gap-3 shadow-none"
                                                onClick={() => {
                                                    signOut();
                                                    setOpen(false);
                                                }}
                                            >
                                                <LogOut className="w-5 h-5 opacity-70" />
                                                <span className="font-medium text-sm">Se déconnecter</span>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
