'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { db, ref, update } from '@/lib/firebase';
import {
    PRIVACY_POLICY_VERSION,
    PRIVACY_POLICY_STORAGE_KEY,
    PRIVACY_POLICY_LAST_UPDATED
} from '@/lib/privacy-constants';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DotLottiePlayer } from '@dotlottie/react-player';
import '@dotlottie/react-player/dist/index.css';
import { CheckCircle2, ExternalLink } from 'lucide-react';

export default function PrivacyUpdateDialog() {
    const { user, profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [animationError, setAnimationError] = useState(false);

    useEffect(() => {
        // Run only in browser
        if (typeof window === 'undefined') return;

        try {
            const localVersion = window.localStorage.getItem(PRIVACY_POLICY_STORAGE_KEY);
            const userProfileVersion = profile?.privacyAcceptedVersion;

            // If already acknowledged the current version, do not show
            if (localVersion === PRIVACY_POLICY_VERSION || userProfileVersion === PRIVACY_POLICY_VERSION) {
                setIsOpen(false);
                return;
            }

            // Otherwise, show the one-time update dialog
            setIsOpen(true);
        } catch (e) {
            console.error('[PrivacyDialog] Error reading localStorage:', e);
        }
    }, [profile?.privacyAcceptedVersion]);

    const handleAcknowledge = async () => {
        setIsSaving(true);
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(PRIVACY_POLICY_STORAGE_KEY, PRIVACY_POLICY_VERSION);
            }

            // If authenticated, also record in user profile
            if (user && !user.isAnonymous && db) {
                await update(ref(db, `users/${user.uid}`), {
                    privacyAcceptedVersion: PRIVACY_POLICY_VERSION,
                    privacyAcceptedAt: Date.now()
                });
            }
        } catch (error) {
            console.error('[PrivacyDialog] Failed to save acknowledgment:', error);
        } finally {
            setIsSaving(false);
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleAcknowledge(); }}>
            <DialogContent className="sm:max-w-[440px] border-none shadow-xl rounded-2xl p-6">
                <DialogHeader className="space-y-4">
                    {/* Lottie animation or icon fallback */}
                    <div className="flex justify-center">
                        {!animationError ? (
                            <DotLottiePlayer
                                src="/animations/info.lottie"
                                autoplay
                                loop={false}
                                style={{ width: 72, height: 72 }}
                                onError={() => setAnimationError(true)}
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-sky-500" strokeWidth={2} />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 text-center">
                        <DialogTitle className="text-lg font-bold leading-tight text-center">
                            Politique de confidentialité mise à jour
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500 leading-relaxed text-center">
                            Mise à jour du {PRIVACY_POLICY_LAST_UPDATED}
                        </DialogDescription>
                    </div>

                    {/* Detail content as children inside header */}
                    <div className="space-y-3 text-left">
                        <p className="text-xs text-muted-foreground leading-relaxed text-center">
                            Afin de continuer à améliorer votre expérience sur{' '}
                            <strong className="text-foreground">ESTT Community</strong>, nous avons mis à jour
                            notre politique de confidentialité en toute transparence.
                        </p>

                        <div className="bg-muted/60 border border-border/80 rounded-xl p-3.5 space-y-2.5 text-xs">
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <strong className="text-foreground">Mesure du temps d&apos;activité :</strong>{' '}
                                    <span className="text-muted-foreground">
                                        Nous mesurons le temps passé et les pages consultées,{' '}
                                        <em>uniquement pour les comptes connectés</em>.
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <strong className="text-foreground">Expérience personnalisée :</strong>{' '}
                                    <span className="text-muted-foreground">
                                        Ces données nous permettent d&apos;optimiser les fonctionnalités les plus appréciées.
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <strong className="text-foreground">Confidentialité garantie :</strong>{' '}
                                    <span className="text-muted-foreground">
                                        Vos données ne sont jamais vendues ni partagées à des fins publicitaires.
                                    </span>
                                </div>
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground text-center">
                            Consultez notre{' '}
                            <Link
                                href="/privacy"
                                target="_blank"
                                className="text-primary font-semibold hover:underline inline-flex items-center gap-0.5"
                            >
                                Politique de confidentialité complète{' '}
                                <ExternalLink className="w-3 h-3 inline" />
                            </Link>.
                        </p>
                    </div>
                </DialogHeader>

                <DialogFooter className="mt-4 flex sm:justify-end gap-2">
                    <Button
                        onClick={handleAcknowledge}
                        disabled={isSaving}
                        className="w-full rounded-lg px-5 h-10 text-sm font-semibold transition-all"
                    >
                        {isSaving ? 'Enregistrement...' : "J'ai compris et je continue"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
