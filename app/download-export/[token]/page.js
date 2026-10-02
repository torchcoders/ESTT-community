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
            const { jsPDF }              = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');

            const doc   = new jsPDF();
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();

            // ── Header ────────────────────────────────────────────────────
            doc.setFillColor(37, 99, 235);
            doc.rect(0, 0, pageW, 30, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(17);
            doc.setFont('helvetica', 'bold');
            doc.text('ESTT Community — Export de données personnelles', pageW / 2, 13, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            const genDate = new Date().toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
            doc.text(`Généré le ${genDate}`, pageW / 2, 23, { align: 'center' });

            let y = 40;

            // ── Profile photo ─────────────────────────────────────────────
            if (profile.photoUrl) {
                try {
                    const img = new window.Image();
                    img.crossOrigin = 'Anonymous';
                    await new Promise((resolve, reject) => {
                        img.onload  = resolve;
                        img.onerror = reject;
                        img.src     = profile.photoUrl;
                        setTimeout(reject, 5000); // 5s timeout
                    });
                    doc.addImage(img, 'JPEG', pageW - 47, y, 32, 32);
                } catch { /* skip on error */ }
            }

            // ── Section helper ────────────────────────────────────────────
            const sectionTitle = (title, yPos) => {
                if (yPos > 245) { doc.addPage(); yPos = 20; }
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(37, 99, 235);
                doc.text(title, 14, yPos);
                doc.setDrawColor(37, 99, 235);
                doc.setLineWidth(0.5);
                doc.line(14, yPos + 2, pageW - 14, yPos + 2);
                doc.setTextColor(15, 23, 42);
                return yPos + 8;
            };

            // ── Informations personnelles ─────────────────────────────────
            y = sectionTitle('Informations personnelles', y);
            autoTable(doc, {
                startY: y,
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 4 },
                headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 58, fillColor: [248, 250, 252] } },
                body: [
                    ['Prénom',         profile.firstName  || '—'],
                    ['Nom',            profile.lastName   || '—'],
                    ['Email',          profile.email      || '—'],
                    ['Filière',        (profile.filiere || '—').toUpperCase()],
                    ['Promotion',      profile.startYear  || '—'],
                    ['Rôle',           profile.role       || 'Étudiant'],
                    ['Email vérifié',  profile.verifiedEmail ? '✓ Oui' : '✗ Non'],
                    ['Stars reçues',   String(profile.stars || 0)],
                    ['Inscrit le',     profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('fr-FR') : '—'],
                    ['Abonnement',     profile.subscription?.expiresAt > Date.now()
                        ? `Actif — ${profile.subscription.type || ''}`
                        : 'Aucun'],
                ],
            });
            y = doc.lastAutoTable.finalY + 12;

            // ── Statistiques ──────────────────────────────────────────────
            if (profile.stats) {
                y = sectionTitle('Statistiques', y);
                autoTable(doc, {
                    startY: y,
                    theme: 'grid',
                    styles: { fontSize: 10, cellPadding: 4 },
                    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 58, fillColor: [248, 250, 252] } },
                    body: [
                        ['Signalements vérifiés', String(profile.stats.verifiedReports   || 0)],
                        ['Bugs résolus',          String(profile.stats.reportedBugsFixed || 0)],
                    ],
                });
                y = doc.lastAutoTable.finalY + 12;
            }

            // ── Contributions ─────────────────────────────────────────────
            if (y > 240) { doc.addPage(); y = 20; }
            y = sectionTitle(`Contributions (${contributions.length})`, y);
            if (contributions.length > 0) {
                autoTable(doc, {
                    startY: y,
                    theme: 'striped',
                    styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
                    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                    head: [['Titre', 'Module', 'Date']],
                    body: contributions.map(c => [
                        c.title  || '—',
                        c.module || '—',
                        c.timestamp ? new Date(c.timestamp).toLocaleDateString('fr-FR') : '—',
                    ]),
                    columnStyles: { 0: { cellWidth: 90 } },
                });
                y = doc.lastAutoTable.finalY + 12;
            } else {
                doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(148, 163, 184);
                doc.text('Aucune contribution enregistrée.', 16, y + 4);
                y += 14;
            }

            // ── Ressources enregistrées ───────────────────────────────────
            if (y > 240) { doc.addPage(); y = 20; }
            y = sectionTitle(`Ressources enregistrées (${favorites.length})`, y);
            if (favorites.length > 0) {
                autoTable(doc, {
                    startY: y,
                    theme: 'striped',
                    styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
                    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                    head: [['Titre', 'Type', 'Enregistrée le']],
                    body: favorites.map(f => [
                        f.title || '—',
                        [f.type, f.docType].filter(Boolean).join(' · ') || '—',
                        f.createdAt ? new Date(f.createdAt).toLocaleDateString('fr-FR') : '—',
                    ]),
                    columnStyles: { 0: { cellWidth: 90 } },
                });
                y = doc.lastAutoTable.finalY + 12;
            } else {
                doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(148, 163, 184);
                doc.text('Aucune ressource enregistrée.', 16, y + 4);
                y += 14;
            }

            // ── Tickets ───────────────────────────────────────────────────
            if (y > 240) { doc.addPage(); y = 20; }
            y = sectionTitle(`Tickets d'événements (${tickets.length})`, y);
            if (tickets.length > 0) {
                autoTable(doc, {
                    startY: y,
                    theme: 'striped',
                    styles: { fontSize: 9, cellPadding: 3 },
                    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                    head: [['Événement', 'Club', 'Statut', 'Date']],
                    body: tickets.map(t => [
                        t.eventName || '—',
                        t.clubName  || '—',
                        t.status === 'valid' ? '✓ Validé' : '⏳ En attente',
                        t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR') : '—',
                    ]),
                });
            } else {
                doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(148, 163, 184);
                doc.text('Aucun ticket enregistré.', 16, y + 4);
            }

            // ── Page footers ──────────────────────────────────────────────
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(203, 213, 225);
                doc.text(
                    `ESTT Community · Données personnelles de ${profile.firstName || ''} ${profile.lastName || ''} · Page ${i}/${totalPages} · Généré le ${genDate}`,
                    pageW / 2, pageH - 7, { align: 'center' }
                );
            }

            // ── Step 4: Trigger download ──────────────────────────────────
            setStep('download');
            const safe = (username || uid).replace(/[^a-z0-9_-]/gi, '_');
            const pdfFilename = `export_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`;
            setFilename(pdfFilename);

            await new Promise(r => setTimeout(r, 400)); // brief pause for UX
            doc.save(pdfFilename);

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
                                        Retour à l'accueil
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
                                    <strong>Rappel sécurité :</strong> Ce lien ne peut être utilisé qu'une seule fois. 
                                    Si vous avez besoin d'un nouvel export, générez un nouveau lien depuis vos paramètres.
                                </div>
                                <div className="pt-2 space-y-2">
                                    <Link
                                        href="/"
                                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                                    >
                                        <Home className="w-4 h-4" />
                                        Retour à l'accueil
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
