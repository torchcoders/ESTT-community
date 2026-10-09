import { getAdminClubBySlug } from '@/lib/firebase-admin';

export async function generateMetadata({ params }) {
    const { clubId } = params;

    try {
        const club = await getAdminClubBySlug(clubId);
        if (!club) {
            return {
                title: 'Club non trouvé',
                description: 'Ce club n\'existe pas ou n\'est pas disponible',
            };
        }

        return {
            title: club.name,
            description: club.description || `Découvrez ${club.name}, un club étudiant de l'EST Tétouan`,
            keywords: [
                club.name,
                'EST Tétouan',
                'club étudiant',
                'vie étudiante',
                ...(club.topics || []),
            ],
            openGraph: {
                title: club.name,
                description: club.description || `Découvrez ${club.name}, un club étudiant de l'EST Tétouan`,
                type: 'website',
                url: `https://estt.ma/clubs/${club.username || club.id}`,
                images: club.logo ? [
                    {
                        url: club.logo,
                        width: 800,
                        height: 800,
                        alt: `${club.name} logo`,
                    },
                ] : [],
            },
            twitter: {
                card: 'summary',
                title: club.name,
                description: club.description || `Découvrez ${club.name}, un club étudiant de l'EST Tétouan`,
                images: club.logo ? [club.logo] : [],
            },
            icons: {
                icon: club.logo || '/favicon.ico',
                shortcut: club.logo || '/favicon.ico',
                apple: club.logo || '/favicon.ico',
            },
        };
    } catch (error) {
        console.error('Error generating club metadata:', error);
        return {
            title: 'Club',
            description: 'Découvrez ce club étudiant de l\'EST Tétouan',
        };
    }
}

export default function ClubLayout({ children }) {
    return children;
}
