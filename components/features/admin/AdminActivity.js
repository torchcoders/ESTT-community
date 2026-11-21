'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { db, ref, onValue } from '@/lib/firebase';
import {
    formatDuration,
    formatDurationDetailed,
    formatRelativeTime,
    exportActivityReportCSV,
    pathToKey
} from '@/lib/activityTracker';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Clock,
    Users,
    FileText,
    Trophy,
    Search,
    Download,
    ExternalLink,
    RefreshCw,
    BarChart3,
    ArrowUpDown,
    Sparkles,
    Flame,
    CheckCircle2,
    Compass,
    Eye,
    Layers
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Cell
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#14b8a6'];

export default function AdminActivity({ users = [] }) {
    const [userActivityMap, setUserActivityMap] = useState({});
    const [pageActivityMap, setPageActivityMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState('users'); // 'users' | 'pages' | 'insights'

    // Search and Sort states for Users tab
    const [userSearch, setUserSearch] = useState('');
    const [userSort, setUserSort] = useState('time_desc'); // 'time_desc' | 'views_desc' | 'recent'

    // Search and Sort states for Pages tab
    const [pageSearch, setPageSearch] = useState('');
    const [pageSort, setPageSort] = useState('time_desc'); // 'time_desc' | 'visits_desc' | 'avg_desc'

    // Selected user for details modal
    const [selectedUserDetail, setSelectedUserDetail] = useState(null);
    const [userModalSearch, setUserModalSearch] = useState('');

    // Fetch userActivity and pageActivity in real-time
    useEffect(() => {
        if (!db) {
            setLoading(false);
            return;
        }

        const userActRef = ref(db, 'userActivity');
        const pageActRef = ref(db, 'pageActivity');

        const unsubUserAct = onValue(userActRef, (snapshot) => {
            const data = snapshot.val() || {};
            setUserActivityMap(data);
            setLoading(false);
        }, (error) => {
            console.error('[AdminActivity] Error loading userActivity:', error);
            setLoading(false);
        });

        const unsubPageAct = onValue(pageActRef, (snapshot) => {
            const data = snapshot.val() || {};
            setPageActivityMap(data);
        }, (error) => {
            console.error('[AdminActivity] Error loading pageActivity:', error);
        });

        return () => {
            unsubUserAct();
            unsubPageAct();
        };
    }, []);

    // Create a lookup map for existing users profiles
    const usersProfileMap = useMemo(() => {
        const map = {};
        users.forEach((u) => {
            if (u.id) map[u.id] = u;
        });
        return map;
    }, [users]);

    // Processed users activity list (excluding /admin)
    const processedUsers = useMemo(() => {
        return Object.entries(userActivityMap).map(([uid, act]) => {
            const profile = usersProfileMap[uid] || {};
            const lastActive = act.lastActive || profile.lastLogin || null;

            // Separate non-admin pages and find top page where user spends the most
            const nonAdminPages = {};
            let computedTotalTime = 0;
            let computedPageViews = 0;
            let topUserPage = '-';
            let topUserPageTime = 0;

            if (act.pages && typeof act.pages === 'object') {
                Object.entries(act.pages).forEach(([key, p]) => {
                    const path = p.path || '';
                    // Exclude any /admin paths from user activity analytics
                    if (!path || path.startsWith('/admin')) return;

                    nonAdminPages[key] = p;
                    const time = Number(p.timeSpent) || 0;
                    computedTotalTime += time;
                    computedPageViews += Number(p.visits) || 0;

                    if (time > topUserPageTime) {
                        topUserPageTime = time;
                        topUserPage = path;
                    }
                });
            }

            // If non-admin pages exist, use computed metrics so /admin isn't counted in totals
            const hasPages = Object.keys(nonAdminPages).length > 0;
            const totalTime = hasPages ? computedTotalTime : (Number(act.totalTime) || 0);
            const pageViews = hasPages ? computedPageViews : (Number(act.pageViews) || 0);

            return {
                id: uid,
                displayName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() ||
                    act.displayName ||
                    profile.displayName ||
                    'Étudiant',
                email: profile.email || act.email || 'Email masqué',
                filiere: profile.filiere || act.filiere || 'Non spécifiée',
                startYear: profile.startYear || '',
                role: profile.role || 'student',
                totalTime,
                pageViews,
                lastActive,
                topPage: topUserPage,
                topPageTime: topUserPageTime,
                pages: nonAdminPages,
            };
        });
    }, [userActivityMap, usersProfileMap]);

    // Processed pages activity list (excluding /admin)
    const processedPages = useMemo(() => {
        const combined = {};

        // 1. Ingest pageActivity
        Object.entries(pageActivityMap).forEach(([key, val]) => {
            const path = val.path || (key === 'root' ? '/' : `/${key.replace(/__/g, '/')}`);
            // Exclude /admin pages completely
            if (!path || path.startsWith('/admin')) return;

            combined[path] = {
                path,
                totalTime: Number(val.totalTime) || 0,
                visits: Number(val.visits) || 0,
                lastActive: val.lastActive || null,
                uniqueUsersSet: new Set(),
            };
        });

        // 2. Ingest userActivity pages to ensure accurate unique users & fallback
        Object.entries(userActivityMap).forEach(([uid, uAct]) => {
            if (!uAct.pages || typeof uAct.pages !== 'object') return;
            Object.values(uAct.pages).forEach((p) => {
                const path = p.path || '/';
                // Exclude /admin pages completely
                if (!path || path.startsWith('/admin')) return;

                if (!combined[path]) {
                    combined[path] = {
                        path,
                        totalTime: 0,
                        visits: 0,
                        lastActive: null,
                        uniqueUsersSet: new Set(),
                    };
                }
                combined[path].uniqueUsersSet.add(uid);
                // If pageActivity wasn't populated, accumulate from users
                if (!pageActivityMap[pathToKey(path)]) {
                    combined[path].totalTime += Number(p.timeSpent) || 0;
                    combined[path].visits += Number(p.visits) || 0;
                    if (p.lastVisited && (!combined[path].lastActive || p.lastVisited > combined[path].lastActive)) {
                        combined[path].lastActive = p.lastVisited;
                    }
                }
            });
        });

        return Object.values(combined).map((p) => ({
            ...p,
            uniqueUsersCount: p.uniqueUsersSet.size,
            avgTimePerVisit: p.visits > 0 ? Math.round(p.totalTime / p.visits) : 0,
        }));
    }, [pageActivityMap, userActivityMap]);

    // High level KPIs
    const kpis = useMemo(() => {
        const totalPlatformSeconds = processedUsers.reduce((sum, u) => sum + u.totalTime, 0);
        const activeUsersCount = processedUsers.filter((u) => u.totalTime > 0).length;
        const totalPagesTracked = processedPages.length;
        const avgSecondsPerUser = activeUsersCount > 0 ? Math.round(totalPlatformSeconds / activeUsersCount) : 0;

        // Top user
        const topUser = [...processedUsers].sort((a, b) => b.totalTime - a.totalTime)[0] || null;

        // Top page
        const topPage = [...processedPages].sort((a, b) => b.totalTime - a.totalTime)[0] || null;

        return {
            totalPlatformSeconds,
            activeUsersCount,
            totalPagesTracked,
            avgSecondsPerUser,
            topUser,
            topPage,
        };
    }, [processedUsers, processedPages]);

    // Filtered and Sorted Users
    const filteredUsers = useMemo(() => {
        let list = [...processedUsers];

        if (userSearch.trim()) {
            const query = userSearch.toLowerCase().trim();
            list = list.filter((u) =>
                u.displayName.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query) ||
                u.filiere.toLowerCase().includes(query)
            );
        }

        if (userSort === 'time_desc') {
            list.sort((a, b) => b.totalTime - a.totalTime);
        } else if (userSort === 'views_desc') {
            list.sort((a, b) => b.pageViews - a.pageViews);
        } else if (userSort === 'recent') {
            list.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
        }

        return list;
    }, [processedUsers, userSearch, userSort]);

    // Max user time for relative progress bar
    const maxUserTime = useMemo(() => {
        return Math.max(...processedUsers.map((u) => u.totalTime), 1);
    }, [processedUsers]);

    // Filtered and Sorted Pages
    const filteredPages = useMemo(() => {
        let list = [...processedPages];

        if (pageSearch.trim()) {
            const query = pageSearch.toLowerCase().trim();
            list = list.filter((p) => p.path.toLowerCase().includes(query));
        }

        if (pageSort === 'time_desc') {
            list.sort((a, b) => b.totalTime - a.totalTime);
        } else if (pageSort === 'visits_desc') {
            list.sort((a, b) => b.visits - a.visits);
        } else if (pageSort === 'avg_desc') {
            list.sort((a, b) => b.avgTimePerVisit - a.avgTimePerVisit);
        }

        return list;
    }, [processedPages, pageSearch, pageSort]);

    // Max page time for percentage computation
    const maxPageTime = useMemo(() => {
        return Math.max(...processedPages.map((p) => p.totalTime), 1);
    }, [processedPages]);

    // Chart Data: Top 8 pages by time spent
    const topPagesChartData = useMemo(() => {
        return [...processedPages]
            .sort((a, b) => b.totalTime - a.totalTime)
            .slice(0, 8)
            .map((p) => ({
                name: p.path.length > 22 ? p.path.slice(0, 20) + '…' : p.path,
                fullPath: p.path,
                minutes: Math.round(p.totalTime / 60),
                seconds: p.totalTime,
                visits: p.visits,
            }));
    }, [processedPages]);

    // Helper to get initials from display name
    const getUserInitials = (name) => {
        if (!name) return 'ET';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    };

    // Selected user specific analytics
    const selectedUserStats = useMemo(() => {
        if (!selectedUserDetail) return null;

        const totalSeconds = Number(selectedUserDetail.totalTime) || 0;
        const pageViews = Number(selectedUserDetail.pageViews) || 0;
        const allPages = Object.values(selectedUserDetail.pages || {}).filter(
            (p) => p.path && !p.path.startsWith('/admin')
        );
        const distinctPagesCount = allPages.length;

        // Top page calculation for the selected user
        let topPage = selectedUserDetail.topPage || '-';
        let topPageTime = selectedUserDetail.topPageTime || 0;

        if (topPage.startsWith('/admin') || topPage === '-') {
            topPage = '-';
            topPageTime = 0;
            allPages.forEach((p) => {
                const time = Number(p.timeSpent) || 0;
                if (time > topPageTime) {
                    topPageTime = time;
                    topPage = p.path || '-';
                }
            });
        }

        const topPagePercent = totalSeconds > 0 ? Math.round((topPageTime / totalSeconds) * 100) : 0;
        const avgTimePerVisit = pageViews > 0 ? Math.round(totalSeconds / pageViews) : 0;

        return {
            totalSeconds,
            pageViews,
            distinctPagesCount,
            topPage,
            topPageTime,
            topPagePercent,
            avgTimePerVisit
        };
    }, [selectedUserDetail]);

    // Selected user pages filtered & sorted
    const selectedUserPages = useMemo(() => {
        if (!selectedUserDetail?.pages) return [];
        let list = Object.values(selectedUserDetail.pages)
            .filter((p) => p.path && !p.path.startsWith('/admin'))
            .sort((a, b) => (Number(b.timeSpent) || 0) - (Number(a.timeSpent) || 0));

        if (userModalSearch.trim()) {
            const q = userModalSearch.toLowerCase().trim();
            list = list.filter((p) => p.path && p.path.toLowerCase().includes(q));
        }
        return list;
    }, [selectedUserDetail, userModalSearch]);

    // Handle CSV Export
    const handleExportCSV = () => {
        exportActivityReportCSV(processedUsers, processedPages);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header with Title and Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            Temps d&apos;activité & Navigation
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Analyse détaillée du temps passé par les utilisateurs connectés et des pages les plus consultées pour optimiser l&apos;expérience utilisateur.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        className="gap-2 rounded-xl text-xs font-semibold"
                        title="Exporter un rapport CSV"
                    >
                        <Download className="w-4 h-4" />
                        Exporter CSV
                    </Button>
                </div>
            </div>

            {/* KPI Summary Cards (Overall Platform Statistics) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border/80 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Temps total cumulé
                        </CardTitle>
                        <Clock className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tight text-foreground">
                            {formatDuration(kpis.totalPlatformSeconds)}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Sur l&apos;ensemble des étudiants connectés
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/80 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Utilisateurs actifs
                        </CardTitle>
                        <Users className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tight text-foreground">
                            {kpis.activeUsersCount}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Comptes avec activité enregistrée
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/80 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Moyenne / Utilisateur
                        </CardTitle>
                        <Sparkles className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tight text-foreground">
                            {formatDuration(kpis.avgSecondsPerUser)}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Temps moyen passé par compte actif
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/80 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Page n°1 la plus consultée
                        </CardTitle>
                        <Trophy className="w-4 h-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-black tracking-tight truncate text-foreground" title={kpis.topPage?.path || 'Aucune'}>
                            {kpis.topPage?.path || 'Aucune'}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            {kpis.topPage ? `${formatDuration(kpis.topPage.totalTime)} (${kpis.topPage.visits} visites)` : 'Pas encore de données'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Sub-Tabs */}
            <div className="flex border-b border-border gap-2">
                <button
                    type="button"
                    onClick={() => setActiveSubTab('users')}
                    className={`pb-3 px-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                        activeSubTab === 'users'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    Utilisateurs les plus actifs ({processedUsers.length})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveSubTab('pages')}
                    className={`pb-3 px-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                        activeSubTab === 'pages'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <FileText className="w-4 h-4" />
                    Pages & Chemins les plus visités ({processedPages.length})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveSubTab('insights')}
                    className={`pb-3 px-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                        activeSubTab === 'insights'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Sparkles className="w-4 h-4" />
                    Insights Expérience Utilisateur
                </button>
            </div>

            {/* SUBTAB 1: USERS */}
            {activeSubTab === 'users' && (
                <div className="space-y-4">
                    {/* Filter and Search Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher par nom, email ou filière..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                className="pl-9 h-10 rounded-xl"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            <select
                                value={userSort}
                                onChange={(e) => setUserSort(e.target.value)}
                                className="h-10 rounded-xl border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="time_desc">Trier par : Temps le plus long</option>
                                <option value="views_desc">Trier par : Pages les plus vues</option>
                                <option value="recent">Trier par : Récemment actif</option>
                            </select>
                        </div>
                    </div>

                    {/* Users Table */}
                    <Card className="border-border/80 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-16 text-center">Rang</TableHead>
                                        <TableHead>Utilisateur</TableHead>
                                        <TableHead>Filière</TableHead>
                                        <TableHead className="w-52">Temps Total Global</TableHead>
                                        <TableHead className="text-center">Pages Vues</TableHead>
                                        <TableHead className="min-w-[200px]">Page où il passe le plus de temps</TableHead>
                                        <TableHead>Dernière Activité</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                                                Chargement des activités...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                                Aucune activité trouvée pour ces critères.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredUsers.map((u, idx) => {
                                            const timePercent = Math.min(100, Math.round((u.totalTime / maxUserTime) * 100));
                                            const topPageShare = u.totalTime > 0 ? Math.round((u.topPageTime / u.totalTime) * 100) : 0;

                                            return (
                                                <TableRow
                                                    key={u.id}
                                                    onClick={() => {
                                                        setSelectedUserDetail(u);
                                                        setUserModalSearch('');
                                                    }}
                                                    className="hover:bg-primary/5 cursor-pointer transition-colors group"
                                                    title={`Cliquer pour voir l'aperçu détaillé de ${u.displayName}`}
                                                >
                                                    <TableCell className="text-center font-bold">
                                                        {idx === 0 ? (
                                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-500/10 text-yellow-600 font-black text-xs border border-yellow-500/30">
                                                                🥇 1
                                                            </span>
                                                        ) : idx === 1 ? (
                                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400/10 text-slate-600 dark:text-slate-300 font-black text-xs border border-slate-400/30">
                                                                🥈 2
                                                            </span>
                                                        ) : idx === 2 ? (
                                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/10 text-amber-700 dark:text-amber-500 font-black text-xs border border-amber-700/30">
                                                                🥉 3
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-foreground text-sm flex items-center gap-1.5 group-hover:text-primary transition-colors">
                                                                {u.displayName}
                                                                {u.role === 'admin' && (
                                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase border-primary/30 text-primary">
                                                                        Admin
                                                                    </Badge>
                                                                )}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">{u.email}</span>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        <Badge variant="secondary" className="text-[11px] font-normal">
                                                            {u.filiere}
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="font-bold text-primary">
                                                                    {formatDuration(u.totalTime)}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {timePercent}%
                                                                </span>
                                                            </div>
                                                            <Progress value={timePercent} className="h-1.5" />
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-center font-bold text-xs">
                                                        {u.pageViews}
                                                    </TableCell>

                                                    {/* Page where the user spends the most separately */}
                                                    <TableCell>
                                                        {u.topPage && u.topPage !== '-' ? (
                                                            <div className="space-y-1">
                                                                <span className="text-xs font-mono font-semibold text-foreground truncate max-w-[190px] block" title={u.topPage}>
                                                                    {u.topPage}
                                                                </span>
                                                                <div className="flex items-center gap-1.5 text-[11px]">
                                                                    <span className="font-bold text-primary flex items-center gap-1">
                                                                        <Clock className="w-3 h-3 text-primary shrink-0" />
                                                                        {formatDuration(u.topPageTime)}
                                                                    </span>
                                                                    {u.totalTime > 0 && (
                                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal border-primary/20 text-muted-foreground bg-primary/5">
                                                                            {topPageShare}% de son temps
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">Aucune page</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {formatRelativeTime(u.lastActive)}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedUserDetail(u);
                                                                setUserModalSearch('');
                                                            }}
                                                            className="h-8 rounded-lg text-xs font-semibold gap-1.5 hover:bg-primary hover:text-primary-foreground transition-all"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            Aperçu
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            )}

            {/* SUBTAB 2: PAGES */}
            {activeSubTab === 'pages' && (
                <div className="space-y-6">
                    {/* Visual Bar Chart for Top Pages */}
                    {topPagesChartData.length > 0 && (
                        <Card className="border-border/80 shadow-sm p-6">
                            <CardHeader className="p-0 pb-4">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-primary" />
                                    Top 8 des pages par temps cumulé (en minutes)
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Visualisation des sections où la communauté passe le plus clair de son temps (hors espace administration).
                                </CardDescription>
                            </CardHeader>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topPagesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                                        <XAxis
                                            dataKey="name"
                                            angle={-20}
                                            textAnchor="end"
                                            interval={0}
                                            tick={{ fontSize: 11 }}
                                        />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const item = payload[0].payload;
                                                    return (
                                                        <div className="bg-popover border border-border p-2.5 rounded-xl shadow-lg text-xs">
                                                            <p className="font-bold text-foreground mb-1">{item.fullPath}</p>
                                                            <p className="text-primary font-semibold">Temps : {formatDuration(item.seconds)}</p>
                                                            <p className="text-muted-foreground">Visites : {item.visits}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                                            {topPagesChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    )}

                    {/* Filter and Search Bar for Pages */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Filtrer par chemin (ex: /resources, /clubs, /chat)..."
                                value={pageSearch}
                                onChange={(e) => setPageSearch(e.target.value)}
                                className="pl-9 h-10 rounded-xl"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            <select
                                value={pageSort}
                                onChange={(e) => setPageSort(e.target.value)}
                                className="h-10 rounded-xl border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="time_desc">Trier par : Temps le plus long</option>
                                <option value="visits_desc">Trier par : Nombre de visites</option>
                                <option value="avg_desc">Trier par : Temps moyen / visite</option>
                            </select>
                        </div>
                    </div>

                    {/* Pages Table */}
                    <Card className="border-border/80 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-16 text-center">Rang</TableHead>
                                        <TableHead>Chemin de la page (URL Path)</TableHead>
                                        <TableHead className="w-56">Temps Total Cumulé</TableHead>
                                        <TableHead className="text-center">Visites Totales</TableHead>
                                        <TableHead className="text-center">Temps Moyen / Visite</TableHead>
                                        <TableHead className="text-center">Étudiants Uniques</TableHead>
                                        <TableHead className="text-right">Lien</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                                                Chargement des pages...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredPages.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                                Aucune page trouvée pour ces critères.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredPages.map((p, idx) => {
                                            const pagePercent = Math.min(100, Math.round((p.totalTime / maxPageTime) * 100));
                                            return (
                                                <TableRow key={p.path} className="hover:bg-muted/30 transition-colors">
                                                    <TableCell className="text-center font-bold text-xs text-muted-foreground">
                                                        #{idx + 1}
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-xs font-semibold text-foreground">
                                                                {p.path}
                                                            </span>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="font-bold text-primary">
                                                                    {formatDuration(p.totalTime)}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {pagePercent}%
                                                                </span>
                                                            </div>
                                                            <Progress value={pagePercent} className="h-1.5" />
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-center font-bold text-xs">
                                                        {p.visits}
                                                    </TableCell>

                                                    <TableCell className="text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {formatDuration(p.avgTimePerVisit)}
                                                    </TableCell>

                                                    <TableCell className="text-center text-xs text-muted-foreground">
                                                        {p.uniqueUsersCount}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <Link
                                                            href={p.path}
                                                            target="_blank"
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                                                            title={`Visiter ${p.path}`}
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            )}

            {/* SUBTAB 3: INSIGHTS & UX OPTIMIZATION */}
            {activeSubTab === 'insights' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-border/80 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <Flame className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Piliers d&apos;engagement élevé</h3>
                                <p className="text-xs text-muted-foreground">Pages où les étudiants passent le plus de temps d&apos;étude actif</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {processedPages
                                .sort((a, b) => b.totalTime - a.totalTime)
                                .slice(0, 5)
                                .map((p, idx) => (
                                    <div key={p.path} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                                        <div className="flex items-center gap-2 truncate pr-2">
                                            <span className="font-black text-primary w-4">#{idx + 1}</span>
                                            <span className="font-mono font-medium truncate">{p.path}</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="font-bold text-foreground block">{formatDuration(p.totalTime)}</span>
                                            <span className="text-[10px] text-muted-foreground">{p.visits} visites</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </Card>

                    <Card className="border-border/80 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <Compass className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground">Recommandations pour l&apos;expérience</h3>
                                <p className="text-xs text-muted-foreground">Exploiter ces données pour améliorer l&apos;ESTT Community</p>
                            </div>
                        </div>

                        <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
                            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <strong className="text-foreground">Optimisation des ressources phares :</strong>
                                    {' '}Les cours et filières qui accumulent le plus de temps doivent recevoir les mises à jour et annales en priorité.
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <strong className="text-foreground">Amélioration des pages de transition :</strong>
                                    {' '}Pour les pages avec beaucoup de visites mais un temps très court, proposer des raccourcis directs ou une recherche plus visible.
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <strong className="text-foreground">Valorisation des contributeurs actifs :</strong>
                                    {' '}Les étudiants les plus assidus peuvent être sollicités pour modérer des espaces de travail ou partager de nouveaux documents.
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* User Overview Dialog (Specific Student Analytics) */}
            <Dialog
                open={Boolean(selectedUserDetail)}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedUserDetail(null);
                        setUserModalSearch('');
                    }
                }}
            >
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar p-6 md:p-8 rounded-2xl border-none shadow-2xl">
                    <DialogHeader className="space-y-4">
                        {/* User Profile Banner */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-muted/40 border border-border/80">
                            <div className="flex items-center gap-3.5">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground font-black text-xl flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                                    {getUserInitials(selectedUserDetail?.displayName)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <DialogTitle className="text-xl font-black text-foreground">
                                            {selectedUserDetail?.displayName}
                                        </DialogTitle>
                                        {selectedUserDetail?.role === 'admin' ? (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase border-primary/30 text-primary font-bold">
                                                Administrateur
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                                                Étudiant
                                            </Badge>
                                        )}
                                    </div>
                                    <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                                        <span>{selectedUserDetail?.email}</span>
                                        <span>•</span>
                                        <span className="font-semibold text-foreground">{selectedUserDetail?.filiere}</span>
                                        {selectedUserDetail?.startYear && (
                                            <>
                                                <span>•</span>
                                                <span>Promo {selectedUserDetail.startYear}</span>
                                            </>
                                        )}
                                    </DialogDescription>
                                </div>
                            </div>

                            <div className="sm:text-right shrink-0">
                                <span className="text-[11px] text-muted-foreground block">Dernière activité</span>
                                <span className="text-xs font-bold text-foreground">
                                    {formatRelativeTime(selectedUserDetail?.lastActive)}
                                </span>
                            </div>
                        </div>

                        {/* 4 User-specific KPI cards */}
                        {selectedUserStats && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                                <div className="p-3.5 rounded-xl bg-card border border-border shadow-sm">
                                    <div className="flex items-center justify-between text-muted-foreground mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Temps Global</span>
                                        <Clock className="w-3.5 h-3.5 text-primary" />
                                    </div>
                                    <div className="text-base sm:text-lg font-black text-primary">
                                        {formatDuration(selectedUserStats.totalSeconds)}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate" title={formatDurationDetailed(selectedUserStats.totalSeconds)}>
                                        {formatDurationDetailed(selectedUserStats.totalSeconds)}
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl bg-card border border-border shadow-sm">
                                    <div className="flex items-center justify-between text-muted-foreground mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Page n°1</span>
                                        <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                                    </div>
                                    <div className="text-base sm:text-lg font-black text-foreground truncate" title={selectedUserStats.topPage}>
                                        {selectedUserStats.topPage}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {formatDuration(selectedUserStats.topPageTime)} ({selectedUserStats.topPagePercent}%)
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl bg-card border border-border shadow-sm">
                                    <div className="flex items-center justify-between text-muted-foreground mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Pages Vues</span>
                                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                                    </div>
                                    <div className="text-base sm:text-lg font-black text-foreground">
                                        {selectedUserStats.pageViews}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        ~{formatDuration(selectedUserStats.avgTimePerVisit)} / visite
                                    </p>
                                </div>

                                <div className="p-3.5 rounded-xl bg-card border border-border shadow-sm">
                                    <div className="flex items-center justify-between text-muted-foreground mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Diversité</span>
                                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                                    </div>
                                    <div className="text-base sm:text-lg font-black text-foreground">
                                        {selectedUserStats.distinctPagesCount}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Pages distinctes
                                    </p>
                                </div>
                            </div>
                        )}
                    </DialogHeader>

                    {/* Detailed Breakdown Per Page for this user */}
                    <div className="space-y-4 mt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-primary" />
                                    Où passe-t-il le plus de temps ? (Détail par page)
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Classement de toutes les pages selon le temps passé par cet utilisateur.
                                </p>
                            </div>

                            {selectedUserPages.length > 3 && (
                                <div className="relative w-full sm:w-64">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Filtrer les pages..."
                                        value={userModalSearch}
                                        onChange={(e) => setUserModalSearch(e.target.value)}
                                        className="pl-8 h-8 rounded-lg text-xs"
                                    />
                                </div>
                            )}
                        </div>

                        {selectedUserPages.length > 0 ? (
                            <div className="border border-border/80 rounded-2xl overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-14 text-center">Rang</TableHead>
                                            <TableHead>Chemin de la page (URL Path)</TableHead>
                                            <TableHead className="w-44">Temps Passé</TableHead>
                                            <TableHead className="text-center w-24">Visites</TableHead>
                                            <TableHead className="text-right">Dernière Consultation</TableHead>
                                            <TableHead className="w-12 text-center"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedUserPages.map((page, pIdx) => {
                                            const pageSeconds = Number(page.timeSpent) || 0;
                                            const userTotalSec = selectedUserStats?.totalSeconds || 1;
                                            const sharePercent = Math.min(100, Math.round((pageSeconds / userTotalSec) * 100));

                                            return (
                                                <TableRow key={page.path || pIdx} className="hover:bg-muted/30 transition-colors">
                                                    <TableCell className="text-center font-bold text-xs text-muted-foreground">
                                                        {pIdx === 0 ? (
                                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-600 font-black text-[11px] border border-yellow-500/30">
                                                                🥇
                                                            </span>
                                                        ) : pIdx === 1 ? (
                                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/10 text-slate-600 dark:text-slate-300 font-black text-[11px] border border-slate-400/30">
                                                                🥈
                                                            </span>
                                                        ) : pIdx === 2 ? (
                                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/10 text-amber-700 dark:text-amber-500 font-black text-[11px] border border-amber-700/30">
                                                                🥉
                                                            </span>
                                                        ) : (
                                                            `#${pIdx + 1}`
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        <span className="font-mono text-xs font-semibold text-foreground block truncate max-w-[260px]" title={page.path}>
                                                            {page.path}
                                                        </span>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="font-bold text-primary">
                                                                    {formatDuration(pageSeconds)}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground font-semibold">
                                                                    {sharePercent}%
                                                                </span>
                                                            </div>
                                                            <Progress value={sharePercent} className="h-1.5" />
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-center text-xs font-bold">
                                                        {page.visits || 1}
                                                    </TableCell>

                                                    <TableCell className="text-right text-xs text-muted-foreground">
                                                        {formatRelativeTime(page.lastVisited)}
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <Link
                                                            href={page.path}
                                                            target="_blank"
                                                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                                                            title={`Visiter ${page.path}`}
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="p-8 text-center rounded-2xl bg-muted/30 border border-dashed border-border text-xs text-muted-foreground">
                                Aucun détail par page disponible pour cet utilisateur.
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-6 flex sm:justify-end gap-2 pt-2 border-t border-border">
                        <Button
                            variant="outline"
                            onClick={() => setSelectedUserDetail(null)}
                            className="rounded-xl px-5 h-10 text-xs font-semibold"
                        >
                            Fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
