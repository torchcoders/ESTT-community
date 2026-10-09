'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db, ref, get, push, set, update, increment } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, CheckCircle2, Calendar, MapPin, Users, Ticket, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getClubBySlug, getClubPath } from '@/lib/clubUtils';

export default function EventRegistrationPage() {
    const params = useParams();
    const { user, profile } = useAuth();
    const { clubId, eventId } = params;

    const [club, setClub] = useState(null);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({});
    const [generatedTicketId, setGeneratedTicketId] = useState('');
    const [existingTicket, setExistingTicket] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!db || !clubId || !eventId) return;

            try {
                // Fetch Club
                const clubData = await getClubBySlug(clubId);
                if (!clubData) {
                    setError("Club introuvable");
                    return;
                }
                setClub(clubData);

                // Fetch Event
                const eventSnap = await get(ref(db, `clubs/${clubData.id}/events/${eventId}`));
                if (eventSnap.exists()) {
                    const eventData = eventSnap.val();
                    setEvent(eventData);

                    // Check if user is already registered
                    if (user?.uid) {
                        const ticketsRef = ref(db, 'tickets');
                        const ticketsSnap = await get(ticketsRef);
                        
                        if (ticketsSnap.exists()) {
                            const allTickets = ticketsSnap.val();
                            const userTicketForEvent = Object.entries(allTickets).find(
                                ([, ticket]) => ticket.userId === user.uid && ticket.eventId === eventId
                            );
                            
                            if (userTicketForEvent) {
                                setExistingTicket({ id: userTicketForEvent[0], ...userTicketForEvent[1] });
                            }
                        }
                    }

                    // Initialize form data with user info if available
                    const initialData = {};
                    eventData.fields.forEach(f => {
                        if (f.id === 'name') initialData[f.id] = profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : (user?.displayName || '');
                        if (f.id === 'email') initialData[f.id] = user?.email || '';
                    });
                    setFormData(initialData);
                } else {
                    setError("Événement introuvable");
                }
            } catch (err) {
                console.error(err);
                setError("Erreur lors du chargement");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [clubId, eventId, user, profile]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        setSubmitting(true);
        setError('');

        try {
            // 1. Check Capacity
            if (event.maxCapacity > 0 && event.registrationCount >= event.maxCapacity) {
                throw new Error("L'événement est complet !");
            }

            // 2. Extract Name and Email
            const recipientEmail = formData['email'] || user?.email;
            const fullName = formData['name'] || user?.displayName || 'Participant';
            const [firstName, ...lastNameParts] = fullName.split(' ');
            const lastName = lastNameParts.join(' ');

            if (!recipientEmail) throw new Error("L'adresse email est requise");

            // 3. Create Ticket
            const ticketRef = push(ref(db, 'tickets'));
            const ticketId = ticketRef.key;

            const ticketData = {
                id: ticketId,
                eventId: eventId,
                eventName: event.title,
                clubId: clubId,
                clubName: club.name,
                userId: user?.uid || 'guest',
                userEmail: recipientEmail,
                firstName: firstName || 'Participant',
                lastName: lastName || '',
                status: event.price > 0 ? 'awaiting_payment' : 'pending',
                paid: false,
                price: event.price || 0,
                createdAt: Date.now(),
                formData: formData,
                eventDate: event.date,
                eventTime: event.time || '',
                eventLocation: event.location || ''
            };

            await set(ticketRef, ticketData);

            // 3.b. Store RSVP in eventAttendees for future features (history, recaps, manual reminders, etc.)
            try {
                if (user?.uid) {
                    const attendeeRef = ref(db, `eventAttendees/${eventId}/${user.uid}`);
                    await set(attendeeRef, {
                        status: 'going',
                        rsvpAt: Date.now(),
                        ticketId,
                        eventId,
                        clubId
                    });
                }
            } catch (attendeeErr) {
                console.error("Failed to record event attendee:", attendeeErr);
                // Do not block the registration flow if attendee logging fails
            }

            // 4. Handle Payment or Standard Registration
            if (event.price > 0) {
                // Redirect to LemonSqueezy Checkout
                try {
                    const response = await fetch('/api/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ticketId,
                            clubId,
                            eventId,
                            price: event.price,
                            eventName: event.title,
                            userEmail: recipientEmail
                        })
                    });

                    const data = await response.json();
                    if (data.url) {
                        window.location.href = data.url;
                        return; // Stop here, redirecting
                    } else {
                        throw new Error(data.error || 'Erreur lors de l’initialisation du paiement');
                    }
                } catch (payErr) {
                    console.error("Payment initialization failed:", payErr);
                    throw payErr;
                }
            }

            // 5. Update Registration Count (Only for free/manual events here, paid is done in webhook or after redirect)
            const eventRef = ref(db, `clubs/${club.id}/events/${eventId}`);
            await update(eventRef, {
                registrationCount: increment(1)
            });

            // 6. Send Confirmation Email (For free/pending events)
            try {
                const { ticketConfirmationEmail } = await import('@/lib/email-templates');
                const html = ticketConfirmationEmail(ticketData, event.title, club.name);

                await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: recipientEmail,
                        subject: `Confirmation d'inscription : ${event.title}`,
                        html: html
                    })
                });
            } catch (emailErr) {
                console.error("Email sending failed but registration succeeded:", emailErr);
            }

            setGeneratedTicketId(ticketId);
            setSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error(err);
            setError(err.message || "Une erreur est survenue lors de l'inscription.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-card">
                <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
            </div>
        );
    }

    const themeColor = club?.themeColor || '#0ea5e9';
    const isFull = event.maxCapacity > 0 && event.registrationCount >= event.maxCapacity;

    // If user is already registered, show their existing ticket
    if (existingTicket && !success) {
        return (
            <div className="min-h-screen bg-card flex items-center justify-center p-6 text-center">
                <div className="max-w-sm w-full space-y-10 animate-in fade-in zoom-in duration-500">
                    <div className="space-y-6">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto border border-border shadow-sm">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Déjà inscrit !</h1>
                            <p className="text-muted-foreground font-medium text-sm">
                                Vous êtes déjà enregistré pour <span className="text-foreground font-semibold">{event.title}</span>.
                            </p>
                        </div>
                    </div>

                    <div className="bg-muted/50 rounded-2xl p-6 border border-border flex items-center gap-4 text-left">
                        <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border shrink-0">
                            <Ticket className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-bold text-foreground leading-tight">Votre Ticket</p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">ID: {existingTicket.id}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button asChild className="w-full h-12 rounded-xl text-sm font-bold transition-all shadow-sm text-white" style={{ backgroundColor: themeColor }}>
                            <Link href={`/tickets/${existingTicket.id}`}>
                                Voir mon Ticket 🎉
                            </Link>
                        </Button>
                        <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground text-xs font-semibold rounded-xl">
                            <Link href={getClubPath(club)}>Retour</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-card flex items-center justify-center p-6 text-center">
                <div className="max-w-sm w-full space-y-10 animate-in fade-in zoom-in duration-500">
                    <div className="space-y-6">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto border border-border shadow-sm">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Inscription validée !</h1>
                            <p className="text-muted-foreground font-medium text-sm">
                                Votre place pour <span className="text-foreground font-semibold">{event.title}</span> est confirmée.
                            </p>
                        </div>
                    </div>

                    <div className="bg-muted/50 rounded-2xl p-6 border border-border flex items-center gap-4 text-left">
                        <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border shrink-0">
                            <Ticket className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-xs font-bold text-foreground leading-tight">Ticket QR disponible</p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">Un email de confirmation a été envoyé à {formData.email || user?.email}.</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button asChild className="w-full h-12 rounded-xl text-sm font-bold transition-all shadow-sm text-white" style={{ backgroundColor: themeColor }}>
                            <Link href={`/tickets/${generatedTicketId}`}>
                                Voir mon Ticket 🎉
                            </Link>
                        </Button>
                        <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground text-xs font-semibold rounded-xl">
                            <Link href={getClubPath(club)}>Fermer</Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-card font-sans selection:bg-muted">
            {/* Subtle Top Branding */}
            <div className="w-full h-1.5 sticky top-0 z-50 transition-all duration-300 opacity-80" style={{ backgroundColor: themeColor }} />

            <div className="container max-w-2xl mx-auto px-6 py-12">
                {/* Back Button */}
                <Button variant="ghost" asChild className="mb-12 text-muted-foreground hover:text-foreground transition-colors rounded-lg group -ml-2">
                    <Link href={getClubPath(club)} className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>Retour</span>
                    </Link>
                </Button>

                {event.imageUrl && (
                    <div className="w-full h-48 md:h-64 rounded-3xl overflow-hidden relative mb-12 border shadow-sm">
                        <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
                    </div>
                )}

                <div className="space-y-12">
                    {/* Simplified Header */}
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-muted border border-border shadow-sm">
                            {club?.logo ? (
                                <Image src={club.logo} alt={club.name} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-white" style={{ backgroundColor: themeColor }}>
                                    {club?.name?.charAt(0)}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                                {club?.name} présente
                            </p>
                            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                                {event.title}
                            </h1>
                        </div>
                    </div>

                    {/* Compact Event Details */}
                    <div className="bg-muted/50 rounded-2xl border border-border p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { icon: Calendar, label: 'Date', value: new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) },
                                { icon: Clock, label: 'Heure', value: event.time || 'TBD' },
                                { icon: MapPin, label: 'Lieu', value: event.location || 'Campus' },
                                { icon: Users, label: 'Statut', value: isFull ? 'Complet' : 'Ouvert' }
                            ].map((item, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <item.icon className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                                    </div>
                                    <p className="text-sm font-semibold text-foreground truncate">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Description (if exists) */}
                    {event.description && (
                        <div className="max-w-none border-l-2 border-border pl-6 py-1">
                            <p className="text-muted-foreground leading-relaxed text-sm">
                                {event.description}
                            </p>
                        </div>
                    )}

                    {/* Registration Form */}
                    <div className="space-y-8 pt-4">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold text-foreground">Inscription</h2>
                            <p className="text-sm text-muted-foreground font-medium">Réservez votre billet digital en quelques secondes.</p>
                        </div>

                        {error && (
                            <Alert variant="destructive" className="rounded-xl border-none bg-red-50 text-red-600 py-3 dark:bg-red-500/15 dark:text-red-300">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-sm font-semibold">{error}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {event.fields.map((field) => (
                                <div key={field.id} className="space-y-2.5">
                                    <Label className="text-xs font-bold text-muted-foreground ml-1">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </Label>

                                    {field.type === 'textarea' ? (
                                        <Textarea
                                            required={field.required}
                                            value={formData[field.id] || ''}
                                            onChange={e => setFormData(p => ({ ...p, [field.id]: e.target.value }))}
                                            className="min-h-[100px] rounded-xl border-border bg-card focus:ring-0 focus:border-foreground transition-all text-sm p-4 placeholder:text-muted-foreground"
                                            placeholder="..."
                                        />
                                    ) : field.type === 'select' ? (
                                        <Select
                                            onValueChange={v => setFormData(p => ({ ...p, [field.id]: v }))}
                                            value={formData[field.id] || ''}
                                            required={field.required}
                                        >
                                            <SelectTrigger className="h-12 rounded-xl border-border bg-card focus:ring-0 focus:border-foreground px-4 text-sm">
                                                <SelectValue placeholder="Sélectionner..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-border shadow-lg">
                                                {field.options?.split(',').map(opt => (
                                                    <SelectItem key={opt.trim()} value={opt.trim()} className="text-sm">{opt.trim()}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            type={field.type}
                                            required={field.required}
                                            value={formData[field.id] || ''}
                                            onChange={e => setFormData(p => ({ ...p, [field.id]: e.target.value }))}
                                            className="h-12 rounded-xl border-border bg-card focus:ring-0 focus:border-foreground transition-all px-4 text-sm placeholder:text-muted-foreground"
                                            placeholder={field.label}
                                        />
                                    )}
                                </div>
                            ))}

                            <div className="pt-8">
                                <Button
                                    type="submit"
                                    className="w-full h-12 text-lg font-semibold"
                                    disabled={submitting || (event?.maxCapacity > 0 && event?.registrationCount >= event?.maxCapacity)}
                                    style={{
                                        backgroundColor: themeColor
                                    }}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Traitement...
                                        </>
                                    ) : isFull ? (
                                        'Événement Complet'
                                    ) : (
                                        event.price > 0 ? (
                                            <div className="flex items-center gap-2">
                                                <Ticket className="w-5 h-5" />
                                                Payer {event.price} DH & S&apos;inscrire
                                            </div>
                                        ) : (
                                            "S'inscrire à l'événement"
                                        )
                                    )}
                                </Button>
                                <p className="text-[10px] text-muted-foreground font-medium text-center mt-4 tracking-tight uppercase">
                                    Ticket digital envoyé par email instantanément
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div >
        </div >
    );
}
