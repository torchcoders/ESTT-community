// This will be called at build time or on-demand in production
export const dynamic = 'force-dynamic';

export default async function sitemap() {
    const baseUrl = 'https://estt.ma';

    // Core application pages
    const staticPages = [
        '',
        '/browse',
        '/clubs',
        '/Guide',
        '/search',
        '/terms',
        '/privacy',
        '/resources',
        '/ads-portal',
        '/contribute',
        '/docs',
        '/download',
        '/downloadAndroid',
        '/thanks',
    ];

    const staticRoutes = staticPages.map((page) => ({
        url: `${baseUrl}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : 0.8,
    }));

    // Dynamic data fetching helper
    const fetchDynamicRoutes = async (refPath, routePrefix, priority) => {
        try {
            const { db, ref, get } = await import('@/lib/firebase');
            if (!db) return [];

            const snapshot = await get(ref(db, refPath));
            if (!snapshot.exists()) return [];

            return Object.entries(snapshot.val())
                .filter(([_key, item]) => item.verified || item.unverified !== true) // Show verified or not marked as unverified
                .map(([id, item]) => ({
                    url: `${baseUrl}/${routePrefix}/${item.username || id}`,
                    lastModified: new Date(item.updatedAt || item.createdAt || Date.now()),
                    changeFrequency: 'monthly',
                    priority,
                }));
        } catch (error) {
            console.error(`Error fetching dynamic routes for ${refPath}:`, error);
            return [];
        }
    };

    // Fetch dynamic routes
    const [clubRoutes, resourceRoutes] = await Promise.all([
        fetchDynamicRoutes('clubs', 'clubs', 0.9),
        fetchDynamicRoutes('resources', 'resources', 0.7),
    ]);

    return [
        ...staticRoutes,
        ...clubRoutes,
        ...resourceRoutes,
    ];
}