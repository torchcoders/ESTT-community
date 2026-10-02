'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { IMAGE_SIZES } from '@/lib/image-constants';
import { db as staticDb } from '@/lib/data';
import { db as firebaseDb, ref, get } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, BookOpen, Users, FileText, ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react';
import Hero from '@/components/features/marketing/Hero';
import AnnouncementCarousel from '@/components/features/marketing/AnnouncementCarousel';
import ProgramBanners from '@/components/features/marketing/ProgramBanners';
import ClubsPreview from '@/components/features/marketing/ClubsPreview';
import AdsPreview from '@/components/features/marketing/AdsPreview';
import LatestActivity from '@/components/features/marketing/LatestActivity';
import StructuredData from '@/components/layout/StructuredData';
import PromotionalModal from '@/components/features/promotions/PromotionalModal';
import { useSearchParams } from 'next/navigation';



export default function Home() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [fromId, setFromId] = useState('');
    const [urlCode, setUrlCode] = useState('');


    const [stats, setStats] = useState({
        resources: 0,
        contributions: 0,
        modules: 0
    });
    const [allResources, setAllResources] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [loadingClubs, setLoadingClubs] = useState(true);
    const [announcements, setAnnouncements] = useState([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
    const [studentAds, setStudentAds] = useState([]);
    const [loadingAds, setLoadingAds] = useState(true);

    useEffect(() => {
        const from = searchParams.get('from');
        const code = searchParams.get('code');
        if (from && from.startsWith('qr')) {
            setFromId(from);
            if (code) setUrlCode(code);
            setShowPromoModal(true);
        }
    }, [searchParams]);



    useEffect(() => {
        if (!firebaseDb) return;

        // Fetch stats and all resources from Firebase
        const fetchData = async () => {
            try {
                const resourcesRef = ref(firebaseDb, 'resources');
                const resourcesSnap = await get(resourcesRef);

                const resourcesData = resourcesSnap.val() || {};
                const resourcesList = Object.entries(resourcesData).map(([id, res]) => ({
                    id,
                    ...res,
                    type: 'resource'
                }));

                setAllResources(resourcesList);

                let verifiedCount = 0;
                let pendingCount = 0;

                resourcesList.forEach(resource => {
                    if (resource.unverified === true) {
                        pendingCount++;
                    } else {
                        verifiedCount++;
                    }
                });

                const totalModules = Object.keys(staticDb.modules).reduce((sum, key) => {
                    return sum + staticDb.modules[key].length;
                }, 0);

                setStats({
                    resources: verifiedCount,
                    contributions: pendingCount,
                    modules: totalModules
                });

                // Fetch clubs
                const clubsRef = ref(firebaseDb, 'clubs');
                const clubsSnap = await get(clubsRef);
                let allClubs = [];
                if (clubsSnap.exists()) {
                    const clubsData = clubsSnap.val();
                    allClubs = Object.entries(clubsData)
                        .map(([id, data]) => ({ id, ...data }))
                        .filter(club => club.verified);

                    setClubs(allClubs);
                }
                setLoadingClubs(false);

                // Fetch all club posts for the carousel
                const clubPostsRef = ref(firebaseDb, 'clubPosts');
                const clubPostsSnap = await get(clubPostsRef);

                let allAnnouncements = [];
                if (clubPostsSnap.exists()) {
                    const allPostsData = clubPostsSnap.val();
                    Object.entries(allPostsData).forEach(([clubId, posts]) => {
                        const clubInfo = allClubs.find(c => c.id === clubId);
                        Object.entries(posts).forEach(([postId, post]) => {
                            if (['announcement', 'activity'].includes(post.type)) {
                                allAnnouncements.push({
                                    id: postId,
                                    clubId,
                                    clubName: clubInfo?.name || 'Club',
                                    clubLogo: clubInfo?.logo,
                                    themeColor: clubInfo?.themeColor,
                                    ...post
                                });
                            }
                        });
                    });
                }

                // Fetch admin announcements
                const adminAnnSnap = await get(ref(firebaseDb, 'adminAnnouncements'));
                if (adminAnnSnap.exists()) {
                    const adminData = adminAnnSnap.val();
                    Object.entries(adminData).forEach(([id, ann]) => {
                        allAnnouncements.push({
                            id,
                            clubName: 'EST Tétouan',
                            clubLogo: 'https://fnaiedociknutdxoezhn.supabase.co/storage/v1/object/public/resources/info.png',
                            themeColor: '#3b82f6',
                            ...ann,
                            isAdmin: true
                        });
                    });
                }

                // Sort by createdAt descending
                allAnnouncements.sort((a, b) => b.createdAt - a.createdAt);

                // Fetch student ads
                const adsRef = ref(firebaseDb, 'studentAds');
                const adsSnap = await get(adsRef);
                const now = new Date();
                let liveAds = [];

                if (adsSnap.exists()) {
                    liveAds = Object.entries(adsSnap.val()).map(([id, data]) => ({
                        id,
                        ...data
                    }))
                        .filter(ad => ad.status === 'live' && (!ad.expirationDate || new Date(ad.expirationDate) > now));

                    setStudentAds(liveAds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6));
                }
                setLoadingAds(false);

                // Inject ads into carousel (limit to top 3 ads in carousel)
                const adSlides = liveAds.slice(0, 3).map(ad => ({
                    id: ad.id,
                    title: ad.title,
                    content: ad.description,
                    imageUrl: ad.url,
                    clubName: 'Opportunité',
                    clubLogo: 'https://fnaiedociknutdxoezhn.supabase.co/storage/v1/object/public/resources/adsavatar.png',
                    themeColor: '#10b981', // emerald-500
                    isAd: true,
                    link: ad.link,
                    createdAt: new Date(ad.createdAt).getTime()
                }));

                const combinedSlides = [...allAnnouncements, ...adSlides].sort((a, b) => b.createdAt - a.createdAt);

                // Prioritize those with images
                const withImages = combinedSlides.filter(p => p.imageUrl);
                const withoutImages = combinedSlides.filter(p => !p.imageUrl);
                setAnnouncements([...withImages, ...withoutImages].slice(0, 10));

                setLoadingAnnouncements(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoadingClubs(false);
                setLoadingAnnouncements(false);
                setLoadingAds(false);
            }
        };

        fetchData();
    }, [firebaseDb]);

    // Carousel Autoplay
    useEffect(() => {
        if (announcements.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % announcements.length);
        }, 6000);

        return () => clearInterval(interval);
    }, [announcements.length]);

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % announcements.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + announcements.length) % announcements.length);
    };

    return (
        <main className="min-h-screen">
            <StructuredData data={{
                "@context": "https://schema.org",
                "@type": "EducationalOrganization",
                "name": "EST Tétouan Community",
                "alternateName": "École Supérieure de Technologie de Tétouan",
                "url": "https://estt.ma",
                "logo": "https://estt.ma/favicon.ico",
                "description": "Plateforme collaborative de partage de ressources académiques pour les étudiants de l'École Supérieure de Technologie de Tétouan",
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "Tétouan",
                    "addressCountry": "MA"
                },
                "sameAs": []
            }} />

            <Hero stats={stats} />

            <AnnouncementCarousel
                announcements={announcements}
                currentSlide={currentSlide}
                setCurrentSlide={setCurrentSlide}
                nextSlide={nextSlide}
                prevSlide={prevSlide}
            />

            <ProgramBanners />

            <ClubsPreview clubs={clubs} loading={loadingClubs} />

            <AdsPreview ads={studentAds} />

            <LatestActivity />

            <PromotionalModal 
                isOpen={showPromoModal} 
                onClose={() => setShowPromoModal(false)} 
                fromId={fromId}
                initialCode={urlCode}
            />



        </main>
    );
}
