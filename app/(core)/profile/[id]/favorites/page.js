'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { db, ref, get } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ArrowLeft } from 'lucide-react';
import { resolveUidFromIdentifier } from '@/lib/utils';
import ResourceCard from '@/components/features/resources/ResourceCard';

export default function FavoritesPage() {
    const { id } = useParams();
    const { user: currentUser } = useAuth();
    const [resolvedUid, setResolvedUid] = useState(null);
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        resolveUidFromIdentifier(db, ref, get, id).then(uid => {
            if (uid) setResolvedUid(uid);
            else setLoading(false);
        });
    }, [id]);

    useEffect(() => {
        if (!resolvedUid || !db) return;

        const fetchFavorites = async () => {
            setLoading(true);
            try {
                const favRef = ref(db, `userFavorites/${resolvedUid}`);
                const snap = await get(favRef);
                if (snap.exists()) {
                    const data = snap.val();

                    // Enrich with full resource data (url, link, file) so PDF covers can render
                    const resourcesSnap = await get(ref(db, 'resources'));
                    const allResources = resourcesSnap.val() || {};

                    const list = Object.entries(data).map(([favId, value]) => {
                        const resId = value.resourceId || favId;
                        const resData = allResources[resId] || {};
                        return {
                            id: resId,
                            ...value,
                            ...resData,
                        };
                    });
                    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                    setFavorites(list);
                } else {
                    setFavorites([]);
                }
            } catch (e) {
                console.error('Error fetching favorites:', e);
                setFavorites([]);
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, [resolvedUid]);

    const isOwnProfile = currentUser && currentUser.uid === resolvedUid;

    return (
        <main className="min-h-screen bg-card py-12 border-t border-border">
            <div className="container max-w-5xl mx-auto px-4 space-y-8">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {isOwnProfile ? 'Mes ressources enregistrées' : 'Ressources enregistrées'}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Toutes les ressources sauvegardées pour ce profil.
                        </p>
                    </div>
                    <Link
                        href={`/profile/${id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Retour au profil
                    </Link>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : favorites.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-border rounded-xl">
                        <p className="text-muted-foreground text-sm">
                            Aucune ressource enregistrée pour le moment.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favorites.map((fav) => (
                            <ResourceCard
                                key={fav.id}
                                resource={fav}
                                showModule={true}
                                footerLeft={
                                    fav.createdAt ? (
                                        <span className="text-[11px] text-muted-foreground">
                                            Enregistrée le {new Date(fav.createdAt).toLocaleDateString()}
                                        </span>
                                    ) : null
                                }
                            />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
