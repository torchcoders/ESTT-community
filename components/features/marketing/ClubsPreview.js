'use client';

import Link from 'next/link';

import ClubCard from '@/components/features/clubs/ClubCard';

export default function ClubsPreview({ clubs, loading }) {
    return (
        <section id="clubs-section" className="py-12 md:py-20 bg-muted/50">
            <div className="container">
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 md:mb-12 gap-4">
                    <div className="max-w-2xl">
                        <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2 md:mb-4">Community Clubs</h2>
                        <p className="text-muted-foreground text-lg">
                            Rejoignez l'un de ESTT nombreux clubs et développez vos compétences.
                        </p>
                    </div>
                    <Link href="/clubs" className="text-primary text-sm font-bold hover:underline shrink-0">
                        Voir tous les clubs →
                    </Link>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {!loading ? (
                        clubs.length > 0 ? (
                            clubs.map((club) => (
                                <ClubCard key={club.id} club={club} />
                            ))
                        ) : (
                            <div className="col-span-full text-center py-10 text-muted-foreground">
                                Aucun club vérifié à afficher pour le moment.
                            </div>
                        )
                    ) : (
                        Array(4).fill(0).map((_, i) => (
                            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
