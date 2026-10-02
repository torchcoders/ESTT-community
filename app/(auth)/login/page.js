'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, GraduationCap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';




export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signIn, signInWithGoogle } = useAuth();
    const { showSuccess } = useDialog();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const getRedirectPath = () => {
        const redirectPath = searchParams.get('redirect');
        return redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('//')
            ? redirectPath
            : '/';
    };


    const validateEmail = (email) => {
        return email.toLowerCase().endsWith('@etu.uae.ac.ma');
    };

    const checkAndApplyReward = async (currentUser) => {
        if (!currentUser) return false;
        try {
            const { db, ref, get, update } = await import('@/lib/firebase');
            const encodedEmail = currentUser.email.toLowerCase().replace(/\./g, ',');
            const claimSnap = await get(ref(db, `qrClaims/${encodedEmail}`));
            
            if (claimSnap.exists()) {
                const claim = claimSnap.val();
                if (claim.status === 'pending' && claim.reward) {
                    const rewardStr = claim.reward;
                    let days = 30;
                    if (rewardStr.includes('month')) {
                        days = (parseInt(rewardStr.split('_')[1]) || 1) * 30;
                    } else if (rewardStr.includes('day')) {
                        days = parseInt(rewardStr.split('_')[1]) || 30;
                    }
                    const expiresAt = Date.now() + (days * 24 * 60 * 60 * 1000);

                    await update(ref(db, `users/${currentUser.uid}`), {
                        subscription: {
                            type: rewardStr,
                            expiresAt: expiresAt
                        }
                    });

                    await update(ref(db, `qrClaims/${encodedEmail}`), {
                        status: 'applied',
                        appliedAt: Date.now(),
                        appliedToUid: currentUser.uid
                    });
                    
                    const formatReward = (r) => {
                        if (r.includes('month')) return `ESTTPlus+ (${r.split('_')[1].replace('month', ' Mois')})`;
                        if (r.includes('day')) return `ESTTPlus+ (${r.split('_')[1].replace('day', ' Jours')})`;
                        return 'ESTTPlus+';
                    };

                    showSuccess(`Votre récompense réservée ${formatReward(rewardStr)} a été appliquée à votre compte !`, { title: 'Récompense Activée !' });
                    return true;
                }
            }
        } catch (err) {
            console.error("Failed to apply QR reward on login:", err);
        }
        return false;
    };

    const handleGoogleSignIn = async () => {
        setMessage('');
        setGoogleLoading(true);

        try {
            await signInWithGoogle();
            const { auth } = await import('@/lib/firebase');
            setMessage('Connexion réussie avec Google.');
            const hasReward = await checkAndApplyReward(auth.currentUser);
            setTimeout(() => router.replace(getRedirectPath()), hasReward ? 3500 : 1000);
        } catch (error) {
            console.error(error);
            setMessage(error.message || 'Erreur lors de la connexion avec Google.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setMessage('Veuillez saisir votre adresse email pour réinitialiser votre mot de passe.');
            return;
        }
        if (!validateEmail(email)) {
            setMessage('Veuillez utiliser votre adresse académique @etu.uae.ac.ma.');
            return;
        }

        setLoading(true);
        try {
            const { sendPasswordResetEmail } = await import('firebase/auth');
            const { auth } = await import('@/lib/firebase');
            await sendPasswordResetEmail(auth, email);
            setMessage('Un email de réinitialisation a été envoyé à votre adresse académique.');
        } catch (error) {
            console.error(error);
            setMessage('Erreur lors de l\'envoi de l\'email de réinitialisation.');
        } finally {
            setLoading(false);
        }
    };

    const isSuccess = message.includes('réussie') || message.includes('envoyé') || message.includes('Google');
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!acceptedTerms) {
            setMessage('Vous devez accepter les conditions d\'utilisation et la politique de confidentialité.');
            return;
        }

        setMessage('');

        setLoading(true); // Start loading immediately for UX

        let isAllowed = false;

        // 1. Check if academic email
        if (validateEmail(email)) {
            isAllowed = true;
        }
        // 2. Check if Gmail and in exceptions
        else if (email.toLowerCase().endsWith('@gmail.com')) {
            try {
                const { db, ref, get } = await import('@/lib/firebase');
                const snapshot = await get(ref(db, 'emailExceptions'));

                if (snapshot.exists()) {
                    const exceptions = snapshot.val();
                    // Check if email exists in values (array or object)
                    const allowedEmails = Object.values(exceptions);
                    if (allowedEmails.includes(email.trim())) {
                        isAllowed = true;
                    }
                }
            } catch (err) {
                console.error("Error checking email exceptions:", err);
                // Fail safe: deny if error
            }
        }

        if (!isAllowed) {
            setMessage('Veuillez utiliser votre adresse académique @etu.uae.ac.ma.');
            setLoading(false);
            return;
        }

        try {
            await signIn(email, password);
            const { auth } = await import('@/lib/firebase');
            setMessage('Connexion réussie.');
            const hasReward = await checkAndApplyReward(auth.currentUser);
            setTimeout(() => router.replace(getRedirectPath()), hasReward ? 3500 : 1000);
        } catch (error) {
            console.error(error);
            setMessage('Identifiants invalides ou erreur de connexion.');
            setLoading(false);
        }
    };

    return (
        <main className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-12">
            <Card className="w-full max-w-md shadow-xl border-muted-foreground/10">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                            <GraduationCap className="w-8 h-8" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Se connecter</CardTitle>
                    <CardDescription>
                        Accédez à votre espace étudiant
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {message && (
                            <Alert variant={isSuccess ? "default" : "destructive"} className={isSuccess ? "border-green-500 bg-green-50 text-green-700" : ""}>
                                {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">Adresse email académique</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="prenom.nom@etu.uae.ac.ma"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Mot de passe</Label>
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-xs text-primary hover:underline font-medium"
                                >
                                    Mot de passe oublié ?
                                </button>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-11"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Pas forcément le mot de passe de l’e-mail académique
                            </p>
                        </div>

                        <div className="flex items-center space-x-2 py-2">
                            <Checkbox 
                                id="terms" 
                                checked={acceptedTerms} 
                                onCheckedChange={setAcceptedTerms} 
                            />
                            <Label 
                                htmlFor="terms" 
                                className="text-xs text-muted-foreground font-normal leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                J'accepte les <Link href="/terms" target="_blank" className="text-primary hover:underline">Conditions d'utilisation</Link> et la <Link href="/privacy" target="_blank" className="text-primary hover:underline">Politique de confidentialité</Link>.
                            </Label>
                        </div>

                        <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading || googleLoading}>

                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connexion en cours...
                                </>
                            ) : (
                                'Se connecter'
                            )}
                        </Button>
                    </form>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">Ou continuer avec</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Button
                            variant="outline"
                            type="button"
                            className="w-full h-11 border-border hover:bg-muted gap-2 font-medium"
                            onClick={handleGoogleSignIn}
                            disabled={loading || googleLoading}
                        >
                            {googleLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <svg className="h-4 w-4" viewBox="0 0 24 24">
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                            )}
                            Google
                        </Button>
                        <p className="text-[11px] text-center text-muted-foreground bg-muted/30 p-2 rounded-lg border border-muted-foreground/10 italic">
                            Note : Seuls les e-mails académiques (@etu.uae.ac.ma) sont autorisés pour l'authentification Google.
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 pt-0">
                    <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                                Nouveau ici ?
                            </span>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full h-11" asChild>
                        <Link href="/signup">Créer un compte</Link>
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
}
