'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IMAGE_SIZES } from '@/lib/image-constants';
import { cn } from '@/lib/utils';

export default function AnnouncementCarousel({
    announcements,
    currentSlide,
    setCurrentSlide,
    nextSlide,
    prevSlide
}) {
    if (!announcements || announcements.length === 0) return null;

    return (
        <section className="py-12 md:py-20 bg-muted/50">
            <div className="container px-4 md:px-6">
                <div className="max-w-2xl mb-8 md:mb-10">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">À ne pas manquer</h2>
                    <p className="text-muted-foreground text-base md:text-lg">Les annonces et événements récents de la communauté.</p>
                </div>

                <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden bg-slate-950 h-[400px] sm:h-auto sm:aspect-[16/9] md:aspect-[21/7] shadow-xl group">
                    {announcements.map((ann, idx) => {
                        const isActive = idx === currentSlide;
                        return (
                            <div
                                key={ann.id || idx}
                                className={cn(
                                    "absolute inset-0 transition-opacity duration-700 ease-in-out",
                                    isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                                )}
                            >
                                {/* Background Image/Gradient */}
                                <div className="absolute inset-0">
                                    {ann.imageUrl ? (
                                        <Image
                                            src={ann.imageUrl}
                                            alt={ann.title || "Announcement cover"}
                                            fill
                                            sizes={IMAGE_SIZES.ANNOUNCEMENT_HERO}
                                            className={cn("object-cover transition-transform duration-[3000ms] ease-out", isActive ? "scale-100" : "scale-105")}
                                            priority={idx === 0}
                                        />
                                    ) : (
                                        <div
                                            className="w-full h-full"
                                            style={{
                                                background: `linear-gradient(135deg, ${ann.themeColor || '#3b82f6'} 0%, #020617 100%)`
                                            }}
                                        />
                                    )}
                                    {/* Dark overlay masks for optimal text readability */}
                                    <div className="absolute inset-0 bg-slate-950/20" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent" />
                                </div>

                                {/* Content Overlay */}
                                <div className="absolute inset-0 flex flex-col justify-end p-5 pb-16 sm:p-8 sm:pb-20 z-20">
                                    <div className="max-w-2xl flex flex-col gap-2.5 sm:gap-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {ann.clubLogo && (
                                                <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/20 bg-white shadow-sm shrink-0">
                                                    <Image src={ann.clubLogo} alt={ann.clubName || "Club"} fill sizes={IMAGE_SIZES.CLUB_LOGO_SM} className="object-cover" />
                                                </div>
                                            )}
                                            {ann.clubName && (
                                                <Badge variant="secondary" className="bg-black/30 hover:bg-black/40 text-white/90 border border-white/10 backdrop-blur-md px-2.5 py-0.5 text-[10px] sm:text-xs">
                                                    {ann.clubName}
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className="bg-white/10 text-white/90 border-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] sm:text-xs">
                                                {ann.type === 'announcement' ? 'Annonce' : 'Activité'}
                                            </Badge>
                                        </div>

                                        {ann.isAdmin ? (
                                            <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white line-clamp-2 leading-tight drop-shadow-md">
                                                {ann.title}
                                            </h3>
                                        ) : (
                                            <Link href={`/clubs/${ann.clubUsername || ann.clubId}/posts/${ann.id}`} className="block group/link">
                                                <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white group-hover/link:text-primary-200 transition-colors line-clamp-2 leading-tight drop-shadow-md">
                                                    {ann.title}
                                                </h3>
                                            </Link>
                                        )}

                                        {ann.content && (
                                            <p className="text-slate-200 line-clamp-2 sm:line-clamp-3 text-sm sm:text-base font-normal max-w-[90%] sm:max-w-md drop-shadow-sm">
                                                {ann.content}
                                            </p>
                                        )}

                                        <div className="flex flex-row items-center gap-4 pt-1 sm:pt-2">
                                            {ann.isAd ? (
                                                <Button asChild size="sm" className="h-9 sm:h-10 rounded-full font-semibold px-5 sm:px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg border-0">
                                                    <a href={ann.link} target="_blank" rel="noopener noreferrer">
                                                        Découvrir
                                                    </a>
                                                </Button>
                                            ) : (
                                                !ann.isAdmin && (
                                                    <Button asChild size="sm" className="h-9 sm:h-10 rounded-full font-semibold px-5 sm:px-6 bg-primary hover:bg-primary/90 text-white shadow-lg border-0">
                                                        <Link href={`/clubs/${ann.clubUsername || ann.clubId}/posts/${ann.id}`}>
                                                            <span className="sm:hidden">Accéder</span>
                                                            <span className="hidden sm:inline">Lire la suite</span>
                                                        </Link>
                                                    </Button>
                                                )
                                            )}
                                            <span className="text-white/60 text-xs sm:text-sm font-medium shrink-0">
                                                {ann.isAd ? 'Sponsorisé' : new Date(ann.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Navigation & Controls footer */}
                    <div className="absolute bottom-4 sm:bottom-5 left-5 right-5 flex items-center justify-between z-30">
                        {/* Pagination Dots */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            {announcements.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => { e.preventDefault(); setCurrentSlide(idx); }}
                                    className={cn(
                                        "h-1.5 sm:h-2 transition-all duration-300 rounded-full",
                                        idx === currentSlide ? "w-5 sm:w-6 bg-white" : "w-1.5 sm:w-2 bg-white/40 hover:bg-white/60"
                                    )}
                                    aria-label={`Go to slide ${idx + 1}`}
                                />
                            ))}
                        </div>

                        {/* Navigation Arrows */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => { e.preventDefault(); prevSlide(); }}
                                className="p-1.5 sm:p-2 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-all pointer-events-auto border border-white/10"
                                aria-label="Previous slide"
                            >
                                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                                onClick={(e) => { e.preventDefault(); nextSlide(); }}
                                className="p-1.5 sm:p-2 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-all pointer-events-auto border border-white/10"
                                aria-label="Next slide"
                            >
                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
