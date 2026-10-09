'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, ref, get, query, orderByChild, equalTo } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { isClubAdmin } from '@/lib/clubUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrganizationalChart from '@/components/features/admin/OrganizationalChart';
import ClubMemberCard from '@/components/features/clubs/ClubMemberCard';
import StructuredData from '@/components/layout/StructuredData';
import { Loader2, Settings, ArrowLeft, ChevronLeft, ChevronRight, User, Ticket } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getClubBySlug, getClubPath } from '@/lib/clubUtils';

function FaviconWithFallback({ hostname, alt }) {
    const [attempt, setAttempt] = useState(0);
    const sources = [
        `https://favicondl.com/api/extract?url=${hostname}&size=64`,
        `https://${hostname}/apple-touch-icon.png`
    ];

    if (attempt >= sources.length) {
        return <i className="fa-solid fa-globe text-lg"></i>;
    }

    return (
        <img
            src={sources[attempt]}
            alt={alt}
            className="w-5 h-5"
            onError={() => setAttempt(a => a + 1)}
        />
    );
}

export default function ClubProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const clubId = params.clubId;

    const [club, setClub] = useState(null);
    const [clubPosts, setClubPosts] = useState([]);
    const [headerPosts, setHeaderPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userTickets, setUserTickets] = useState([]);

    // Carousel state
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        if (clubId) {
            fetchClubData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId]);

    useEffect(() => {
        if (club && user) {
            setIsAdmin(isClubAdmin(user.email, club));
        }
    }, [club, user]);

    useEffect(() => {
        if (user && clubId) {
            fetchUserTickets();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, clubId]);

    // Carousel Autoplay
    useEffect(() => {
        if (headerPosts.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % headerPosts.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [headerPosts.length]);

    const fetchClubData = async () => {
        if (!db) {
            setLoading(false);
            return;
        }

        try {
            // Fetch club data
            const clubData = await getClubBySlug(clubId);
            if (!clubData) {
                router.push('/clubs');
                return;
            }
            setClub(clubData);

            // Fetch club posts
            const postsRef = ref(db, `clubPosts/${clubData.id}`);
            const postsSnap = await get(postsRef);

            if (postsSnap.exists()) {
                const postsData = postsSnap.val();
                const postsArray = Object.entries(postsData)
                    .map(([id, data]) => ({ id, ...data }))
                    .sort((a, b) => b.createdAt - a.createdAt);

                setClubPosts(postsArray);

                // Content for header carousel (announcements/activities with images preferred, or just recent)
                // Prioritize items with images
                const announcements = postsArray.filter(p => ['announcement', 'activity'].includes(p.type));
                const withImages = announcements.filter(p => p.imageUrl);
                const withoutImages = announcements.filter(p => !p.imageUrl);

                // Combine: items with images first, then others, max 5 total
                const headerItems = [...withImages, ...withoutImages].slice(0, 5);
                setHeaderPosts(headerItems);
            }
        } catch (error) {
            console.error('Error fetching club data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserTickets = async () => {
        if (!user || !db) return;

        try {
            const ticketsRef = ref(db, 'tickets');
            const q = query(ticketsRef, orderByChild('userId'), equalTo(user.uid));
            const snap = await get(q);

            if (snap.exists()) {
                const data = snap.val();
                const tickets = Object.entries(data)
                    .map(([id, t]) => ({ id, ...t }))
                    .filter(t => t.clubId === clubData.id)
                    .sort((a, b) => b.createdAt - a.createdAt);
                setUserTickets(tickets);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        }
    };

    const getAuthorInfo = (email) => {
        if (!club) return { name: 'Membre du club', role: '' };

        // Check organigram
        if (club.organizationalChart) {
            const orgMember = Object.values(club.organizationalChart).find(m => m.email === email);
            if (orgMember) return { name: orgMember.name, role: orgMember.role };
        }

        // Check members list
        if (club.members) {
            const member = club.members.find(m => m.email === email);
            if (member) return { name: member.name, role: 'Membre' };
        }

        return { name: 'Membre du club', role: '' };
    };

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % headerPosts.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + headerPosts.length) % headerPosts.length);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!club) return null;

    const clubStructuredData = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": club.name,
        "description": club.description,
        "url": `https://estt.ma/clubs/${clubId}`,
        "logo": club.logo,
        "parentOrganization": {
            "@type": "EducationalOrganization",
            "name": "EST Tétouan"
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-background">
            <StructuredData data={clubStructuredData} />            <style jsx global>{`
                .theme-text { color: ${club.themeColor || '#64748b'}; }
                .theme-bg { background-color: ${club.themeColor || '#64748b'}; }
                .theme-border { border-color: ${club.themeColor || '#64748b'}; }
                .theme-hover-text:hover { color: ${club.themeColor || '#64748b'}; }
                .theme-hover-bg:hover { background-color: ${club.themeColor || '#64748b'}; }
            `}</style>
            {/* Header / Hero Section */}
            <section className="relative bg-card border-b overflow-hidden">
                <div className="container py-8 px-4 md:px-6 relative z-10">

                    <div className="flex flex-col gap-6">
                        <Button variant="ghost" size="sm" asChild className="self-start gap-2 mb-2">
                            <Link href="/clubs">
                                <ArrowLeft className="w-4 h-4" />
                                Retour aux clubs
                            </Link>
                        </Button>

                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                            {/* Left: Club Brand */}
                            <div className="flex flex-col items-center md:items-start gap-4 flex-shrink-0 lg:w-1/3">
                                <div className="relative w-28 h-28 md:w-40 md:h-40 rounded-2xl overflow-hidden bg-card border-4 border-white shadow-lg dark:border-border mx-auto md:mx-0 shrink-0">
                                    {club.logo ? (
                                        <Image
                                            src={club.logo}
                                            alt={`${club.name} logo`}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div
                                            className="w-full h-full flex items-center justify-center text-4xl font-bold bg-muted"
                                            style={{ color: club.themeColor || '#64748b' }}
                                        >
                                            {club.name?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="text-center md:text-left space-y-2">
                                    <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight leading-tight">{club.name}</h1>
                                        {club.verified && (
                                            <div className="group relative flex items-center">
                                                <span className="material-symbols-outlined select-none text-blue-500" style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}>
                                                    verified
                                                </span>
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                                    Club Vérifié
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto md:mx-0 leading-relaxed font-medium text-justify">{club.description}</p>

                                    {club.socialLinks && Object.values(club.socialLinks).some(link => link) && (
                                        <div className="flex flex-wrap gap-3 pt-2 justify-center md:justify-start">
                                            {Object.entries(club.socialLinks).map(([platform, url]) => {
                                                if (!url) return null;

                                                const standardPlatforms = {
                                                    instagram: 'fa-brands fa-instagram',
                                                    facebook: 'fa-brands fa-facebook',
                                                    whatsapp: 'fa-brands fa-whatsapp',
                                                    linkedin: 'fa-brands fa-linkedin',
                                                    reddit: 'fa-brands fa-reddit',
                                                    youtube: 'fa-brands fa-youtube',
                                                    github: 'fa-brands fa-github'
                                                };

                                                const iconClass = standardPlatforms[platform];
                                                const fullUrl = url.startsWith('http') ? url : `https://${url}`;

                                                let hostname = '';
                                                try {
                                                    hostname = new URL(fullUrl).hostname;
                                                } catch {
                                                    hostname = fullUrl;
                                                }

                                                return (
                                                    <a
                                                        key={platform}
                                                        href={fullUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:text-white transition-all theme-hover-bg shadow-sm hover:shadow-md"
                                                        title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                                                    >
                                                        {iconClass ? (
                                                            <i className={`${iconClass} text-lg`}></i>
                                                        ) : (
                                                            <FaviconWithFallback hostname={hostname} alt={platform} />
                                                        )}
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {isAdmin && (
                                        <Button asChild variant="outline" className="gap-2 mt-4">
                                            <Link href={`${getClubPath(club)}/admin`}>
                                                <Settings className="w-4 h-4" />
                                                Administration du club
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Right: Announcements Carousel */}
                            <div className="flex-1 w-full lg:w-2/3 min-h-0">
                                {headerPosts.length > 0 ? (
                                    <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-[4/5] sm:aspect-[16/9] md:aspect-[21/9] shadow-xl group">
                                        {/* Background Image/Gradient */}
                                        <div className="absolute inset-0">
                                            {headerPosts[currentSlide].imageUrl ? (
                                                <Image
                                                    src={headerPosts[currentSlide].imageUrl}
                                                    alt="Announcement cover"
                                                    fill
                                                    className="object-cover opacity-60 transition-opacity duration-500"
                                                />
                                            ) : (
                                                <div
                                                    className="w-full h-full"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${club.themeColor || '#64748b'} 0%, #1a202c 100%)`
                                                    }}
                                                />
                                            )}
                                        </div>

                                        {/* Content Overlay */}
                                        <div className="absolute inset-x-0 bottom-0 p-5 md:p-8 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
                                            <Badge className="mb-2 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm px-2 py-0.5 text-[10px] md:text-xs">
                                                {headerPosts[currentSlide].type === 'announcement' ? 'Annonce' : 'Activité'}
                                            </Badge>
                                            <Link href={`${getClubPath(club)}/posts/${headerPosts[currentSlide].id}`} className="block group-hover:underline decoration-white/50 underline-offset-4">
                                                <h3 className="text-xl md:text-3xl font-bold text-white mb-2 line-clamp-2 md:line-clamp-1 leading-tight">
                                                    {headerPosts[currentSlide].title}
                                                </h3>
                                            </Link>
                                            <p className="text-slate-200 line-clamp-2 text-xs md:text-base mb-3 max-w-2xl font-medium">
                                                {headerPosts[currentSlide].content}
                                            </p>
                                            <div className="flex items-center gap-2 text-white/70 text-[10px] md:text-xs">
                                                <span className="truncate max-w-[120px] md:max-w-none">Par {getAuthorInfo(headerPosts[currentSlide].author).name}</span>
                                                <span>•</span>
                                                <span>{new Date(headerPosts[currentSlide].createdAt).toLocaleDateString('fr-FR')}</span>
                                            </div>
                                        </div>

                                        {/* Navigation Buttons */}
                                        {headerPosts.length > 1 && (
                                            <>
                                                <button
                                                    onClick={prevSlide}
                                                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-1.5 md:p-2 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/40 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 z-20"
                                                >
                                                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                                                </button>
                                                <button
                                                    onClick={nextSlide}
                                                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-1.5 md:p-2 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/40 transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 z-20"
                                                >
                                                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                                                </button>

                                                {/* Dots */}
                                                <div className="absolute top-3 right-3 md:top-4 md:right-4 flex gap-1.5">
                                                    {headerPosts.map((_, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={cn(
                                                                "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all shadow-sm",
                                                                idx === currentSlide ? "bg-card w-4 md:w-4" : "bg-white/40"
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-full min-h-[200px] flex items-center justify-center rounded-2xl border-2 border-dashed bg-muted">
                                        <p className="text-muted-foreground">Aucune annonce récente</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="container py-12 px-4 md:px-6">
                <Tabs defaultValue="activities" className="w-full">
                    <TabsList className="flex w-full overflow-x-auto justify-start md:grid md:max-w-md md:grid-cols-3 mb-8 no-scrollbar bg-muted p-1 rounded-xl h-12">
                        <TabsTrigger value="activities" className="whitespace-nowrap px-6 py-2.5 rounded-lg">Actualités</TabsTrigger>
                        <TabsTrigger value="structure" className="whitespace-nowrap px-6 py-2.5 rounded-lg">Structure</TabsTrigger>
                        <TabsTrigger value="members" className="whitespace-nowrap px-6 py-2.5 rounded-lg">Membres</TabsTrigger>
                        {userTickets.length > 0 && <TabsTrigger value="tickets" className="whitespace-nowrap px-6 py-2">Mes Tickets</TabsTrigger>}
                    </TabsList>

                    {/* Activities Tab */}
                    <TabsContent value="activities" className="space-y-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-foreground">Actualités</h2>
                        </div>

                        {clubPosts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {clubPosts.map((post) => {
                                    const author = getAuthorInfo(post.author);
                                    return (
                                        <Link href={`${getClubPath(club)}/posts/${post.id}`} key={post.id} className="group block border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors bg-card">
                                            {post.imageUrl && (
                                                <div className="relative w-full h-44 bg-muted">
                                                    <Image
                                                        src={post.imageUrl}
                                                        alt={post.title}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            )}
                                            <div className="p-5">
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                        {post.type === 'announcement' ? 'Annonce' : post.type === 'article' ? 'Article' : 'Activité'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(post.createdAt).toLocaleDateString('fr-FR')}
                                                    </span>
                                                </div>
                                                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                                                    {post.title}
                                                </h3>
                                                <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{post.content}</p>
                                                <div className="flex items-center gap-2 pt-3 border-t border-border">
                                                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                        <User className="w-3 h-3 text-muted-foreground" />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-semibold text-foreground">{author.name}</span>
                                                        {author.role && <span className="text-[10px] text-muted-foreground ml-1">· {author.role}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 border border-dashed border-border rounded-xl">
                                <p className="text-muted-foreground text-sm">Aucune activité ou annonce publiée pour le moment.</p>
                            </div>
                        )}
                    </TabsContent>

                    {/* Organizational Structure Tab */}
                    <TabsContent value="structure" className="space-y-6">
                        <div className="flex items-center gap-2 mb-6">
                            <h2 className="text-xl font-bold text-foreground">Structure Organisationnelle</h2>
                        </div>
                        <OrganizationalChart organizationalChart={club.organizationalChart} />
                    </TabsContent>

                    {/* Members Tab */}
                    <TabsContent value="members" className="space-y-6">
                        <div className="flex items-center gap-2 mb-6">
                            <h2 className="text-xl font-bold text-foreground">Membres du Club</h2>
                        </div>

                        {club.members && club.members.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {club.members.map((member, index) => (
                                    <ClubMemberCard key={index} member={member} showPhoto={true} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 border border-dashed border-border rounded-xl">
                                <p className="text-muted-foreground text-sm">Aucun membre régulier enregistré pour le moment.</p>
                            </div>
                        )}
                    </TabsContent>

                    {/* Tickets Tab */}
                    {userTickets.length > 0 && (
                        <TabsContent value="tickets" className="space-y-6">
                            <div className="flex items-center gap-2 mb-6">
                                <h2 className="text-xl font-bold text-foreground">Mes Tickets</h2>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                {userTickets.map(ticket => (
                                    <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="group flex items-center justify-between p-4 border border-border rounded-xl hover:border-primary/50 transition-colors bg-card">
                                        <div>
                                            <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{ticket.eventName}</h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">{new Date(ticket.createdAt).toLocaleDateString('fr-FR')}</p>
                                            <span className={cn("inline-block mt-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md", ticket.status === 'valid' ? 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300' : 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300')}>
                                                {ticket.status === 'valid' ? 'Validé' : 'En attente'}
                                            </span>
                                        </div>
                                        <Ticket className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                    </Link>
                                ))}
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </section>
        </main>
    );
}
