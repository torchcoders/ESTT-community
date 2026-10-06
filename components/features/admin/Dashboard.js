'use client';

import { useState, useEffect } from 'react';
import { db, ref, onValue, update } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, Menu, X, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';

// Subcomponents
import AdminSidebar from './AdminSidebar';
import AdminOverview from './AdminOverview';
import AdminResources from './AdminResources';
import AdminProjects from './AdminProjects';
import AdminUsers from './AdminUsers';
import AdminReports from './AdminReports';
import AdminClubRequests from './AdminClubRequests';
import AdminClubChanges from './AdminClubChanges';
import AdminAnnouncements from './AdminAnnouncements';
import AdminAds from './AdminAds';
import AdminSettings from './AdminSettings';
import AdminNotifications from './AdminNotifications';
import AdminFastContribute from './AdminFastContribute';
import AdminBugReports from './AdminBugReports';
import AdminShortUrls from './AdminShortUrls';
import AdminCommunication from './AdminCommunication';
import AdminRewardCodes from './AdminRewardCodes';
import AdminMessages from './AdminMessages';
import { normalizeProject, normalizeShowcase, normalizeSubmission } from '@/lib/projects';

const ADMIN_TABS = [
    'overview',
    'resources',
    'projects',
    'fastContribute',
    'users',
    'reports',
    'bugReports',
    'clubRequests',
    'clubChangeRequests',
    'announcements',
    'ads',
    'communication',
    'notifications',
    'messages',
    'rewardCodes',
    'shortUrls',
    'settings'
];

function getTabFromHash() {
    if (typeof window === 'undefined') return 'overview';

    const tab = window.location.hash.slice(1);
    return ADMIN_TABS.includes(tab) ? tab : 'overview';
}

export default function AdminDashboard() {
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
    const [clubRequests, setClubRequests] = useState([]);
    const [clubChangeRequests, setClubChangeRequests] = useState([]);
    const [activeTab, setActiveTab] = useState(getTabFromHash);
    const [notificationSettings, setNotificationSettings] = useState({
        enabled: true,
        email: 'thevcercle@gmail.com'
    });
    const [adminAnnouncements, setAdminAnnouncements] = useState([]);
    const [bugReports, setBugReports] = useState([]);
    const [contactMessages, setContactMessages] = useState([]);
    const [projectBriefs, setProjectBriefs] = useState([]);
    const [projectSubmissions, setProjectSubmissions] = useState([]);
    const [projectShowcases, setProjectShowcases] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        const handleHashChange = () => setActiveTab(getTabFromHash());

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleSetActiveTab = (tab) => {
        if (!ADMIN_TABS.includes(tab)) return;

        setActiveTab(tab);
        if (window.location.hash !== `#${tab}`) {
            window.location.hash = tab;
        }
    };

    // Admin Check
    useEffect(() => {
        if (authLoading) return;
        if (!user || profile?.role !== 'admin') {
            router.push('/');
        }
    }, [user, profile, authLoading, router]);

    useEffect(() => {
        if (authLoading || !user || profile?.role !== 'admin') return;
        if (!db) return;

        const resourcesRef = ref(db, 'resources');
        const usersRef = ref(db, 'users');
        const reportsRef = ref(db, 'reports');
        const projectsRef = ref(db, 'projects');
        const projectSubmissionsRef = ref(db, 'projectSubmissions');
        const projectShowcasesRef = ref(db, 'projectShowcases');

        const unsubResources = onValue(resourcesRef, (snapshot) => {
            const data = snapshot.val() || {};
            // Helper to flatten nested and determine nature
            let list = [];
            Object.entries(data).forEach(([key, val]) => {
                // Check if it's a direct resource or a module container
                if (val.type) { // It has a type, likely a resource
                    list.push({ id: key, ...val });
                } else {
                    // Likely a module container, check children
                    Object.entries(val).forEach(([childKey, childVal]) => {
                        if (typeof childVal === 'object' && childVal !== null) {
                            list.push({ id: childKey, ...childVal, _isNested: true, moduleId: key });
                        }
                    });
                }
            });
            // Sort by newest first
            list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setResources(list);
            setStats(prev => ({ ...prev, resources: list.length, pending: list.filter(r => r.unverified).length }));
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

        const unsubProjects = onValue(projectsRef, (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.entries(data)
                .map(([id, val]) => normalizeProject(id, val))
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setProjectBriefs(list);
        });

        const unsubProjectSubmissions = onValue(projectSubmissionsRef, (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.entries(data)
                .map(([id, val]) => normalizeSubmission(id, val))
                .sort((a, b) => ((b.votesCount || 0) - (a.votesCount || 0)) || ((b.createdAt || 0) - (a.createdAt || 0)));
            setProjectSubmissions(list);
        });

        const unsubProjectShowcases = onValue(projectShowcasesRef, (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.entries(data)
                .map(([id, val]) => normalizeShowcase(id, val))
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setProjectShowcases(list);
        });

        const bugReportsRef = ref(db, 'bugReports');
        const unsubBugReports = onValue(bugReportsRef, (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
            setBugReports(list);
        });

        const contactMessagesRef = ref(db, 'contactMessages');
        const unsubContactMessages = onValue(contactMessagesRef, (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.entries(data)
                .map(([id, val]) => ({ id, ...val }))
                .filter(m => !m.deleted);
            setContactMessages(list);
        });

        const clubRequestsRef = ref(db, 'clubRequests');
        const unsubClubRequests = onValue(clubRequestsRef, (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.entries(data)
                .map(([id, val]) => ({ id, ...val }))
                .filter(req => req.status === 'pending');
            setClubRequests(list);
        });

        const clubChangeRequestsRef = ref(db, 'clubChangeRequests');
        const unsubClubChangeRequests = onValue(clubChangeRequestsRef, (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.entries(data)
                .map(([id, val]) => ({ id, ...val }))
                .filter(req => req.status === 'pending');
            setClubChangeRequests(list);
        });

        const adminAnnouncementsRef = ref(db, 'adminAnnouncements');
        const unsubAdminAnnouncements = onValue(adminAnnouncementsRef, (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.entries(data)
                .map(([id, val]) => ({ id, ...val }))
                .sort((a, b) => b.createdAt - a.createdAt);
            setAdminAnnouncements(list);
        });

        // Fetch settings
        const settingsRef = ref(db, 'adminSettings/notifications');
        const unsubSettings = onValue(settingsRef, (snapshot) => {
            if (snapshot.exists()) {
                setNotificationSettings(snapshot.val());
            } else {
                // Set default if not exists
                update(ref(db, 'adminSettings/notifications'), {
                    enabled: true,
                    email: 'thevcercle@gmail.com'
                });
            }
        });

        setLoading(false);

        return () => {
            unsubResources();
            unsubUsers();
            unsubReports();
            unsubProjects();
            unsubProjectSubmissions();
            unsubProjectShowcases();
            unsubClubRequests();
            unsubClubChangeRequests();
            unsubAdminAnnouncements();
            unsubSettings();
            unsubBugReports();
            unsubContactMessages();
        };
    }, [user, profile, authLoading]);


    if (authLoading || loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    );

    if (!user || profile?.role !== 'admin') {
        return null;
    }

    return (
        <div className="min-h-screen bg-muted/50 flex flex-col">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="font-black tracking-tight text-lg">Admin<span className="text-primary">Panel</span></span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </Button>
            </div>

            <div className="flex flex-col md:flex-row flex-grow relative">
                <AdminSidebar
                    activeTab={activeTab}
                    setActiveTab={(tab) => {
                        handleSetActiveTab(tab);
                        setIsSidebarOpen(false);
                    }}
                    profile={profile}
                    stats={stats}
                    openReportsCount={reports.length}
                    openBugReportsCount={bugReports.filter(b => b.status === 'open').length}
                    openClubRequestsCount={clubRequests.length}
                    openClubChangeRequestsCount={clubChangeRequests.length}
                    unreadMessagesCount={contactMessages.filter(m => m.status === 'unread').length}
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
                            setActiveTab={handleSetActiveTab}
                        />
                    )}

                    {activeTab === 'resources' && (
                        <AdminResources resources={resources} />
                    )}

                    {activeTab === 'projects' && (
                        <AdminProjects
                            projects={projectBriefs}
                            submissions={projectSubmissions}
                            showcases={projectShowcases}
                        />
                    )}

                    {activeTab === 'users' && (
                        <AdminUsers users={users} canEdit />
                    )}

                    {activeTab === 'reports' && (
                        <AdminReports reports={reports} />
                    )}

                    {activeTab === 'bugReports' && (
                        <AdminBugReports reports={bugReports} />
                    )}

                    {activeTab === 'clubRequests' && (
                        <AdminClubRequests requests={clubRequests} />
                    )}

                    {activeTab === 'clubChangeRequests' && (
                        <AdminClubChanges requests={clubChangeRequests} />
                    )}

                    {activeTab === 'announcements' && (
                        <AdminAnnouncements
                            announcements={adminAnnouncements}
                            userEmail={user?.email}
                        />
                    )}

                    {activeTab === 'ads' && (
                        <AdminAds />
                    )}

                    {activeTab === 'settings' && (
                        <AdminSettings
                            settings={notificationSettings}
                            setSettings={setNotificationSettings}
                        />
                    )}

                    {activeTab === 'communication' && (
                        <AdminCommunication users={users} />
                    )}

                    {activeTab === 'notifications' && (
                        <AdminNotifications users={users} />
                    )}

                    {activeTab === 'fastContribute' && (
                        <AdminFastContribute />
                    )}

                    {activeTab === 'shortUrls' && (
                        <AdminShortUrls />
                    )}

                    {activeTab === 'rewardCodes' && (
                        <AdminRewardCodes />
                    )}

                    {activeTab === 'messages' && (
                        <AdminMessages
                            messages={contactMessages}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}
