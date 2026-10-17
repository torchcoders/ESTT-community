'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db, ref, get, onValue } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, Ticket, Calendar, User, Building2, CheckCircle2, AlertCircle, ArrowLeft, MapPin, Clock, Share2, Download } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

export default function TicketPage() {
    const params = useParams();
    const ticketId = params.ticketId;

    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [club, setClub] = useState(null);
    const searchParams = useSearchParams();
    const orderId = searchParams.get('order_id');
    const [verifying, setVerifying] = useState(false);
    const [, setJustScanned] = useState(false);
    const [prevScanned, setPrevScanned] = useState(false);

    useEffect(() => {
        if (!ticketId || !db) return;

        const ticketRef = ref(db, `tickets/${ticketId}`);

        // Use onValue for real-time status updates (Validated by admin)
        const unsubscribe = onValue(ticketRef, async (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();

                // Check if it was just scanned (transition from false to true)
                const isScanned = data.scanned || data.checkedIn;
                if (isScanned && !prevScanned && ticket) {
                    setJustScanned(true);
                    // Reset animation state after 3 seconds
                    setTimeout(() => setJustScanned(false), 3000);
                }
                setPrevScanned(isScanned);

                setTicket({ id: ticketId, ...data });

                // Fetch club data for theme/branding if not already fetched
                if (!club) {
                    const clubSnap = await get(ref(db, `clubs/${data.clubId}`));
                    if (clubSnap.exists()) {
                        setClub(clubSnap.val());
                    }
                }

                // Fallback Verification: If order_id is in URL and ticket still awaiting_payment
                if (orderId && data.status === 'awaiting_payment' && !verifying) {
                    setVerifying(true);
                    try {
                        await fetch('/api/verify-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ticketId, orderId })
                        });
                    } catch (err) {
                        console.error('Verification callback failed:', err);
                    } finally {
                        setVerifying(false);
                    }
                }

                setLoading(false);
            } else {
                setError('Ticket introuvable');
                setLoading(false);
            }
        }, (err) => {
            console.error(err);
            setError('Erreur de chargement');
            setLoading(false);
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticketId, db, orderId, verifying, prevScanned, ticket?.id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !ticket) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 px-4">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center animate-pulse">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <p className="text-xl font-bold text-white">{error || 'Ticket invalide'}</p>
                <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <Link href="/">Retour à l&apos;accueil</Link>
                </Button>
            </div>
        );
    }

    // QR Code Data - Using just the ID for simplicity and security
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${ticketId}`;

    const themeColor = club?.themeColor || '#0ea5e9';

    return (
        <main className="min-h-screen bg-slate-950 py-12 px-4 md:py-20 flex items-center justify-center overflow-hidden relative">
            {/* Animated Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-80 h-80 rounded-full blur-[120px] opacity-20 animate-pulse" style={{ backgroundColor: themeColor }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 rounded-full blur-[120px] opacity-20 animate-pulse" style={{ backgroundColor: themeColor, animationDelay: '2s' }} />

            <div className="w-full max-w-md space-y-6 relative z-10">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" asChild className="text-white/60 hover:text-white hover:bg-white/5">
                        <Link href={club ? (club.username ? `/clubs/${club.username}` : `/clubs/${ticket.clubId}`) : `/clubs/${ticket.clubId}`}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Club
                        </Link>
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/5" onClick={() => window.print()}>
                            <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/5">
                            <Share2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* THE TICKET */}
                <div className={cn(
                    "flex flex-col shadow-2xl rounded-[2.5rem] overflow-hidden bg-card group animate-in slide-in-from-bottom-8 duration-700 transition-all",
                    (ticket.scanned || ticket.checkedIn) && "ring-[16px] ring-green-500/10"
                )}>
                    {/* Top Part: Branding & Event */}
                    <div className="relative p-8 text-white min-h-[160px] flex flex-col justify-end" style={{ backgroundColor: themeColor }}>
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Ticket className="w-24 h-24 rotate-12" />
                        </div>
                        <div className="absolute top-8 left-8">
                            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 flex items-center gap-2">
                                <Building2 className="w-3 h-3" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{ticket.clubName}</span>
                            </div>
                        </div>
                        <h1 className="text-3xl font-black uppercase tracking-tight leading-none mb-1">{ticket.eventName}</h1>
                        <p className="text-white/70 text-sm font-medium">Billet d&apos;entrée officiel</p>
                    </div>

                    {/* Middle: Details */}
                    <div className="bg-card p-8 relative">
                        {/* Punch holes */}
                        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950" />
                        <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950" />

                        {/* Perforated line */}
                        <div className="absolute top-0 left-8 right-8 h-[2px] border-t-2 border-dashed border-border -translate-y-1/2" />

                        <div className="grid grid-cols-2 gap-y-6">
                            <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1">
                                    <User className="w-3 h-3" /> Participant
                                </p>
                                <p className="font-bold text-foreground line-clamp-1">{ticket.firstName} {ticket.lastName}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Date
                                </p>
                                <p className="font-bold text-foreground">{ticket.eventDate || new Date(ticket.createdAt).toLocaleDateString('fr-FR')}</p>
                            </div>
                            {ticket.eventTime && (
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Heure
                                    </p>
                                    <p className="font-bold text-foreground">{ticket.eventTime}</p>
                                </div>
                            )}
                            {ticket.eventLocation && (
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Lieu
                                    </p>
                                    <p className="font-bold text-foreground line-clamp-1">{ticket.eventLocation}</p>
                                </div>
                            )}
                        </div>

                        {/* Status Banner */}
                        <div className={cn(
                            "mt-8 p-4 rounded-2xl flex items-center gap-4 border-2 transition-all duration-500",
                            ticket.status === 'valid'
                                ? (ticket.scanned || ticket.checkedIn ? "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-500/15 dark:border-blue-500/40 dark:text-blue-300" : "bg-green-50 border-green-100 text-green-700 dark:bg-green-500/15 dark:border-green-500/40 dark:text-green-300")
                                : "bg-amber-50 border-amber-100 text-amber-700 animate-pulse dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-300"
                        )}>
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                ticket.status === 'valid'
                                    ? (ticket.scanned || ticket.checkedIn ? "bg-blue-500 text-white" : "bg-green-500 text-white")
                                    : "bg-amber-500 text-white"
                            )}>
                                {ticket.status === 'valid'
                                    ? (ticket.scanned || ticket.checkedIn ? <CheckCircle2 className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />)
                                    : <Loader2 className="w-6 h-6 animate-spin" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Statut du ticket</p>
                                <p className="font-black text-sm uppercase">
                                    {ticket.status === 'valid'
                                        ? (ticket.scanned || ticket.checkedIn ? 'SCANNÉ / ENTRÉE VALIDÉE' : 'VALIDÉ - PRÊT')
                                        : 'EN ATTENTE DE VALIDATION'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom: QR Code */}
                    <div className="bg-muted p-10 flex flex-col items-center justify-center relative">
                        {/* Perforated line */}
                        <div className="absolute top-0 left-8 right-8 h-[2px] border-t-2 border-dashed border-border" />

                        <div className={cn(
                            "p-4 bg-card rounded-[2rem] shadow-sm border-2 transition-all duration-1000 relative",
                            ticket.status === 'valid'
                                ? (ticket.scanned || ticket.checkedIn ? "border-blue-200 opacity-40 filter grayscale scale-95" : "border-border")
                                : "border-border opacity-20 filter grayscale"
                        )}>
                            <Image
                                src={qrUrl}
                                alt="QR Code"
                                width={200}
                                height={200}
                                className="w-48 h-48"
                            />

                            {(ticket.scanned || ticket.checkedIn) && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-2xl border-4 border-green-500/20 scale-110 animate-in zoom-in-50 fade-in duration-500">
                                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {ticket.status !== 'valid' && (
                            <div className="absolute inset-0 flex items-center justify-center px-12 text-center">
                                <p className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-border shadow-xl text-xs font-bold text-muted-foreground">
                                    Le QR Code sera activé une fois votre billet validé par l&apos;organisateur.
                                </p>
                            </div>
                        )}

                        <div className="mt-6 text-center space-y-1">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ticket ID</p>
                            <p className="text-xs font-mono text-muted-foreground">{ticket.id.toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-white/40 text-[10px] font-medium uppercase tracking-widest">
                        Digital Ticket Powered by ESTT Community
                    </p>
                </div>
            </div>

            {/* Print styles */}
            <style jsx global>{`
                @media print {
                    body { background: white !important; }
                    .bg-slate-950 { background: white !important; }
                    main { padding: 0 !important; }
                    .no-print { display: none !important; }
                    button { display: none !important; }
                }
            `}</style>
        </main>
    );
}
