'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db, ref, get, push, set } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle2, ArrowLeft, AlertCircle, Download } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { generatePDF } from '@/lib/pdfUtils';
import { getClubBySlug, getClubPath } from '@/lib/clubUtils';

export default function ClubJoinPage() {
    const params = useParams();
    const { user, profile } = useAuth();
    const clubId = params.clubId;

    const [club, setClub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [lastRequest, setLastRequest] = useState(null);
    const [exportingPDF, setExportingPDF] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        reason: '',
        answers: {} // For custom questions
    });
    const [joinFormQuestions, setJoinFormQuestions] = useState([]);

    useEffect(() => {
        if (clubId) {
            fetchClubData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId]);

    useEffect(() => {
        if (user || profile) {
            setFormData(prev => ({
                ...prev,
                name: (profile?.firstName && profile?.lastName)
                    ? `${profile.firstName} ${profile.lastName}`
                    : (user?.displayName || prev.name),
                email: user?.email || prev.email
            }));
        }
    }, [user, profile]);

    const fetchClubData = async () => {
        try {
            const clubData = await getClubBySlug(clubId);
            if (!clubData) {
                setError('Club not found');
                setLoading(false);
                return;
            }

            setClub(clubData);

            // Fetch custom questions
            const questionsRef = ref(db, `clubs/${clubData.id}/joinFormQuestions`);
            const questionsSnap = await get(questionsRef);
            if (questionsSnap.exists()) {
                setJoinFormQuestions(questionsSnap.val() || []);
            }
        } catch (error) {
            console.error('Error fetching club:', error);
            setError('Failed to load club data');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAnswerChange = (questionId, value) => {
        setFormData(prev => ({
            ...prev,
            answers: {
                ...prev.answers,
                [questionId]: value
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            if (!formData.name || !formData.email || !formData.reason) {
                throw new Error('Veuillez remplir tous les champs obligatoires');
            }

            // Check custom required questions
            for (const q of joinFormQuestions) {
                if (q.required && !formData.answers[q.id]) {
                    throw new Error(`Le champ "${q.label}" est obligatoire`);
                }
            }

            // Create join request
            const requestRef = push(ref(db, `clubs/${club.id}/joinRequests`));
            const requestData = {
                id: requestRef.key,
                userId: user ? user.uid : null,
                ...formData,
                status: 'pending',
                submittedAt: Date.now()
            };

            await set(requestRef, requestData);
            setLastRequest(requestData);

            setSubmitted(true);

            // Trigger Notification to Club Admin
            try {
                // Check settings
                const settingsRef = ref(db, `clubs/${club.id}/settings/notifications`);
                const settingsSnap = await get(settingsRef);
                let sendNotif = true;
                let recipient = '';

                if (settingsSnap.exists()) {
                    const settings = settingsSnap.val();
                    sendNotif = settings.enabled !== false;
                    recipient = settings.email || '';
                }

                // Fallback recipient if enabled but no email set
                if (sendNotif && !recipient && club.organizationalChart) {
                    const president = Object.values(club.organizationalChart).find(m =>
                        m.role && m.role.toLowerCase() === 'président'
                    );
                    if (president) recipient = president.email;
                }
                if (sendNotif && recipient) {
                    const { adminNotificationEmail } = await import('@/lib/email-templates');
                    const notifHtml = adminNotificationEmail(
                        'Admin Club', // The Club admin name 
                        'Nouvelle Adhésion',
                        `Une nouvelle demande d'adhésion a été reçue de <strong>${formData.name}</strong> (${formData.email}). <br/>Raison: "<em>${formData.reason}</em>"`,
                        `https://estt.ma${getClubPath(club)}/admin`
                    );

                    await fetch('/api/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: recipient,
                            subject: `Nouvelle demande d'adhésion - ${club.name}`,
                            html: notifHtml
                        })
                    });
                }
            } catch (notifErr) {
                console.error('Failed to notify club admin:', notifErr);
            }
        } catch (err) {
            console.error('Error submitting form:', err);
            setError(err.message || 'Une erreur est survenue');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!club) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-xl text-muted-foreground">{error || 'Club introuvable'}</p>
                <Button asChild>
                    <Link href="/clubs">Retour aux clubs</Link>
                </Button>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-muted flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl text-green-700">Demande envoyée !</CardTitle>
                        <CardDescription>
                            Votre demande d&apos;adhésion a été transmise aux administrateurs du club.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            Vous recevrez une notification une fois votre demande traitée.
                        </p>

                        {lastRequest && (
                            <Button
                                onClick={async () => {
                                    setExportingPDF(true);
                                    try {
                                        await generatePDF(lastRequest, 'join', club);
                                    } catch (err) {
                                        console.error(err);
                                    } finally {
                                        setExportingPDF(false);
                                    }
                                }}
                                disabled={exportingPDF}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {exportingPDF ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                )}
                                Télécharger ma demande (PDF)
                            </Button>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button asChild variant="outline" className="w-full">
                            <Link href={getClubPath(club)}>Retourner au profil du club</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-background py-12 px-4">
            <style jsx global>{`
                .theme-text { color: ${club.themeColor || '#64748b'}; }
                .theme-bg { background-color: ${club.themeColor || '#64748b'}; }
                .theme-btn { background-color: ${club.themeColor || '#64748b'}; }
                .theme-btn:hover { opacity: 0.9; }
                .theme-ring:focus-visible { ring-color: ${club.themeColor || '#64748b'}; }
            `}</style>

            <div className="max-w-2xl mx-auto space-y-8">
                <Button variant="ghost" asChild className="mb-4">
                    <Link href={getClubPath(club)} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Retour au club
                    </Link>
                </Button>

                <div className="text-center space-y-4">
                    <div className="w-24 h-24 mx-auto relative rounded-2xl overflow-hidden bg-card shadow-lg border-2 border-white dark:border-border">
                        {club.logo ? (
                            <Image
                                src={club.logo}
                                alt={club.name}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center text-2xl font-bold bg-muted"
                                style={{ color: club.themeColor || '#64748b' }}
                            >
                                {club.name?.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">{club.name}</h1>
                        <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
                            Rejoignez notre communauté et participez à nos activités !
                        </p>
                    </div>
                </div>

                <Card className="border-t-4" style={{ borderTopColor: club.themeColor || '#64748b' }}>
                    <CardHeader>
                        <CardTitle>Formulaire d&apos;adhésion</CardTitle>
                        <CardDescription>
                            Remplissez ce formulaire pour soumettre votre candidature.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nom complet *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        placeholder="Votre nom"
                                        className="focus-visible:ring-offset-0 focus-visible:ring-1 theme-ring"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="votre@email.com"
                                        className="focus-visible:ring-offset-0 focus-visible:ring-1 theme-ring"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Numéro de téléphone</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+212 6..."
                                    className="focus-visible:ring-offset-0 focus-visible:ring-1 theme-ring"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reason">Pourquoi souhaitez-vous rejoindre le club ? *</Label>
                                <Textarea
                                    id="reason"
                                    name="reason"
                                    value={formData.reason}
                                    onChange={handleChange}
                                    required
                                    placeholder="Partagez vos motivations..."
                                    className="min-h-[100px] focus-visible:ring-offset-0 focus-visible:ring-1 theme-ring"
                                />
                            </div>

                            {joinFormQuestions.length > 0 && (
                                <div className="space-y-6 pt-4 border-t border-border">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Informations complémentaires</h3>
                                    {joinFormQuestions.map((q) => (
                                        <div key={q.id} className="space-y-2">
                                            <Label htmlFor={`q-${q.id}`}>
                                                {q.label} {q.required && '*'}
                                            </Label>
                                            {q.type === 'textarea' ? (
                                                <Textarea
                                                    id={`q-${q.id}`}
                                                    value={formData.answers[q.id] || ''}
                                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                    required={q.required}
                                                    placeholder="Votre réponse..."
                                                    className="min-h-[100px] focus-visible:ring-offset-0 focus-visible:ring-1 theme-ring"
                                                />
                                            ) : q.type === 'select' ? (
                                                <Select
                                                    onValueChange={(v) => handleAnswerChange(q.id, v)}
                                                    value={formData.answers[q.id] || ''}
                                                    required={q.required}
                                                >
                                                    <SelectTrigger className="focus-visible:ring-offset-0 focus-visible:ring-1 theme-ring">
                                                        <SelectValue placeholder="Sélectionnez une option" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(q.options || '').split(',').map(opt => opt.trim()).filter(Boolean).map(opt => (
                                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : q.type === 'radio' ? (
                                                <div className="space-y-2 mt-2">
                                                    {(q.options || '').split(',').map(opt => opt.trim()).filter(Boolean).map(opt => (
                                                        <div key={opt} className="flex items-center space-x-2">
                                                            <input
                                                                type="radio"
                                                                id={`q-${q.id}-${opt}`}
                                                                name={`q-${q.id}`}
                                                                required={q.required}
                                                                checked={formData.answers[q.id] === opt}
                                                                onChange={() => handleAnswerChange(q.id, opt)}
                                                                className="w-4 h-4 text-primary focus:ring-primary border-border"
                                                            />
                                                            <Label htmlFor={`q-${q.id}-${opt}`} className="font-normal cursor-pointer">
                                                                {opt}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : q.type === 'checkbox' ? (
                                                <div className="space-y-2 mt-2">
                                                    {(q.options || '').split(',').map(opt => opt.trim()).filter(Boolean).map(opt => (
                                                        <div key={opt} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`q-${q.id}-${opt}`}
                                                                checked={(formData.answers[q.id] || '').split(', ').includes(opt)}
                                                                onCheckedChange={(checked) => {
                                                                    const currentValues = formData.answers[q.id] ? formData.answers[q.id].split(', ') : [];
                                                                    let newValues;
                                                                    if (checked) {
                                                                        newValues = [...currentValues, opt];
                                                                    } else {
                                                                        newValues = currentValues.filter(v => v !== opt);
                                                                    }
                                                                    handleAnswerChange(q.id, newValues.join(', '));
                                                                }}
                                                            />
                                                            <Label htmlFor={`q-${q.id}-${opt}`} className="font-normal cursor-pointer">
                                                                {opt}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : q.type === 'boolean' ? (
                                                <div className="flex items-center space-x-2 mt-2">
                                                    <Checkbox
                                                        id={`q-${q.id}`}
                                                        checked={!!formData.answers[q.id]}
                                                        onCheckedChange={(checked) => handleAnswerChange(q.id, checked)}
                                                        required={q.required}
                                                    />
                                                    <Label htmlFor={`q-${q.id}`} className="font-normal cursor-pointer">
                                                        Oui / Valider
                                                    </Label>
                                                </div>
                                            ) : (
                                                <Input
                                                    id={`q-${q.id}`}
                                                    type={q.type}
                                                    value={formData.answers[q.id] || ''}
                                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                    required={q.required}
                                                    placeholder="Votre réponse..."
                                                    className="focus-visible:ring-offset-0 focus-visible:ring-1 theme-ring"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm flex items-center gap-2 dark:bg-red-500/15 dark:text-red-300">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full theme-btn text-white transition-opacity text-base py-6"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Envoi en cours...
                                    </>
                                ) : (
                                    'Envoyer ma demande'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main >
    );
}
