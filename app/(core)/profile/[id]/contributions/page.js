'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { db, ref, get } from '@/lib/firebase';
import { Loader2, ArrowLeft } from 'lucide-react';
import { resolveUidFromIdentifier } from '@/lib/utils';
import ResourceCard from '@/components/features/resources/ResourceCard';

export default function ContributionsPage() {
    const { id } = useParams();
    const [resolvedUid, setResolvedUid] = useState(null);
    const [contributions, setContributions] = useState([]);
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

        const fetchContributions = async () => {
            setLoading(true);
            try {
                const userRef = ref(db, `users/${resolvedUid}/contributions`);
                const snap = await get(userRef);
                if (snap.exists()) {
                    const data = snap.val();

                    // Enrich with full resource data so PDF covers can render
                    const resourcesSnap = await get(ref(db, 'resources'));
                    const allResources = resourcesSnap.val() || {};

                    const list = Object.entries(data)
                        .map(([cid, value]) => {
                            const resId = value.resourceId || cid;
                            const resData = allResources[resId] || {};
                            return {
                                id: resId,
                                ...value,
                                ...resData,
                            };
                        })
                        .filter((item) => !item.unverified)
                        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    setContributions(list);
                } else {
                    setContributions([]);
                }
            } catch (e) {
                console.error('Error fetching contributions:', e);
                setContributions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchContributions();
    }, [resolvedUid]);

    return (
        <main className="min-h-screen bg-card py-12 border-t border-border">
            <div className="container max-w-5xl mx-auto px-4 space-y-8">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Contributions
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Toutes les ressources et éléments partagés par cet utilisateur.
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
                ) : contributions.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-border rounded-xl">
                        <p className="text-muted-foreground text-sm">
                            Aucune contribution pour le moment.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {contributions.map((item) => (
                            <ResourceCard
                                key={item.id}
                                resource={item}
                                showModule={true}
                                footerLeft={
                                    item.timestamp ? (
                                        <span className="text-[11px] text-muted-foreground">
                                            Ajoutée le {new Date(item.timestamp).toLocaleDateString()}
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
