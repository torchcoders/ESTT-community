'use client';

import ActivityFeed from '@/components/features/feed/ActivityFeed';

export default function LatestActivity() {
    return (
        <section id="activity-feed" className="py-12 md:py-20 bg-background">
            <div className="container">
                <div className="max-w-2xl mb-8 md:mb-12">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
                        Dernières Activités
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        Les derniers partages de la communauté en temps réel.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    <ActivityFeed />
                </div>
            </div>
        </section>
    );
}
