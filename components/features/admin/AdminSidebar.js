import {
    LayoutDashboard,
    FileText,
    Users,
    AlertCircle,
    Building2,
    Edit3,
    Megaphone,
    CreditCard,
    Settings,
    ShieldCheck,
    Bell,
    Zap,
    Bug,
    Link,
    Gift,
    Trophy,
    MessageSquare,
    ChevronsLeft
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const SMOOTH = 'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]';

export default function AdminSidebar({
    activeTab,
    setActiveTab,
    profile,
    stats: _stats = {},
    openReportsCount = 0,
    openBugReportsCount = 0,
    openClubRequestsCount = 0,
    openClubChangeRequestsCount = 0,
    unreadMessagesCount = 0,
    isOpen,
    setIsOpen,
    isCollapsed,
    setIsCollapsed
}) {
    const labelClass = `overflow-hidden ${SMOOTH} ${
        isCollapsed ? 'md:max-w-0 md:opacity-0 md:-ml-3' : 'md:max-w-[240px] md:opacity-100'
    }`;
    const badgeClass = `ml-auto px-1.5 h-5 min-w-5 flex items-center justify-center overflow-hidden ${SMOOTH} ${
        isCollapsed ? 'md:max-w-0 md:min-w-0 md:px-0 md:opacity-0 md:-ml-3' : 'md:max-w-16 md:opacity-100'
    }`;

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 z-40 md:hidden backdrop-blur-[2px]"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`
                fixed md:sticky top-0 md:top-16 left-0 z-50 md:z-40 h-screen md:h-[calc(100vh_-_4rem)]
                w-64 ${isCollapsed ? 'md:w-24' : ''} bg-card border-r border-border p-6
                flex flex-col gap-8 ${SMOOTH}
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                shrink-0
            `}>
                <div className="relative flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <span className={`font-black tracking-tight text-xl overflow-hidden whitespace-nowrap ${SMOOTH} ${isCollapsed ? 'md:max-w-0 md:opacity-0 md:-ml-2' : 'md:max-w-[240px] md:opacity-100'}`}>Admin<span className="text-primary">Panel</span></span>
                    </div>

                    {/* Collapse toggle (desktop only) */}
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        aria-label={isCollapsed ? 'Déplier le menu' : 'Replier le menu'}
                        title={isCollapsed ? 'Déplier le menu' : 'Replier le menu'}
                        className={`hidden md:flex absolute -right-9 top-1 z-10 w-6 h-6 items-center justify-center rounded-full bg-card border border-border shadow-md text-muted-foreground hover:text-foreground hover:bg-accent hover:scale-110 ${SMOOTH}`}
                    >
                        <ChevronsLeft className={`w-3.5 h-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isCollapsed ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                <nav className="flex flex-col gap-1 flex-1 min-h-0 -mr-6 pr-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    <Button
                        variant={activeTab === 'overview' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('overview')}
                        title={isCollapsed ? "Vue d'ensemble" : undefined}
                    >
                        <LayoutDashboard className="w-4 h-4" /> <span className={labelClass}>Vue d&apos;ensemble</span>
                    </Button>
                    <Button
                        variant={activeTab === 'resources' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('resources')}
                        title={isCollapsed ? 'Ressources' : undefined}
                    >
                        <FileText className="w-4 h-4" /> <span className={labelClass}>Ressources</span>
                    </Button>
                    <Button
                        variant={activeTab === 'projects' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('projects')}
                        title={isCollapsed ? 'Projects' : undefined}
                    >
                        <Trophy className="w-4 h-4" /> <span className={labelClass}>Projects</span>
                    </Button>
                    <Button
                        variant={activeTab === 'fastContribute' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
                        onClick={() => setActiveTab('fastContribute')}
                        title={isCollapsed ? 'Contribuer (Vite)' : undefined}
                    >
                        <Zap className="w-4 h-4" /> <span className={labelClass}>Contribuer (Vite)</span>
                    </Button>

                    <Button
                        variant={activeTab === 'users' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('users')}
                        title={isCollapsed ? 'Utilisateurs' : undefined}
                    >
                        <Users className="w-4 h-4" /> <span className={labelClass}>Utilisateurs</span>
                    </Button>
                    <Button
                        variant={activeTab === 'reports' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('reports')}
                        title={isCollapsed ? 'Signalements' : undefined}
                    >
                        <AlertCircle className="w-4 h-4" /> <span className={labelClass}>Signalements</span>
                        {openReportsCount > 0 && <Badge variant="destructive" className={badgeClass}>{openReportsCount}</Badge>}
                    </Button>
                    <Button
                        variant={activeTab === 'bugReports' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('bugReports')}
                        title={isCollapsed ? 'Bugs' : undefined}
                    >
                        <Bug className="w-4 h-4" /> <span className={labelClass}>Bugs</span>
                        {openBugReportsCount > 0 && <Badge variant="destructive" className={badgeClass}>{openBugReportsCount}</Badge>}
                    </Button>
                    <Button
                        variant={activeTab === 'clubRequests' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('clubRequests')}
                        title={isCollapsed ? 'Demandes de clubs' : undefined}
                    >
                        <Building2 className="w-4 h-4" /> <span className={labelClass}>Demandes de clubs</span>
                        {openClubRequestsCount > 0 && <Badge variant="default" className={badgeClass}>{openClubRequestsCount}</Badge>}
                    </Button>
                    <Button
                        variant={activeTab === 'clubChangeRequests' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('clubChangeRequests')}
                        title={isCollapsed ? 'Modifications clubs' : undefined}
                    >
                        <Edit3 className="w-4 h-4" /> <span className={labelClass}>Modifications clubs</span>
                        {openClubChangeRequestsCount > 0 && <Badge variant="default" className={badgeClass}>{openClubChangeRequestsCount}</Badge>}
                    </Button>
                    <Button
                        variant={activeTab === 'announcements' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('announcements')}
                        title={isCollapsed ? 'Annonces Globales' : undefined}
                    >
                        <Megaphone className="w-4 h-4" /> <span className={labelClass}>Annonces Globales</span>
                    </Button>
                    <Button
                        variant={activeTab === 'ads' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('ads')}
                        title={isCollapsed ? 'Annonces Étudiants' : undefined}
                    >
                        <CreditCard className="w-4 h-4" /> <span className={labelClass}>Annonces Étudiants</span>
                    </Button>
                    <Button
                        variant={activeTab === 'communication' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('communication')}
                        title={isCollapsed ? 'Communication' : undefined}
                    >
                        <Megaphone className="w-4 h-4" /> <span className={labelClass}>Communication</span>
                    </Button>
                    <Button
                        variant={activeTab === 'notifications' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('notifications')}
                        title={isCollapsed ? 'Notifications' : undefined}
                    >
                        <Bell className="w-4 h-4" /> <span className={labelClass}>Notifications</span>
                    </Button>
                    <Button
                        variant={activeTab === 'messages' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('messages')}
                        title={isCollapsed ? 'Messages' : undefined}
                    >
                        <MessageSquare className="w-4 h-4" /> <span className={labelClass}>Messages</span>
                        {unreadMessagesCount > 0 && <Badge variant="destructive" className={badgeClass}>{unreadMessagesCount}</Badge>}
                    </Button>

                    <Button
                        variant={activeTab === 'rewardCodes' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('rewardCodes')}
                        title={isCollapsed ? 'Codes Récompenses' : undefined}
                    >
                        <Gift className="w-4 h-4" /> <span className={labelClass}>Codes Récompenses</span>
                    </Button>

                    <Button
                        variant={activeTab === 'shortUrls' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('shortUrls')}
                        title={isCollapsed ? 'URLs Courts' : undefined}
                    >
                        <Link className="w-4 h-4" /> <span className={labelClass}>URLs Courts</span>
                    </Button>

                    <Button
                        variant={activeTab === 'settings' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('settings')}
                        title={isCollapsed ? 'Paramètres' : undefined}
                    >
                        <Settings className="w-4 h-4" /> <span className={labelClass}>Paramètres</span>
                    </Button>
                </nav>

                <div className="mt-auto flex flex-col shrink-0">
                    <div className={`p-4 bg-muted rounded-2xl border border-border overflow-hidden ${SMOOTH} ${
                        isCollapsed ? 'md:max-h-0 md:opacity-0 md:p-0 md:border-0' : 'md:max-h-48 md:opacity-100'
                    }`}>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Connecté en tant que</p>
                        <p className="text-sm font-bold truncate">{profile?.firstName} {profile?.lastName}</p>
                        <Badge variant="outline" className="mt-2 bg-card text-[9px] font-black uppercase tracking-tighter border-primary/20 text-primary">Administrateur</Badge>
                    </div>

                    {/* Collapsed footer: initials only */}
                    <div
                        className={`hidden md:flex mx-auto items-center justify-center overflow-hidden bg-muted border border-border rounded-full text-xs font-black uppercase w-0 h-0 opacity-0 shrink-0 ${SMOOTH} ${
                            isCollapsed ? 'md:w-10 md:h-10 md:opacity-100' : ''
                        }`}
                        title={`${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()}
                    >
                        {(profile?.firstName?.[0] || '?')}{profile?.lastName?.[0] || ''}
                    </div>
                </div>
            </aside>
        </>
    );
}
