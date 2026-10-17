'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
    Download,
    Github,
    Zap,
    Shield,
    Layout,
    BookOpen,
    Calendar,
    Ticket,
    Users,
    ClipboardList,
    QrCode,
    UserCircle,
    ArrowRight,
    Star,
    Monitor,
    Cpu,
    Globe,
    Heart
} from 'lucide-react';

export default function DownloadAndroidPage() {
    const [, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const features = [
        {
            icon: <Layout className="w-8 h-8 text-blue-400 group-hover:text-blue-300 transition-colors" />,
            title: "Hub Central",
            desc: "Un flux d'accueil dynamique présentant les dernières activités, annonces et mises à jour des clubs."
        },
        {
            icon: <BookOpen className="w-8 h-8 text-indigo-400 group-hover:text-indigo-300 transition-colors" />,
            title: "Bibliothèque de Ressources",
            desc: "Un espace dédié aux étudiants pour partager et accéder aux ressources éducatives et documents."
        },
        {
            icon: <Calendar className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-colors" />,
            title: "Gestion d'Événements",
            desc: "Découvrez les événements à venir sur le campus avec des informations détaillées et les dates."
        },
        {
            icon: <Ticket className="w-8 h-8 text-pink-400 group-hover:text-pink-300 transition-colors" />,
            title: "Billetterie Numérique",
            desc: "Achetez vos billets en toute sécurité via Stripe et accédez-y directement dans l'application."
        },
        {
            icon: <Users className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 transition-colors" />,
            title: "Écosystème des Clubs",
            desc: "Explorez les clubs étudiants, consultez leurs profils et rejoignez leurs comités."
        },
        {
            icon: <ClipboardList className="w-8 h-8 text-emerald-400 group-hover:text-emerald-300 transition-colors" />,
            title: "Formulaires Personnalisés",
            desc: "Système dynamique de soumission pour les candidatures aux clubs et inscriptions aux activités."
        },
        {
            icon: <QrCode className="w-8 h-8 text-amber-400 group-hover:text-amber-300 transition-colors" />,
            title: "Scanner QR",
            desc: "Scanner intégré pour le suivi des présences et la vérification des billets lors des événements."
        },
        {
            icon: <UserCircle className="w-8 h-8 text-orange-400 group-hover:text-orange-300 transition-colors" />,
            title: "Profils Utilisateurs",
            desc: "Comptes personnalisés avec suivi des activités et gestion complète des paramètres."
        }
    ];

    const screenshots = [
        '/assets/images/screenshots/HomeTap.jpeg',
        '/assets/images/screenshots/EventsTap.jpeg',
        '/assets/images/screenshots/RessourceTap.jpeg',
        '/assets/images/screenshots/TicketPage.jpeg',
        '/assets/images/screenshots/profileTap.jpeg'
    ];

    return (
        <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden scroll-smooth">
            {/* Custom Dynamic Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse-slow delay-2000" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-100 mix-blend-overlay" />
            </div>

            {/* Content Wrapper */}
            <div className="relative z-10 font-sans">

                {/* Hero Section */}
                <section className="relative pt-32 pb-20 px-6 lg:pt-48 lg:pb-32 overflow-hidden">
                    <div className="container mx-auto">
                        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

                            {/* Hero Text */}
                            <div className="flex-1 text-center lg:text-left">
                                <div className="flex items-center gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="w-16 h-16 relative rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/20 border border-white/10 group/icon cursor-pointer">
                                        <Image
                                            src="/assets/images/screenshots/appIcon.png"
                                            alt="EsttPlus Icon"
                                            fill
                                            className="object-contain transition-transform duration-700 group-hover/icon:scale-110"
                                        />
                                    </div>
                                    <Badge className="px-4 py-1.5 bg-blue-500/10 text-blue-400 border-blue-500/20 rounded-full">
                                        <Zap className="w-4 h-4 mr-2" />
                                        EXPÉRIENCE NATIVE v1.0.4
                                    </Badge>
                                </div>
                                <h1 className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-[0.85] bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500 drop-shadow-sm animate-in fade-in slide-in-from-left-8 duration-1000">
                                    LE FUTUR DE <br />
                                    <span className="text-blue-500 drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">L&apos;ESTT</span> EST LÀ.
                                </h1>
                                <p className="text-lg md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light animate-in fade-in slide-in-from-left-10 duration-1200 delay-200">
                                    EsttPlus est une plateforme complète conçue pour la communauté de l&apos;EST Tétouan. Connectez-vous, partagez et gérez vos événements en toute fluidité.
                                </p>

                                <div className="flex flex-col sm:flex-row items-center gap-8 justify-center lg:justify-start animate-in fade-in slide-in-from-left-12 duration-1500 delay-500">
                                    <button className="group relative px-12 py-6 bg-blue-600 rounded-[2rem] font-black text-2xl overflow-hidden transition-all duration-700 ease-custom hover:scale-105 hover:bg-blue-500 hover:shadow-[0_0_50px_rgba(37,99,235,0.4)] active:scale-95 shadow-xl">
                                        <div className="relative z-10 flex items-center text-white">
                                            <Download className="mr-3 w-7 h-7 animate-bounce" />
                                            TÉLÉCHARGER APK
                                        </div>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                                    </button>

                                    <a href="https://github.com/torchcoders/esttplus" target="_blank" className="flex items-center text-gray-500 hover:text-white transition-all duration-500 group">
                                        <Github className="mr-4 w-10 h-10 group-hover:rotate-[15deg] group-hover:scale-110 transition-transform duration-500" />
                                        <div className="flex flex-col items-start leading-none">
                                            <span className="text-xl font-black uppercase tracking-widest border-b border-white/10 group-hover:border-white transition-all mb-1">OPEN SOURCE</span>
                                            <span className="text-xs text-gray-600 group-hover:text-blue-400 transition-colors">Explorer sur GitHub</span>
                                        </div>
                                        <ArrowRight className="ml-4 w-6 h-6 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 italic" />
                                    </a>
                                </div>
                            </div>

                            {/* Hero Image / Mockup */}
                            <div className="flex-1 relative max-w-sm lg:max-w-none animate-in fade-in zoom-in duration-1500">
                                <div className="relative z-10 w-[280px] md:w-[320px] lg:w-[400px] aspect-[9/19] mx-auto rounded-2xl border border-white/10 bg-[#020617] shadow-[0_0_120px_rgba(37,99,235,0.25)] overflow-hidden animate-float">
                                    <Image
                                        src="/assets/images/screenshots/HomeTap.jpeg"
                                        alt="App Interface"
                                        fill
                                        className="object-cover opacity-90 transition-transform duration-3000 hover:scale-110"
                                        priority
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-60 pointer-events-none" />
                                </div>
                                {/* Decorative elements behind phone */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] border border-blue-500/10 rounded-full animate-spin-slow pointer-events-none" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] border border-indigo-500/5 rounded-full animate-spin-slow-reverse pointer-events-none" />
                                <div className="absolute -inset-20 bg-blue-500/5 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats / Proof Section */}
                <section className="py-24 bg-white/[0.01] border-y border-white/[0.05] relative overflow-hidden group">
                    <div className="container mx-auto px-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                            {[
                                { label: "Performance", value: "99%", icon: <Cpu className="w-5 h-5 text-blue-400" /> },
                                { label: "Disponibilité", value: "24/7", icon: <Globe className="w-5 h-5 text-indigo-400" /> },
                                { label: "Sécurité", value: "SSL", icon: <Shield className="w-5 h-5 text-emerald-400" /> },
                                { label: "Estimation", value: "4.9", icon: <Star className="w-5 h-5 text-amber-400" /> }
                            ].map((stat, i) => (
                                <div key={i} className="group/stat cursor-default transition-all duration-700 ease-out">
                                    <div className="flex items-center justify-center gap-2 mb-3 text-gray-500 group-hover/stat:text-blue-400 transition-colors duration-500">
                                        {stat.icon}
                                        <span className="text-sm font-bold uppercase tracking-[0.25em]">{stat.label}</span>
                                    </div>
                                    <div className="text-4xl md:text-6xl font-black text-white group-hover/stat:scale-110 group-hover/stat:text-blue-50 transition-transform duration-700 ease-custom-alt">
                                        {stat.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-40 px-6 relative">
                    <div className="container mx-auto text-white">
                        <div className="text-center mb-32 max-w-4xl mx-auto">
                            <Badge variant="outline" className="mb-6 border-blue-500/10 text-blue-500 uppercase tracking-[0.4em] text-[10px] px-6 py-2 bg-blue-500/5 rounded-full">Inner Workings</Badge>
                            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black mb-10 tracking-tighter leading-none italic uppercase">
                                UNE RÉVOLUTION <br />
                                <span className="text-blue-500 not-italic relative">
                                    COMMUNAUTAIRE
                                    <span className="absolute -bottom-2 left-0 w-full h-1.5 bg-blue-500/30 rounded-full" />
                                </span>.
                            </h2>
                            <p className="text-xl md:text-2xl text-gray-400 font-light leading-relaxed max-w-3xl mx-auto">
                                Chaque aspect de l&apos;expérience étudiante a été réimaginé pour la rapidité, la simplicité et le plaisir absolu d&apos;utilisation.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                            {features.map((feature, i) => (
                                <div
                                    key={i}
                                    className="group relative p-10 rounded-[3rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-blue-500/40 transition-all duration-1000 ease-custom hover:-translate-y-6 overflow-hidden shadow-2xl hover:shadow-blue-500/10"
                                >
                                    <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-500/5 rounded-full blur-[60px] group-hover:bg-blue-500/20 transition-all duration-1000" />
                                    <div className="mb-10 p-6 rounded-[1.5rem] bg-white/[0.04] inline-block shadow-inner group-hover:scale-125 group-hover:rotate-[15deg] transition-all duration-700 ease-custom-alt group-hover:bg-blue-500/10">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-3xl font-black mb-6 group-hover:text-white transition-colors duration-500 tracking-tight leading-none uppercase">{feature.title}</h3>
                                    <p className="text-lg text-gray-400 font-light leading-relaxed group-hover:text-gray-200 transition-colors duration-500">
                                        {feature.desc}
                                    </p>
                                    <div className="mt-10 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-4 group-hover:translate-y-0 flex items-center text-blue-500 text-sm font-black uppercase tracking-widest">
                                        Explorer <ArrowRight className="ml-2 w-5 h-5 animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Vertical Screenshot Showcase */}
                <section className="py-40 bg-[#020617] relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-500/[0.02] pointer-events-none" />
                    <div className="container mx-auto px-6 relative">
                        <div className="flex flex-col lg:flex-row items-center gap-24 lg:gap-32">
                            <div className="flex-1 max-w-2xl">
                                <div className="w-20 h-1.5 bg-blue-600 mb-10 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)]" />
                                <h2 className="text-6xl md:text-8xl font-black mb-10 tracking-tighter leading-[0.85] uppercase drop-shadow-lg">
                                    CONÇUE POUR <br />
                                    <span className="text-blue-600 italic">L&apos;EXCELLENCE</span>.
                                </h2>
                                <p className="text-xl md:text-3xl text-gray-400 font-light leading-relaxed mb-16 italic">
                                    Une interface sombre, épurée et ultra-réactive qui respecte votre batterie tout en offrant une lisibilité parfaite dans toutes les conditions.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mb-16">
                                    {[
                                        { label: "Vitesse", val: "60 FPS", icon: <Zap className="w-5 h-5" /> },
                                        { label: "Moteur", val: "React Native", icon: <Cpu className="w-5 h-5" /> },
                                        { label: "Poids", val: "~15 MB", icon: <Download className="w-5 h-5" /> },
                                        { label: "Design", val: "Glassmorphism", icon: <Monitor className="w-5 h-5" /> }
                                    ].map((item, i) => (
                                        <div key={i} className="flex flex-col gap-2 group/prop transition-all duration-500 hover:translate-x-2">
                                            <div className="flex items-center gap-2 text-blue-500/80 text-xs font-black uppercase tracking-[0.3em]">
                                                {item.icon} {item.label}
                                            </div>
                                            <div className="text-2xl font-black text-white group-hover/prop:text-blue-400 transition-colors uppercase tracking-tight">{item.val}</div>
                                        </div>
                                    ))}
                                </div>
                                <button className="px-12 py-5 border border-white/10 rounded-2xl text-gray-400 font-bold hover:bg-white/5 hover:text-white transition-all duration-500">
                                    DÉCOUVRIR LE DESIGN SYSTEM
                                </button>
                            </div>

                            <div className="flex-1 flex gap-10 h-[900px] overflow-hidden mask-fade-edges relative group/gallery">
                                <div className="flex flex-col gap-10 animate-scroll-vertical will-change-transform group-hover/gallery:pause-scroll">
                                    {[...screenshots, ...screenshots].map((src, i) => (
                                        <div key={i} className="w-[240px] md:w-[300px] aspect-[9/19] rounded-2xl border border-white/5 overflow-hidden grayscale hover:grayscale-0 transition-all duration-1200 ease-custom hover:scale-105 shadow-[0_45px_100px_-20px_rgba(0,0,0,0.9)] relative group/screenshot">
                                            <Image src={src} alt="App screen" width={500} height={1000} className="object-cover transition-transform duration-3000 group-hover/screenshot:scale-110" />
                                            <div className="absolute inset-0 bg-blue-600/0 group-hover/screenshot:bg-blue-600/5 transition-colors duration-1000" />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-col gap-10 animate-scroll-vertical-reverse mt-[-400px] hide-mobile will-change-transform group-hover/gallery:pause-scroll">
                                    {[...screenshots, ...screenshots].map((src, i) => (
                                        <div key={i} className="w-[240px] md:w-[300px] aspect-[9/19] rounded-2xl border border-white/5 overflow-hidden grayscale hover:grayscale-0 transition-all duration-1200 ease-custom hover:scale-105 shadow-[0_45px_100px_-20px_rgba(0,0,0,0.9)] relative group/screenshot">
                                            <Image src={src} alt="App screen" width={500} height={1000} className="object-cover transition-transform duration-3000 group-hover/screenshot:scale-110" />
                                            <div className="absolute inset-0 bg-blue-600/0 group-hover/screenshot:bg-blue-600/5 transition-colors duration-1000" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA / Open Source */}
                <section className="py-48 relative px-6 overflow-hidden">
                    <div className="container mx-auto">
                        <div className="max-w-6xl mx-auto rounded-[5rem] bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent border border-white/[0.1] shadow-2xl backdrop-blur-3xl overflow-hidden relative group transition-all duration-1000 hover:border-blue-500/30">

                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent animate-shimmer" />

                            <div className="p-8 md:p-16 lg:p-32 text-center relative z-10">
                                <div className="mb-10 inline-flex p-6 rounded-full bg-pink-500/10 text-pink-500 animate-pulse-slow">
                                    <Heart className="w-12 h-12 md:w-16 md:h-16" />
                                </div>
                                <h2 className="text-4xl md:text-8xl lg:text-9xl font-black mb-10 tracking-tighter leading-none uppercase italic drop-shadow-xl">
                                    Rejoignez la <br />
                                    <span className="text-blue-500 not-italic glow-text">communauté</span>.
                                </h2>
                                <p className="text-lg md:text-4xl text-gray-400 mb-20 font-light leading-relaxed max-w-3xl mx-auto italic tracking-tight uppercase opacity-80">
                                    EsttPlus est un projet open source développé par et pour les étudiants d&apos;élite de l&apos;EST Tétouan.
                                </p>

                                <div className="flex flex-col lg:flex-row items-center justify-center gap-16">
                                    <a
                                        href="https://expo.dev/artifacts/eas/4QW4Fn5v85oLWxeTcoYeoi.apk"
                                        download
                                        className="w-full lg:w-auto px-20 py-8 bg-white text-black rounded-[2.5rem] font-black text-3xl hover:bg-blue-600 hover:text-white transition-all duration-800 ease-custom hover:scale-110 hover:-rotate-2 shadow-[0_30px_100px_rgba(255,255,255,0.15)] active:scale-95 flex items-center justify-center group/btn"
                                    >
                                        <Download className="mr-5 w-9 h-9 group-hover/btn:animate-bounce" />
                                        INSTALLER APK
                                    </a>

                                    <div className="flex items-center gap-14">
                                        <Link href="https://github.com/torchcoders/esttplus" target="_blank" className="flex flex-col items-center gap-4 group/link transition-all duration-500 hover:scale-110">
                                            <div className="p-7 rounded-[2rem] bg-white/[0.05] border border-white/[0.1] group-hover/link:bg-white/[0.1] group-hover/link:border-blue-500/80 transition-all duration-500 group-hover/link:-translate-y-4 group-hover/link:shadow-2xl group-hover/link:shadow-blue-500/20">
                                                <Github className="w-10 h-10" />
                                            </div>
                                            <span className="text-sm font-black uppercase tracking-[0.4em] text-gray-500 group-hover/link:text-white transition-colors">GitHub</span>
                                        </Link>
                                        <button className="flex flex-col items-center gap-4 group/link transition-all duration-500 hover:scale-110 opacity-50 cursor-not-allowed">
                                            <div className="p-7 rounded-[2rem] bg-white/[0.05] border border-white/[0.1]">
                                                <Monitor className="w-10 h-10" />
                                            </div>
                                            <span className="text-sm font-black uppercase tracking-[0.4em] text-gray-500">Releases</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Minimal Footer */}
                <footer className="py-24 border-t border-white/5 text-center relative overflow-hidden bg-[#01030e]">
                    <div className="container mx-auto px-6 relative z-10">
                        <div className="flex flex-col items-center gap-10">
                            <div className="w-16 h-16 relative opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-2000 cursor-help hover:scale-125 hover:rotate-[360deg] rounded-2xl overflow-hidden border border-white/10">
                                <Image src="/assets/images/screenshots/appIcon.png" alt="Icon" fill className="object-contain" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <p className="text-gray-600 font-bold tracking-[0.5em] text-[10px] uppercase mb-4">
                                    © MMXXVI EsttPlus Community · Built with Absolute Passion in Tétouan
                                </p>
                                <div className="flex justify-center gap-6 text-gray-700 text-[10px] font-black tracking-widest uppercase">
                                    <span className="hover:text-blue-500 cursor-pointer transition-colors">Confidentialité</span>
                                    <span className="hover:text-blue-500 cursor-pointer transition-colors">Conditions</span>
                                    <span className="hover:text-blue-500 cursor-pointer transition-colors">Support</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Background decoration */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-64 bg-gradient-to-t from-blue-600/[0.08] to-transparent pointer-events-none" />
                </footer>
            </div>

            <style jsx global>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) translate3d(0,0,0); }
                    50% { transform: translateY(-40px) translate3d(0,0,0); }
                }
                .animate-float {
                    animation: float 10s cubic-bezier(0.45, 0, 0.55, 1) infinite;
                    will-change: transform;
                }
                .animate-spin-slow {
                    animation: spin 120s linear infinite;
                    will-change: transform;
                }
                .animate-spin-slow-reverse {
                    animation: spin 100s linear infinite reverse;
                    will-change: transform;
                }
                @keyframes scroll-vertical {
                    0% { transform: translateY(0) translate3d(0,0,0); }
                    100% { transform: translateY(-50%) translate3d(0,0,0); }
                }
                .animate-scroll-vertical {
                    animation: scroll-vertical 55s linear infinite;
                    will-change: transform;
                }
                .animate-scroll-vertical-reverse {
                    animation: scroll-vertical 50s linear infinite reverse;
                    will-change: transform;
                }
                .pause-scroll {
                    animation-play-state: paused ! from-current;
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.2; transform: scale(1) translate3d(0,0,0); }
                    50% { opacity: 0.6; transform: scale(1.1) translate3d(0,0,0); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 6s ease-in-out infinite;
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 3s infinite linear;
                }
                .mask-fade-edges {
                    mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
                    -webkit-mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
                }
                .glow-text {
                    text-shadow: 0 0 40px rgba(59, 130, 246, 0.4);
                }
                
                @media (max-width: 768px) {
                    .hide-mobile { display: none; }
                }

                /* Custom Scrollbar for a premium look */
                ::-webkit-scrollbar {
                  width: 8px;
                }
                ::-webkit-scrollbar-track {
                  background: #020617;
                }
                ::-webkit-scrollbar-thumb {
                  background: #1e293b;
                  border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                  background: #3b82f6;
                }
            `}</style>
        </div>
    );
}
