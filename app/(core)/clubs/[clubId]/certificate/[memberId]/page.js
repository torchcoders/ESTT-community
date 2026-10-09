'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Loader2, Download, ArrowLeft, Award, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { generateCertificate, getCertificateSignature } from '@/lib/pdfUtils';
import { getClubBySlug, getClubPath } from '@/lib/clubUtils';

export default function CertificatePage() {
    const params = useParams();
    const { clubId, memberId } = params;

    const [club, setClub] = useState(null);
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (clubId && memberId) {
            fetchData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId, memberId]);

    const fetchData = async () => {
        try {
            // Fetch Club
            const clubData = await getClubBySlug(clubId);
            if (!clubData) {
                setError('Club introuvable');
                return;
            }
            setClub(clubData);

            // Find Member in club members list
            const members = clubData.members || [];
            const foundMember = members.find(m => m.id.toString() === memberId.toString());

            if (!foundMember) {
                setError('Membre introuvable dans ce club');
                return;
            }
            setMember(foundMember);

            // Auto-trigger generation after a short delay to ensure UI is ready
            setTimeout(() => {
                handleDownload(foundMember, clubData);
            }, 1500);

        } catch (err) {
            console.error(err);
            setError('Erreur de chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (memberData, clubData) => {
        if (generating) return;
        setGenerating(true);
        try {
            await generateCertificate(memberData, clubData);
        } catch (err) {
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-muted">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Préparation de votre certificat...</p>
            </div>
        );
    }

    if (error || !member || !club) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-muted p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-red-600">Erreur</CardTitle>
                        <CardDescription>{error || 'Une erreur est survenue'}</CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center">
                        <Button asChild variant="outline">
                            <Link href="/">Retour à l&apos;accueil</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-muted flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-xl border-t-4" style={{ borderTopColor: club.themeColor || '#3b82f6' }}>
                <CardHeader className="text-center">
                    <div className="mx-auto w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                        <Award className="w-10 h-10" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Certificat d&apos;Adhésion Officiel</CardTitle>
                    <CardDescription>
                        Félicitations, vous êtes membre de <strong>{club.name}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                    <div className="p-6 bg-card border-2 border-dashed rounded-xl space-y-2">
                        <p className="text-sm text-muted-foreground uppercase tracking-widest">Décerné à</p>
                        <p className="text-2xl font-bold text-foreground">{member.name}</p>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 py-2 px-4 rounded-full text-sm font-medium mx-auto w-fit dark:text-green-300 dark:bg-green-500/15">
                            <CheckCircle2 className="w-4 h-4" />
                            Signature numérique vérifiée
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                            Vérification ID: {getCertificateSignature(member, club)}
                        </p>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        Votre certificat est en cours de génération et devrait être téléchargé automatiquement.
                        Si ce n&apos;est pas le cas, utilisez le bouton ci-dessous.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button
                        onClick={() => handleDownload(member, club)}
                        disabled={generating}
                        className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Génération...
                            </>
                        ) : (
                            <>
                                <Download className="w-5 h-5 mr-2" />
                                Télécharger mon certificat (PDF)
                            </>
                        )}
                    </Button>
                    <Button asChild variant="ghost" className="w-full">
                        <Link href={getClubPath(club)}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Retourner au profil du club
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
}
