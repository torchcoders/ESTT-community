'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, ref, get, update } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Heart, ClipboardList } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getClubBySlug, getClubPath } from '@/lib/clubUtils';

export default function PostDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { clubId, postId } = params;

    const [club, setClub] = useState(null);
    const [post, setPost] = useState(null);
    const [linkedForm, setLinkedForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [liking, setLiking] = useState(false);

    useEffect(() => {
        if (clubId && postId) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId, postId]);

    const fetchData = async () => {
        if (!db) return;
        try {
            const clubData = await getClubBySlug(clubId);
            if (!clubData) { router.push('/clubs'); return; }
            setClub(clubData);

            const postSnap = await get(ref(db, `clubPosts/${clubData.id}/${postId}`));
            if (!postSnap.exists()) { router.push(getClubPath(clubData)); return; }

            const postData = { id: postId, ...postSnap.val() };
            setPost(postData);

            if (postData.linkedFormId) {
                const formSnap = await get(ref(db, `clubs/${clubData.id}/forms/${postData.linkedFormId}`));
                if (formSnap.exists()) setLinkedForm({ id: postData.linkedFormId, ...formSnap.val() });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getAuthorInfo = (email) => {
        if (!club) return { name: 'Membre du club', role: '' };
        if (club.organizationalChart) {
            const m = Object.values(club.organizationalChart).find(m => m.email === email);
            if (m) return { name: m.name, role: m.role };
        }
        if (club.members) {
            const m = club.members.find(m => m.email === email);
            if (m) return { name: m.name, role: 'Membre' };
        }
        return { name: 'Membre du club', role: '' };
    };

    const getLikeCount = (likes) => {
        if (!likes) return 0;
        if (typeof likes === 'number') return likes;
        if (typeof likes === 'object') return Object.keys(likes).length;
        return 0;
    };

    const handleLike = async () => {
        if (!user || liking) return;
        setLiking(true);
        try {
            const newLikes = getLikeCount(post.likes) + 1;
            await update(ref(db, `clubPosts/${club.id}/${postId}`), { likes: newLikes });
            setPost(prev => ({ ...prev, likes: newLikes }));
        } catch (error) {
            console.error('Error liking post:', error);
        } finally {
            setLiking(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
    );

    if (!post || !club) return null;

    const author = getAuthorInfo(post.author);
    const likeCount = getLikeCount(post.likes);

    return (
        <main className="min-h-screen bg-card">
            {/* Sticky nav */}
            <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
                <div className="max-w-2xl mx-auto px-4 h-13 flex items-center justify-between py-3">
                    <Link href={getClubPath(club)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span>{club.name}</span>
                    </Link>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {post.type === 'announcement' ? 'Annonce' : post.type === 'article' ? 'Article' : 'Activité'}
                    </span>
                </div>
            </nav>

            <div className="max-w-2xl mx-auto px-4 py-14">

                {/* Type label */}
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-4">
                    {post.type === 'announcement' ? 'Annonce' : post.type === 'article' ? 'Article' : 'Activité'}
                </p>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight tracking-tight mb-6">
                    {post.title}
                </h1>

                {/* Author + date */}
                <div className="flex items-center gap-3 mb-10 pb-8 border-b border-border">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
                        {author.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground leading-none mb-0.5">{author.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {author.role && <span>{author.role} · </span>}
                            {new Date(post.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* Cover image */}
                {post.imageUrl && (
                    <div className="relative aspect-video rounded-xl overflow-hidden mb-10 border border-border">
                        <Image
                            src={post.imageUrl}
                            alt={post.title}
                            fill
                            className="object-cover"
                            priority
                            sizes="(max-width: 768px) 100vw, 672px"
                        />
                    </div>
                )}

                {/* Content */}
                <div className="whitespace-pre-wrap text-foreground leading-relaxed text-base md:text-lg mb-14">
                    {post.content}
                </div>

                {/* Like */}
                <div className="flex items-center gap-3 pb-12 border-b border-border">
                    <button
                        onClick={handleLike}
                        disabled={liking || !user}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all",
                            likeCount > 0
                                ? "border-pink-200 bg-pink-50 text-pink-600 dark:border-pink-500/50 dark:bg-pink-500/15 dark:text-pink-300"
                                : "border-border text-muted-foreground hover:border-pink-200 hover:bg-pink-50 hover:text-pink-500 dark:hover:border-pink-500/50 dark:hover:bg-pink-500/15 dark:hover:text-pink-300"
                        )}
                    >
                        <Heart className={cn("w-4 h-4", likeCount > 0 ? "fill-current" : "")} />
                        {likeCount}
                    </button>
                    {!user && <span className="text-xs text-muted-foreground">Connectez-vous pour liker</span>}
                </div>

                {/* Participation form */}
                {linkedForm && (
                    <div className="mt-10 border border-dashed border-border rounded-xl p-8 text-center space-y-4">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto">
                            <ClipboardList className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">
                                Participer {linkedForm.generateTicket && <span>🎫</span>}
                            </h3>
                            <p className="text-muted-foreground text-sm mt-1">
                                {linkedForm.description || "Inscrivez-vous pour participer à cet événement."}
                            </p>
                        </div>
                        <Button className="rounded-full px-8 font-bold" asChild>
                            <Link href={`${getClubPath(club)}/forms/${linkedForm.id}`}>Répondre au formulaire</Link>
                        </Button>
                    </div>
                )}

                {/* Club footer */}
                <div className="mt-10 flex items-center justify-between gap-4 p-5 border border-border rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted border border-border shrink-0">
                            {club.logo ? (
                                <Image src={club.logo} alt={club.name} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: club.themeColor || '#64748b' }}>
                                    {club.name[0]}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-foreground">{club.name}</p>
                            <p className="text-xs text-muted-foreground">Espace Club Officiel</p>
                        </div>
                    </div>
                    <Link href={getClubPath(club)} className="text-xs font-bold text-primary hover:underline shrink-0">
                        Voir le profil →
                    </Link>
                </div>
            </div>
        </main>
    );
}
