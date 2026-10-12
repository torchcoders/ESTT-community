import { getAdminDb } from '@/lib/firebase-admin';
import { defaultMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }) {
    const { resourceId } = await params;

    try {
        const adminDb = getAdminDb();
        const snap = await adminDb.ref(`resources/${resourceId}`).once('value');

        if (!snap.exists()) {
            return defaultMetadata;
        }

        const resource = snap.val();
        const previewUrl = resource.previewImageUrl;
        const ogImage = previewUrl || 'https://estt.ma/og-default.png';

        const title = resource.title || 'Ressource ESTT';
        const description = resource.description || `Ressource ${resource.docType || ''} pour ${resource.module || ''}`.trim();
        const resourceUrl = `https://estt.ma/resource/${resourceId}`;

        return {
            title: title,
            description: description,
            openGraph: {
                title: title,
                description: description,
                type: 'article',
                url: resourceUrl,
                siteName: 'EST Tétouan - Ressources Étudiants',
                images: [
                    {
                        url: ogImage,
                        width: 1200,
                        height: 630,
                        alt: title,
                    },
                ],
                publishedTime: resource.createdAt ? new Date(resource.createdAt).toISOString() : undefined,
                authors: resource.authorName ? [resource.authorName] : ['EST Tétouan Community'],
            },
            twitter: {
                card: 'summary_large_image',
                title: title,
                description: description,
                images: [ogImage],
            },
            other: {
                'resource-id': resourceId,
                'resource-type': resource.type || '',
                'resource-doc-type': resource.docType || '',
            },
        };
    } catch (error) {
        console.error('Error generating resource metadata:', error);
        return defaultMetadata;
    }
}

export default function ResourceLayout({ children }) {
    return children;
}