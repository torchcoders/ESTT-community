'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db, ref, get, push, set } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
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
import { generatePDF } from '@/lib/pdfUtils';
import { getClubBySlug, getClubPath } from '@/lib/clubUtils';

export default function CustomFormPage() {
    const params = useParams();
    const { user, profile } = useAuth();
    const { clubId, formId } = params;

    const [club, setClub] = useState(null);
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({});
    const [lastSubmission, setLastSubmission] = useState(null);
    const [exportingPDF, setExportingPDF] = useState(false);

    useEffect(() => {
        if (clubId && formId) {
            fetchData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId, formId]);

    useEffect(() => {
        // Auto-fill for logged in users
        if ((user || profile) && form && Object.keys(formData).length === 0) {
            const newFormData = { ...formData };
            form.fields.forEach(field => {
                if (field.type === 'email' && (user.email || profile?.email)) {
                    newFormData[field.id] = user.email || profile.email;
                }
                if (field.type === 'text' && field.label.toLowerCase().includes('nom') && (profile?.lastName || user.displayName)) {
                    newFormData[field.id] = profile?.lastName ? `${profile.firstName} ${profile.lastName}` : user.displayName;
                }
            });
            if (Object.keys(newFormData).length > 0) {
                setFormData(newFormData);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, profile, form]);

    const fetchData = async () => {
        try {
            // Fetch Club
            const clubData = await getClubBySlug(clubId);
            if (clubData) setClub(clubData);
            if (!clubData) {
                setError('Club introuvable');
                setLoading(false);
                return;
            }

            // Fetch Form
            const formRef = ref(db, `clubs/${clubData.id}/forms/${formId}`);
            const formSnap = await get(formRef);

            if (!formSnap.exists()) {
                setError('Formulaire introuvable');
                setLoading(false);
                return;
            }

            setForm(formSnap.val());
        } catch (error) {
            console.error(error);
            setError('Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (fieldId, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldId]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            // Basic validation
            for (const field of form.fields) {
                if (field.required && !formData[field.id]) {
                    throw new Error(`Le champ "${field.label}" est requis.`);
                }
            }

            // Create submission
            const submissionRef = push(ref(db, `clubs/${club.id}/formSubmissions/${formId}`));
            const submissionId = submissionRef.key;


            const submissionData = {
                id: submissionId,
                data: formData,
                userId: user ? user.uid : null,
                submittedAt: Date.now()
            };

            await set(submissionRef, submissionData);
            setLastSubmission(submissionData);

            // Send General Form Submission Receipt
            try {
                const { formSubmissionReceivedEmail } = await import('@/lib/email-templates');
                const html = formSubmissionReceivedEmail(form.title, club.name);

                // Use form field for email if available, otherwise user email
                const emailFieldId = form.fields.find(f => f.type === 'email')?.id;
                const recipientEmail = emailFieldId ? formData[emailFieldId] : (user?.email);

                if (recipientEmail) {
                    await fetch('/api/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: recipientEmail,
                            subject: `Réception : ${form.title}`,
                            html: html
                        })
                    });
                }
            } catch (err) {
                console.error("Failed to send form submission email:", err);
            }

            setSubmitted(true);
        } catch (error) {
            console.error(error);
            setError(error.message || 'Erreur lors de l\'envoi');
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

    if (!form || !club) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-xl text-muted-foreground">{error || 'Introuvable'}</p>
                <Button asChild>
                    <Link href={getClubPath(club)}>Retour au club</Link>
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
                        <CardTitle className="text-2xl text-green-700">Envoyé !</CardTitle>
                        <CardDescription>
                            Votre réponse a bien été enregistrée.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            Merci de votre participation. Un administrateur vérifiera votre soumission prochainement.
                        </p>

                        {lastSubmission && (
                            <Button
                                onClick={async () => {
                                    setExportingPDF(true);
                                    try {
                                        await generatePDF(lastSubmission, 'form', club, form);
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
                                Télécharger ma réponse (PDF)
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
                    <div className="w-20 h-20 mx-auto relative rounded-xl overflow-hidden bg-card shadow-md border border-border">
                        {club.logo ? (
                            <Image
                                src={club.logo}
                                alt={club.name}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center text-xl font-bold bg-muted"
                                style={{ color: club.themeColor || '#64748b' }}
                            >
                                {club.name?.charAt(0)}
                            </div>
                        )}
                    </div>
                </div>

                <Card className="border-t-4 shadow-lg" style={{ borderTopColor: club.themeColor || '#64748b' }}>
                    <CardHeader>
                        <CardTitle className="text-2xl">{form.title}</CardTitle>
                        {form.description && <CardDescription>{form.description}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {form.fields.map((field) => (
                                <div key={field.id} className="space-y-2">
                                    <Label htmlFor={`field-${field.id}`}>
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </Label>

                                    {field.type === 'textarea' ? (
                                        <Textarea
                                            id={`field-${field.id}`}
                                            required={field.required}
                                            value={formData[field.id] || ''}
                                            onChange={(e) => handleChange(field.id, e.target.value)}
                                            className="min-h-[100px] focus-visible:ring-offset-0 focus-visible:ring-1 theme-ring"
                                        />
                                    ) : field.type === 'select' ? (
                                        <Select
                                            onValueChange={(v) => handleChange(field.id, v)}
                                            value={formData[field.id] || ''}
                                            required={field.required}
                                        >
                                            <SelectTrigger className="focus-visible:ring-offset-0 focus-visible:ring-1 theme-ring">
                                                <SelectValue placeholder="Sélectionnez une option" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(field.options || '').split(',').map(opt => opt.trim()).filter(Boolean).map(opt => (
                                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : field.type === 'radio' ? (
                                        <div className="space-y-2 mt-2">
                                            {(field.options || '').split(',').map(opt => opt.trim()).filter(Boolean).map(opt => (
                                                <div key={opt} className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        id={`field-${field.id}-${opt}`}
                                                        name={`field-${field.id}`}
                                                        required={field.required}
                                                        checked={formData[field.id] === opt}
                                                        onChange={() => handleChange(field.id, opt)}
                                                        className="w-4 h-4 text-primary focus:ring-primary border-border"
                                                    />
                                                    <Label htmlFor={`field-${field.id}-${opt}`} className="font-normal cursor-pointer">
                                                        {opt}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    ) : field.type === 'checkbox' ? (
                                        <div className="space-y-2 mt-2">
                                            {(field.options || '').split(',').map(opt => opt.trim()).filter(Boolean).map(opt => (
                                                <div key={opt} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`field-${field.id}-${opt}`}
                                                        checked={(formData[field.id] || '').split(', ').includes(opt)}
                                                        onCheckedChange={(checked) => {
                                                            const currentValues = formData[field.id] ? formData[field.id].split(', ') : [];
                                                            let newValues;
                                                            if (checked) {
                                                                newValues = [...currentValues, opt];
                                                            } else {
                                                                newValues = currentValues.filter(v => v !== opt);
                                                            }
                                                            handleChange(field.id, newValues.join(', '));
                                                        }}
                                                    />
                                                    <Label htmlFor={`field-${field.id}-${opt}`} className="font-normal cursor-pointer">
                                                        {opt}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    ) : field.type === 'boolean' ? (
                                        <div className="flex items-center space-x-2 mt-2">
                                            <Checkbox
                                                id={`field-${field.id}`}
                                                checked={!!formData[field.id]}
                                                onCheckedChange={(checked) => handleChange(field.id, checked)}
                                                required={field.required}
                                            />
                                            <Label htmlFor={`field-${field.id}`} className="font-normal cursor-pointer">
                                                Oui / Valider
                                            </Label>
                                        </div>
                                    ) : (
                                        <Input
                                            id={`field-${field.id}`}
                                            type={field.type}
                                            required={field.required}
                                            value={formData[field.id] || ''}
                                            onChange={(e) => handleChange(field.id, e.target.value)}
                                            className="focus-visible:ring-offset-0 focus-visible:ring-1 theme-ring"
                                        />
                                    )}
                                </div>
                            ))}

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm flex items-center gap-2 dark:bg-red-500/15 dark:text-red-300">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full theme-btn text-white transition-opacity text-base py-6 mt-4"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Envoi en cours...
                                    </>
                                ) : (
                                    'Envoyer'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
