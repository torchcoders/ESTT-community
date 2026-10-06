'use client';

import { useState, useEffect, useRef } from 'react';
import { db, ref, onValue } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, Menu, X, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notifySlack, SLACK_CHANNELS } from '@/lib/slack';

// Subcomponents
import ModeratorSidebar from './ModeratorSidebar';
import AdminOverview from './AdminOverview';
import AdminResources from './AdminResources';
import AdminUsers from './AdminUsers';
import AdminReports from './AdminReports';
import AdminFastContribute from './AdminFastContribute';
import ModeratorDocs from './ModeratorDocs';

export default function ModeratorDashboard() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        users: 0,
        resources: 0,
        pending: 0
    });
    const [resources, setResources] = useState([]);
    const [users, setUsers] = useState([]);
    const [reports, setReports] = useState([]);
    const [bugReports, setBugReports] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const notifiedRef = useRef(false);

    // Access Check: Admin or Moderator
    useEffect(() => {
        if (authLoading) return;
        const role = profile?.role;
        if (!user || (role !== 'admin' && role !== 'moderator')) {
            router.push('/');
        }
    }, [user, profile, authLoading, router]);

    // Presence Tracking: Notify Slack
    useEffect(() => {
        if (!authLoading && user && profile && !notifiedRef.current) {
            const role = profile?.role;
            if (role === 'admin' || role === 'moderator') {
                notifiedRef.current = true;
                notifySlack(SLACK_CHANNELS.ADMIN, {
                    title: "🔐 Accès Panel Modérateur",
                    message: `Un *${role}* vient d'entrer dans le panneau de gestion.`,
                    user: {
                        name: `${profile.firstName} ${profile.lastName}`,
                        email: profile.email || user.email,
                        uid: user.uid
                    }
                });
            }
        }
    }, [user, profile, authLoading]);

    useEffect(() => {
        const role = profile?.role;
        if (authLoading || !user || (role !== 'admin' && role !== 'moderator')) return;
        if (!db) return;

        const resourcesRef = ref(db, 'resources');
        const usersRef = ref(db, 'users');
        const reportsRef = ref(db, 'reports');

        const unsubResources = onValue(resourcesRef, (snapshot) => {
            const data = snapshot.val() || {};
            let list = [];
            Object.entries(data).forEach(([key, val]) => {
                if (val.type) {
                    list.push({ id: key, ...val });
                } else {
                    Object.entries(val).forEach(([childKey, childVal]) => {
                        if (typeof childVal === 'object' && childVal !== null) {
                            list.push({ id: childKey, ...childVal, _isNested: true, moduleId: key });
                        }
                    });
                }
            });
            list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setResources(list);
            setStats(prev => ({ 
                ...prev, 
                resources: list.length, 
                pending: list.filter(r => r.unverified).length 
            }));
        });

        const unsubUsers = onValue(usersRef, (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
            setUsers(list);
            setStats(prev => ({ ...prev, users: list.length }));
        });

        const unsubReports = onValue(reportsRef, (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
            setReports(list);
        });

        const unsubBugReports = onValue(ref(db, 'bugReports'), (snapshot) => {
            const data = snapshot.val() || {};
            setBugReports(Object.entries(data).map(([id, val]) => ({ id, ...val })));
        });

        setLoading(false);

        return () => {
            unsubResources();
            unsubUsers();
            unsubReports();
            unsubBugReports();
        };
    }, [user, profile, authLoading]);

    if (authLoading || loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    );

    const role = profile?.role;
    if (!user || (role !== 'admin' && role !== 'moderator')) {
        return null;
    }

    return (
        <div className="min-h-screen bg-muted/50 flex flex-col">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="font-black tracking-tight text-lg">Moderator<span className="text-blue-600">Panel</span></span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </Button>
            </div>

            <div className="flex flex-col md:flex-row flex-grow relative">
                <ModeratorSidebar
                    activeTab={activeTab}
                    setActiveTab={(tab) => {
                        setActiveTab(tab);
                        setIsSidebarOpen(false);
                    }}
                    profile={profile}
                    stats={stats}
                    openReportsCount={reports.length}
                    isOpen={isSidebarOpen}
                    setIsOpen={setIsSidebarOpen}
                    isCollapsed={isSidebarCollapsed}
                    setIsCollapsed={setIsSidebarCollapsed}
                />

                <main className="flex-grow p-4 md:p-10 overflow-auto custom-scrollbar">
                    {activeTab === 'overview' && (
                        <AdminOverview
                            stats={stats}
                            resources={resources}
                            users={users}
                            bugReports={bugReports}
                            setActiveTab={setActiveTab}
                        />
                    )}

                    {activeTab === 'resources' && (
                        <AdminResources resources={resources} />
                    )}

                    {activeTab === 'users' && (
                        <AdminUsers users={users} />
                    )}

                    {activeTab === 'reports' && (
                        <AdminReports reports={reports} />
                    )}

                    {activeTab === 'fastContribute' && (
                        <AdminFastContribute />
                    )}

                    {activeTab === 'documentation' && (
                        <ModeratorDocs />
                    )}
                </main>
            </div>
        </div>
    );
}
