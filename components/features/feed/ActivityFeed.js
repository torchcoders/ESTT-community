'use client';

import { useState, useEffect } from 'react';
import { db, ref, onValue } from '@/lib/firebase';
import { Loader2, User } from 'lucide-react';
import ResourceCard from '@/components/features/resources/ResourceCard';

export default function ActivityFeed() {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const resourcesRef = ref(db, 'resources');

        const unsubscribeResources = onValue(resourcesRef, (snapshot) => {
            const resourceData = snapshot.val() || {};
            const resourceList = [];
            const seenIds = new Set();

            const processResource = (id, resource) => {
                if (!seenIds.has(id) && !resource.unverified && resource.title) {
                    resourceList.push({
                        id,
                        title: resource.title,
                        type: resource.type || 'pdf',
                        docType: resource.docType,
                        url: resource.url,
                        link: resource.link,
                        file: resource.file,
                        module: resource.module,
                        moduleId: resource.moduleId,
                        semester: resource.semester,
                        field: resource.field,
                        professor: resource.professor,
                        ratingAverage: resource.ratingAverage,
                        ratingCount: resource.ratingCount,
                        author: resource.authorName || 'Anonyme',
                        authorId: resource.authorId,
                        timestamp: resource.createdAt || resource.created_at || Date.now(),
                    });
                    seenIds.add(id);
                }
            };

            // Flatten resources and de-duplicate
            Object.entries(resourceData).forEach(([key, value]) => {
                if (typeof value === 'object' && value !== null && !value.title) {
                    // Nested under module
                    Object.entries(value).forEach(([id, resource]) => {
                        processResource(id, resource);
                    });
                } else if (typeof value === 'object' && value !== null) {
                    // Flat structure
                    processResource(key, value);
                }
            });

            const sortedItems = resourceList
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .slice(0, 6);

            setActivities(sortedItems);
            setLoading(false);
        });

        return () => {
            unsubscribeResources();
        };
    }, []);

    if (loading) return <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    if (activities.length === 0) return <div className="col-span-full py-20 text-center text-muted-foreground italic">Aucune activité récente.</div>;

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    return (
        <>
            {activities.map((activity) => (
                <ResourceCard
                    key={activity.id}
                    resource={activity}
                    showModule={true}
                    footerLeft={
                        <div className="flex items-center gap-1.5 min-w-0 text-muted-foreground text-[11px]">
                            <div className="w-4 h-4 rounded-full bg-muted flex-shrink-0 flex items-center justify-center">
                                <User className="w-2.5 h-2.5 text-muted-foreground" />
                            </div>
                            <span className="font-medium truncate max-w-[90px] sm:max-w-[120px]">
                                {activity.author}
                            </span>
                            {activity.timestamp && (
                                <span className="opacity-60 text-[10px] whitespace-nowrap">
                                    · {formatDate(activity.timestamp)}
                                </span>
                            )}
                        </div>
                    }
                />
            ))}
        </>
    );
}
