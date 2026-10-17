'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Sparkles, Trophy, Users, Calendar, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
    getProjectCategoryLabel, 
    getProjectDifficultyLabel, 
    formatProjectDate 
} from '@/lib/projects';

export default function ProjectCarousel({ projects }) {
    const [currentSlide, setCurrentSlide] = useState(0);

    const nextSlide = useCallback(() => {
        setCurrentSlide((prev) => (prev === projects.length - 1 ? 0 : prev + 1));
    }, [projects.length]);

    const prevSlide = useCallback(() => {
        setCurrentSlide((prev) => (prev === 0 ? projects.length - 1 : prev - 1));
    }, [projects.length]);

    // Autoplay implementation
    useEffect(() => {
        if (!projects || projects.length <= 1) return;
        const intervalId = setInterval(() => {
            nextSlide();
        }, 8000);
        return () => clearInterval(intervalId);
    }, [projects, nextSlide]);

    if (!projects || projects.length === 0) return null;

    return (
        <section className="relative group">
            <div className="relative rounded-2xl md:rounded-3xl overflow-hidden bg-slate-900 aspect-[3/4] sm:aspect-[4/3] md:aspect-[21/9] shadow-xl">
                {projects.map((project, idx) => {
                    const isActive = idx === currentSlide;
                    return (
                        <div
                            key={project.id}
                            className={cn(
                                "absolute inset-0 transition-opacity duration-700 ease-in-out",
                                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                            )}
                        >
                            {/* Background Image */}
                            <div className="absolute inset-0">
                                {project.coverImage ? (
                                    <Image
                                        src={project.coverImage}
                                        alt={project.title}
                                        fill
                                        sizes="100vw"
                                        unoptimized
                                        className={cn("h-full w-full object-cover transition-transform duration-3000 ease-out", isActive ? "scale-100" : "scale-105")}
                                    />
                                ) : (
                                    <div className="h-full w-full bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                                        <div 
                                            className="absolute inset-0 opacity-10"
                                            style={{
                                                backgroundImage: `radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)`,
                                                backgroundSize: '32px 32px'
                                            }}
                                        />
                                    </div>
                                )}
                                {/* Black Mask Overlay for clear text reading */}
                                <div className="absolute inset-0 bg-black/50" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                            </div>

                            {/* Content Overlay */}
                            <div className="relative h-full flex flex-col justify-end p-5 md:p-12 lg:p-16 text-white pb-16 md:pb-12">
                                <div className="max-w-3xl space-y-4 md:space-y-6">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none md:px-3 md:py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20">
                                            <Sparkles className="mr-1 h-3 w-3 md:h-3.5 md:w-3.5" />
                                            {project.featured ? 'Featured' : 'Nouveau'}
                                        </Badge>
                                        <Badge variant="outline" className={cn("rounded-full px-2 md:px-3 py-0.5 md:py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest border-white/20 bg-white/10 backdrop-blur-md text-white")}>
                                            {getProjectDifficultyLabel(project.difficulty)}
                                        </Badge>
                                        <Badge className="bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                                            {getProjectCategoryLabel(project.category)}
                                        </Badge>
                                    </div>

                                    <div className="space-y-2 md:space-y-3">
                                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] drop-shadow-2xl line-clamp-1 md:line-clamp-2">
                                            {project.title}
                                        </h2>
                                        <p className="text-xs sm:text-sm md:text-lg text-white/90 leading-relaxed max-w-2xl line-clamp-2 font-medium drop-shadow-lg">
                                            {project.summary || project.description}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 md:gap-8 py-2">
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center font-bold border border-white/20 text-white overflow-hidden text-xs md:text-base">
                                               {project.authorName?.charAt(0) || 'E'}
                                            </div>
                                            <div>
                                                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Posté par</p>
                                                <p className="text-xs md:text-sm font-bold text-white leading-none mt-1">{project.authorName}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 md:gap-3">
                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white">
                                                <Users className="h-4 w-4 md:h-5 md:w-5" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Participants</p>
                                                <p className="text-xs md:text-sm font-bold text-white leading-none mt-1">{project.submissionCount || 0} builds</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 md:gap-3">
                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white">
                                                <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Échéance</p>
                                                <p className="text-xs md:text-sm font-bold text-white leading-none mt-1">{project.deadline ? formatProjectDate(project.deadline) : 'Aucune'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2 md:pt-4 flex flex-wrap gap-2 md:gap-4">
                                        <Button asChild size="default" className="md:h-12 rounded-full px-5 md:px-8 bg-white hover:bg-slate-100 text-slate-950 font-bold shadow-xl shadow-white/10">
                                            <Link href={`/projects/${project.id}`}>
                                                Explorer le brief
                                                <ArrowRight className="ml-1 md:ml-2 h-4 w-4 md:h-5 md:w-5" />
                                            </Link>
                                        </Button>
                                        <Button asChild size="default" variant="ghost" className="md:h-12 hidden sm:inline-flex rounded-full px-5 md:px-8 text-white hover:bg-white/10 backdrop-blur-md border border-white/20">
                                            <Link href={`/projects/${project.id}/submit`}>
                                                Soumettre un build
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Reward Badge Floating (Desktop Only) */}
                            <div className="absolute top-8 right-8 hidden lg:block">
                                <div className="bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-3xl p-6 shadow-none max-w-[200px] text-center space-y-3 z-20">
                                    <div className="mx-auto w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                                        <Trophy className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white">Rejoins le top</p>
                                        <p className="text-xs font-medium text-white/80 leading-relaxed">
                                            Gagne des badges et du karma en relevant ce défi.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Left/Right Navigation Buttons */}
                <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 md:auto md:bottom-12 md:top-auto md:translate-y-0 md:left-auto md:right-12 flex justify-between md:justify-end gap-2 z-30 pointer-events-none">
                    <button
                        onClick={(e) => { e.preventDefault(); prevSlide(); }}
                        className="p-1.5 sm:p-2 md:p-3 rounded-full bg-black/20 text-white backdrop-blur-md hover:bg-black/40 transition-all border border-white/10 pointer-events-auto shadow-lg"
                    >
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                    <button
                        onClick={(e) => { e.preventDefault(); nextSlide(); }}
                        className="p-1.5 sm:p-2 md:p-3 rounded-full bg-black/20 text-white backdrop-blur-md hover:bg-black/40 transition-all border border-white/10 pointer-events-auto shadow-lg"
                    >
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>

                {/* Pagination Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:bottom-auto md:top-12 md:right-12 md:left-auto md:translate-x-0 flex gap-1.5 md:gap-2 z-30">
                    {projects.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentSlide(idx)}
                            className={cn(
                                "h-1.5 md:h-1.5 rounded-full transition-all duration-500",
                                idx === currentSlide ? "bg-white w-6 md:w-8" : "bg-white/40 w-3 md:w-4 hover:bg-white/60"
                            )}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
