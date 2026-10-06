import {
    LayoutDashboard,
    FileText,
    Users,
    AlertCircle,
    ShieldCheck,
    Zap,
    BookOpen,
    ChevronsLeft,
    } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const SMOOTH = 'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]';

export default function ModeratorSidebar({
    activeTab,
    setActiveTab,
    profile,
    stats: _stats = {},
    openReportsCount = 0,
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
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <span className={`font-black tracking-tight text-xl overflow-hidden whitespace-nowrap ${SMOOTH} ${isCollapsed ? 'md:max-w-0 md:opacity-0 md:-ml-2' : 'md:max-w-[240px] md:opacity-100'}`}>Moderator<span className="text-blue-600">Panel</span></span>
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
                        variant={activeTab === 'fastContribute' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11 border-dashed border-blue-600/20 bg-blue-600/5 hover:bg-blue-600/10 text-blue-600"
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

                    <div className="h-px bg-muted my-2" />

                    <Button
                        variant={activeTab === 'documentation' ? 'default' : 'ghost'}
                        className="justify-start gap-3 h-11"
                        onClick={() => setActiveTab('documentation')}
                        title={isCollapsed ? 'Documentation' : undefined}
                    >
                        <BookOpen className="w-4 h-4" /> <span className={labelClass}>Documentation</span>
                    </Button>
                </nav>

                <div className="mt-auto flex flex-col shrink-0">
                    <div className={`p-4 bg-muted rounded-2xl border border-border overflow-hidden ${SMOOTH} ${
                        isCollapsed ? 'md:max-h-0 md:opacity-0 md:p-0 md:border-0' : 'md:max-h-48 md:opacity-100'
                    }`}>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Connecté en tant que</p>
                        <p className="text-sm font-bold truncate">{profile?.firstName} {profile?.lastName}</p>
                        <Badge variant="outline" className="mt-2 bg-card text-[9px] font-black uppercase tracking-tighter border-blue-600/20 text-blue-600">Modérateur</Badge>
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
