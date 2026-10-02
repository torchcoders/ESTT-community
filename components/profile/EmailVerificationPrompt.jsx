'use client';

import { useEffect, useState } from 'react';
import { Loader2, MailCheck, ShieldCheck } from 'lucide-react';
import { useDialog } from '@/context/DialogContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function EmailVerificationPrompt({ isOpen, onOpenChange, user, profile }) {
    const { showError, showSuccess } = useDialog();
    const [code, setCode] = useState('');
    const [step, setStep] = useState('intro');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = setInterval(() => setCooldown((value) => value - 1), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    useEffect(() => {
        if (profile?.verifiedEmail) {
            onOpenChange(false);
        }
    }, [onOpenChange, profile?.verifiedEmail]);

    const sendCode = async () => {
        if (!profile?.email || isSubmitting || cooldown > 0) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send',
                    uid: user.uid,
                    email: profile.email,
                    firstName: profile.firstName,
                }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Erreur lors de l’envoi du code.');
            }

            setStep('code');
            setCooldown(60);
            showSuccess('Code de vérification envoyé à votre adresse email.');
        } catch (error) {
            showError(error.message || 'Impossible d’envoyer le code.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const verifyCode = async (event) => {
        event.preventDefault();
        if (code.length !== 6 || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'verify',
                    uid: user.uid,
                    email: profile.email,
                    code,
                }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Code de vérification incorrect.');
            }

            showSuccess('Votre adresse email est maintenant vérifiée.');
            onOpenChange(false);
        } catch (error) {
            showError(error.message || 'Impossible de vérifier le code.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-amber-500" />
                        <div>
                            <DialogTitle>Vérifiez votre adresse email</DialogTitle>
                            <DialogDescription className="mt-2">
                                Confirmez votre email académique pour obtenir votre badge vérifié. Vous pouvez fermer cette fenêtre et continuer à utiliser la plateforme.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {step === 'intro' ? (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Nous enverrons un code à <strong>{profile?.email}</strong>.
                        </p>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Plus tard
                            </Button>
                            <Button type="button" onClick={sendCode} disabled={isSubmitting || !profile?.email} className="w-full sm:w-auto">
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <MailCheck />}
                                Envoyer le code
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <form onSubmit={verifyCode} className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Saisissez le code à 6 chiffres reçu par email.
                        </p>
                        <Input
                            value={code}
                            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="000000"
                            maxLength={6}
                            disabled={isSubmitting}
                            autoFocus
                        />
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="ghost" onClick={sendCode} disabled={isSubmitting || cooldown > 0}>
                                {cooldown > 0 ? `Renvoyer (${cooldown}s)` : 'Renvoyer le code'}
                            </Button>
                            <Button type="submit" disabled={isSubmitting || code.length !== 6}>
                                {isSubmitting && <Loader2 className="animate-spin" />}
                                Vérifier
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
