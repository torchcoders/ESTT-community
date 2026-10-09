'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, ref, get, update } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { getClubBySlug, getClubPath, isClubAdmin } from '@/lib/clubUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, AlertCircle, Scan, User } from 'lucide-react';
import Link from 'next/link';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { cn } from '@/lib/utils';


export default function TicketScannerPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const clubId = params.clubId;

    const [club, setClub] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [scannedTicket, setScannedTicket] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [scanning, setScanning] = useState(true);

    // scannerRef unused — scanner is managed via Html5QrcodeScanner instance directly

    useEffect(() => {
        if (clubId && !authLoading) {
            checkAccess();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId, authLoading]);

    useEffect(() => {
        if (isAdmin && scanning) {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );

            scanner.render(onScanSuccess, onScanFailure);

            return () => {
                scanner.clear().catch(error => {
                    console.error("Failed to clear scanner.", error);
                });
            };
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, scanning]);

    const checkAccess = async () => {
        try {
            const clubData = await getClubBySlug(clubId);
            if (!clubData) {
                router.push('/clubs');
                return;
            }

            setClub(clubData);

            if (!user) {
                router.push('/login');
                return;
            }

            const adminStatus = isClubAdmin(user.email, clubData);
            setIsAdmin(adminStatus);

            if (!adminStatus) {
                setError("Accès refusé. Vous n'êtes pas administrateur de ce club.");
            }
        } catch (err) {
            console.error(err);
            setError("Erreur de chargement");
        } finally {
            setLoading(false);
        }
    };

    function onScanSuccess(decodedText) {
        // Assume decodedText is the ticket ID
        handleTicketLookup(decodedText);
    }

    function onScanFailure(_error) {
        // console.warn(`Code scan error = ${error}`);
    }

    const handleTicketLookup = async (ticketId) => {
        setError('');
        setSuccess('');
        setScannedTicket(null);

        // Stop scanning while processing
        setScanning(false);

        try {
            const ticketSnap = await get(ref(db, `tickets/${ticketId}`));
            if (!ticketSnap.exists()) {
                throw new Error("Ticket introuvable.");
            }

            const ticketData = ticketSnap.val();

            if (ticketData.clubId !== clubId) {
                throw new Error("Ce ticket n'appartient pas à ce club.");
            }

            setScannedTicket({ id: ticketId, ...ticketData });
        } catch (err) {
            setError(err.message);
            setScanning(true); // Resume scanning on error
        }
    };

    const handleCheckIn = async () => {
        if (!scannedTicket) return;
        setActionLoading(true);

        try {
            await update(ref(db, `tickets/${scannedTicket.id}`), {
                scanned: true,
                scannedAt: Date.now(),
                scannedBy: user.email,
                checkedIn: true,
                checkedInAt: Date.now(),
                checkedInBy: user.email
            });

            setSuccess("Validation réussie ! Le participant peut entrer.");
            setScannedTicket(prev => ({ ...prev, scanned: true, checkedIn: true }));

            // Auto reset after 3 seconds
            setTimeout(() => {
                setScannedTicket(null);
                setSuccess('');
                setScanning(true);
            }, 3000);

        } catch {
            setError("Erreur lors de la validation");
        } finally {
            setActionLoading(false);
        }
    };

    const handleValidateTicket = async () => {
        if (!scannedTicket) return;
        setActionLoading(true);

        try {
            await update(ref(db, `tickets/${scannedTicket.id}`), {
                status: 'valid'
            });

            setSuccess("Ticket marqué comme VALIDE.");
            setScannedTicket(prev => ({ ...prev, status: 'valid' }));
        } catch {
            setError("Erreur lors de la validation");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/10">
                <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10">
                    <Link href={`${getClubPath(club)}/admin`}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Admin
                    </Link>
                </Button>
                <h1 className="font-bold flex items-center gap-2">
                    <Scan className="w-5 h-5 text-primary" /> Scanneur de Tickets
                </h1>
                <div className="w-10" /> {/* Spacer */}
            </div>

            <main className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-6">
                {!scannedTicket && (
                    <div className="w-full max-w-md space-y-4">
                        <Card className="bg-slate-800 border-slate-700 overflow-hidden shadow-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-white text-center">Scannez le Code QR</CardTitle>
                                <CardDescription className="text-slate-400 text-center italic">
                                    Placez le ticket devant la caméra
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div id="reader" className="w-full"></div>
                                {error && (
                                    <div className="p-4 bg-red-500/10 border-t border-red-500/20 text-red-500 text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> {error}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex flex-col gap-2">
                            <Label className="text-slate-400 text-xs text-center">OU ENTRER L&apos;ID MANUELLEMENT</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Ticket ID (ex: -O...)"
                                    className="bg-slate-800 border-slate-700 text-white"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleTicketLookup(e.target.value);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {scannedTicket && (
                    <Card className={cn(
                        "w-full max-w-md border-2 shadow-2xl animate-in zoom-in-95 duration-200",
                        scannedTicket.status === 'valid' ? "border-green-500 bg-slate-800" : "border-amber-500 bg-slate-800"
                    )}>
                        <CardHeader className="text-center">
                            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 bg-slate-700">
                                <User className="w-8 h-8 text-white" />
                            </div>
                            <CardTitle className="text-white text-2xl">
                                {scannedTicket.firstName} {scannedTicket.lastName}
                            </CardTitle>
                            <div className="flex justify-center gap-2 mt-2">
                                <Badge variant={scannedTicket.status === 'valid' ? 'default' : 'outline'} className={scannedTicket.status === 'valid' ? 'bg-green-600' : 'text-amber-500 border-amber-500'}>
                                    {scannedTicket.status === 'valid' ? 'VALIDE' : 'EN ATTENTE'}
                                </Badge>
                                {(scannedTicket.scanned || scannedTicket.checkedIn) && (
                                    <Badge className="bg-blue-600">DÉJÀ SCANNÉ</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4 border-t border-white/10">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-400 uppercase font-black">Événement</p>
                                    <p className="text-sm font-bold text-white leading-tight">{scannedTicket.eventName}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-400 uppercase font-black">Date</p>
                                    <p className="text-sm font-bold text-white">{scannedTicket.eventDate || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] text-slate-400 uppercase font-black">Coordonnées</p>
                                <p className="text-sm text-slate-200">{scannedTicket.userEmail}</p>
                            </div>

                            {success && (
                                <Alert className="bg-green-500 border-none text-white">
                                    <CheckCircle2 className="h-4 w-4 text-white" />
                                    <AlertDescription className="font-bold">{success}</AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-2 pt-4">
                            {scannedTicket.status !== 'valid' && (
                                <Button onClick={handleValidateTicket} className="w-full bg-amber-600 hover:bg-amber-700" disabled={actionLoading}>
                                    {actionLoading ? <Loader2 className="animate-spin" /> : 'Valider ce Ticket'}
                                </Button>
                            )}

                            <Button
                                onClick={handleCheckIn}
                                className={cn("w-full h-14 text-lg font-black", scannedTicket.checkedIn ? "bg-slate-700" : "bg-green-600 hover:bg-green-700")}
                                disabled={actionLoading || scannedTicket.checkedIn || scannedTicket.status !== 'valid'}
                            >
                                {scannedTicket.scanned || scannedTicket.checkedIn ? <CheckCircle2 className="mr-2 h-6 w-6" /> : <Scan className="mr-2 h-6 w-6" />}
                                {scannedTicket.scanned || scannedTicket.checkedIn ? 'DÉJÀ SCANNÉ' : 'APPROUVER L\'ENTRÉE'}
                            </Button>

                            <Button variant="ghost" className="w-full text-slate-400" onClick={() => {
                                setScannedTicket(null);
                                setScanning(true);
                                setSuccess('');
                                setError('');
                            }}>
                                <XCircle className="w-4 h-4 mr-2" /> Annuler / Scanner Suivant
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </main>

            {/* Bottom Bar Info */}
            <div className="p-4 bg-slate-950/50 text-center border-t border-white/5">
                <p className="text-[10px] text-slate-500">
                    ESTT Community • Scanneur Officiel v1.0
                </p>
            </div>
        </div>
    );
}
