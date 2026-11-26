'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    Loader2, ShieldCheck, Download, XCircle, Clock,
    FileText, CheckCircle2, AlertTriangle, Home,
} from 'lucide-react';

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
    { id: 'verify',      label: 'Vérification du lien sécurisé…'     },
    { id: 'fetch',       label: 'Chargement de vos données…'          },
    { id: 'generate',    label: 'Génération du PDF…'                  },
    { id: 'download',    label: 'Téléchargement automatique…'         },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ steps, currentStep, done, error }) {
    return (
        <div className="flex flex-col gap-3 w-full max-w-sm">
            {steps.map((step, i) => {
                const stepIdx   = steps.findIndex(s => s.id === currentStep);
                const isPast    = done || i < stepIdx;
                const isCurrent = !done && !error && i === stepIdx;
                const isFuture  = !done && !error && i > stepIdx;

                return (
                    <div key={step.id} className="flex items-center gap-3">
                        <div className={`
                            w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
                            ${isPast    ? 'bg-emerald-500 text-white'                   : ''}
                            ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100' : ''}
                            ${isFuture  ? 'bg-muted text-muted-foreground'            : ''}
                            ${error     ? 'bg-red-100   text-red-400'                   : ''}
                        `}>
                            {isPast
                                ? <CheckCircle2 className="w-4 h-4" />
                                : isCurrent
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <span className="text-xs font-bold">{i + 1}</span>
                            }
                        </div>
                        <span className={`text-sm transition-colors duration-300
                            ${isPast    ? 'text-emerald-600 font-medium line-through decoration-emerald-300' : ''}
                            ${isCurrent ? 'text-blue-700 font-semibold'                                      : ''}
                            ${isFuture  ? 'text-muted-foreground'                      : ''}
                        `}>
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DownloadExportPage() {
    const { token } = useParams();

    const [step,     setStep]     = useState('verify');   // current step id
    const [done,     setDone]     = useState(false);
    const [error,    setError]    = useState(null);       // string | null
    const [filename, setFilename] = useState('');

    const hasRun = useRef(false); // prevent double-execution in React strict mode

    useEffect(() => {
        if (!token || hasRun.current) return;
        hasRun.current = true;
        runExport(token);
    }, [token]);

    async function runExport(token) {
        try {
            // ── Step 1: Verify token (server-side, marks used) ────────────
            setStep('verify');
            const verifyRes = await fetch('/api/export-data/verify', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ token }),
            });
            const verifyData = await verifyRes.json();

            if (!verifyData.valid) {
                throw new Error(verifyData.reason || 'Lien invalide.');
            }

            const {
                uid,
                username,
                profile,
                favorites,
                tickets,
            } = verifyData;

            // ── Step 2: Use the server-side export snapshot ───────────────
            setStep('fetch');
            const contributions = profile.contributions
                ? Object.values(profile.contributions)
                : [];

            // ── Step 3: Generate PDF ──────────────────────────────────────
            setStep('generate');
            const safe = (username || uid).replace(/[^a-z0-9_-]/gi, '_');
            const pdfFilename = `export_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`;
            const { generatePersonalDataExportPDF } = await import('@/lib/generatePersonalDataExportPDF');
            await generatePersonalDataExportPDF({
                profile, contributions, favorites, tickets, filename: pdfFilename,
            });
            setStep('download');
            setFilename(pdfFilename);

            setDone(true);
            window.opener?.postMessage({ type: 'estt-export-complete' }, window.location.origin);

        } catch (err) {
            console.error('[DownloadExport]', err);
            setError(err.message || 'Une erreur inattendue est survenue.');
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-muted via-blue-50/30 to-background flex items-center justify-center p-6 dark:via-blue-950/40">
            <div className="w-full max-w-md">

                {/* Card */}
                <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">

                    {/* Top accent bar */}
                    <div className={`h-1.5 w-full transition-all duration-700 ${
                        error ? 'bg-red-400' : done ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse'
                    }`} />

                    <div className="p-8">

                        {/* ── Error state ─────────────────────────────── */}
                        {error && (
                            <div className="text-center space-y-5">
                                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                                    {error.includes('expiré') ? (
                                        <Clock className="w-8 h-8 text-red-500" />
                                    ) : error.includes('utilisé') ? (
                                        <ShieldCheck className="w-8 h-8 text-red-500" />
                                    ) : (
                                        <XCircle className="w-8 h-8 text-red-500" />
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-foreground mb-2">
                                        {error.includes('expiré') ? 'Lien expiré'
                                            : error.includes('utilisé') ? 'Lien déjà utilisé'
                                            : 'Lien invalide'}
                                    </h1>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{error}</p>
                                </div>
                                <div className="pt-2 space-y-2">
                                    <Link
                                        href="/profile"
                                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                                    >
                                        Générer un nouveau lien depuis mes paramètres
                                    </Link>
                                    <Link
                                        href="/"
                                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
                                    >
                                        <Home className="w-4 h-4" />
                                        Retour à l&apos;accueil
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* ── Success state ───────────────────────────── */}
                        {done && !error && (
                            <div className="text-center space-y-5">
                                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-foreground mb-2">Téléchargement réussi !</h1>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Votre fichier <strong className="text-foreground">{filename}</strong> a été 
                                        téléchargé automatiquement. Vérifiez votre dossier de téléchargements.
                                    </p>
                                </div>
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 text-left leading-relaxed dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
                                    <AlertTriangle className="w-4 h-4 inline mr-1.5 shrink-0" />
                                    <strong>Rappel sécurité :</strong> Ce lien ne peut être utilisé qu&apos;une seule fois.
                                    Si vous avez besoin d&apos;un nouvel export, générez un nouveau lien depuis vos paramètres.
                                </div>
                                <div className="pt-2 space-y-2">
                                    <Link
                                        href="/"
                                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                                    >
                                        <Home className="w-4 h-4" />
                                        Retour à l&apos;accueil
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* ── Loading state ───────────────────────────── */}
                        {!done && !error && (
                            <div className="text-center space-y-7">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto dark:bg-blue-500/15">
                                        <FileText className="w-9 h-9 text-blue-600" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 mx-auto" style={{ left: '50%', transform: 'translate(16px, 0)' }}>
                                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                                            <Download className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h1 className="text-xl font-bold text-foreground mb-1">
                                        Préparation de votre export
                                    </h1>
                                    <p className="text-xs text-muted-foreground">
                                        Ne fermez pas cette page
                                    </p>
                                </div>

                                <StepIndicator
                                    steps={STEPS}
                                    currentStep={step}
                                    done={done}
                                    error={!!error}
                                />

                                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700"
                                        style={{
                                            width: `${
                                                step === 'verify'   ? 20
                                              : step === 'fetch'    ? 45
                                              : step === 'generate' ? 75
                                              : 95
                                            }%`
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground mt-5">
                    <Link href="https://estt.ma" className="hover:text-blue-600 transition-colors font-semibold">
                        ESTT<span className="text-blue-600">.Community</span>
                    </Link>
                    {' '}· Export sécurisé de données personnelles
                </p>
            </div>
        </div>
    );
}
