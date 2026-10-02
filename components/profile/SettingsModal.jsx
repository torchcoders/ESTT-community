'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
    // Tab icons
    UserCog, Palette, Bell,
    // Account section icons
    User, Mail, Camera, Globe, Lock, CalendarDays, LogOut,
    // Preferences section icons
    Moon, Sun, Monitor,
    // Notifications section icons
    BellRing, Download, Trash2,
    // UI icons
    X, ChevronRight, Check, Loader2, Upload,
} from 'lucide-react';
import { db, ref, update, get, auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { uploadToImgBB } from '@/lib/uploadUtils';
import { useDialog } from '@/context/DialogContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'account',       label: 'Compte & Sécurité',        icon: UserCog  },
    { id: 'appearance',    label: 'Préférences & Apparence',  icon: Palette  },
    { id: 'notifications', label: 'Notifications & Vie Privée', icon: Bell   },
];

// ─── Reusable sub-components ──────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, description }) {
    return (
        <div className="flex items-start gap-3 mb-5">
            <div className="p-2 bg-primary/8 rounded-lg shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
        </div>
    );
}

function FieldRow({ label, children, htmlFor }) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label htmlFor={htmlFor} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {label}
                </label>
            )}
            {children}
        </div>
    );
}

function Divider() {
    return <div className="border-t border-border my-4" />;
}

// ─── Tab Panels ───────────────────────────────────────────────────────────────

function AccountTab({ profile, resolvedUid, onClose }) {
    const { showSuccess, showError, showWarning, showConfirm } = useDialog();
    const { signOut } = useAuth();

    const [formData, setFormData] = useState({
        firstName: profile?.firstName || '',
        lastName:  profile?.lastName  || '',
        email:     profile?.email     || '',
        photoUrl:  profile?.photoUrl  || '',
    });
    const [saving, setSaving]             = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSent, setPasswordSent] = useState(false);

    const avatarInputRef = useRef(null);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showWarning("L'image est trop volumineuse (max 5 Mo).");
            return;
        }
        setAvatarUploading(true);
        try {
            const url = await uploadToImgBB(file);
            await update(ref(db, `users/${resolvedUid}`), { photoUrl: url, updatedAt: Date.now() });
            setFormData(p => ({ ...p, photoUrl: url }));
            showSuccess("Photo de profil mise à jour !");
        } catch {
            showError("Erreur lors du téléchargement de la photo.");
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleSave = async () => {
        if (!resolvedUid) return;
        setSaving(true);
        try {
            await update(ref(db, `users/${resolvedUid}`), {
                firstName: formData.firstName.trim(),
                lastName:  formData.lastName.trim(),
                updatedAt: Date.now(),
            });
            showSuccess("Profil mis à jour avec succès !");
        } catch {
            showError("Erreur lors de la mise à jour du profil.");
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!profile?.email) return;
        setPasswordLoading(true);
        try {
            await sendPasswordResetEmail(auth, profile.email);
            setPasswordSent(true);
            showSuccess(`Un lien de réinitialisation a été envoyé à ${profile.email}`);
        } catch (err) {
            showError("Impossible d'envoyer l'email de réinitialisation.");
            console.error(err);
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleLogout = async () => {
        const confirmed = await showConfirm(
            "Êtes-vous sûr de vouloir vous déconnecter ?",
            { type: 'danger', title: 'Déconnexion', confirmLabel: 'Déconnexion' }
        );
        if (!confirmed) return;
        onClose();
        try { await signOut(); } catch (e) { console.error(e); }
    };

    const signupDate = profile?.createdAt
        ? new Date(profile.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'Inconnue';

    return (
        <div className="space-y-6">

            {/* ── Profile Management ───────────────────────────────── */}
            <section>
                <SectionHeader
                    icon={User}
                    title="Gestion du profil"
                    description="Modifiez vos informations personnelles visibles publiquement."
                />

                {/* Avatar picker */}
                <FieldRow label="Photo de profil">
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                        <div className="relative group shrink-0">
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
                                {formData.photoUrl ? (
                                    <Image
                                        src={formData.photoUrl}
                                        alt="Avatar"
                                        width={64}
                                        height={64}
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <User className="w-7 h-7 text-muted-foreground" />
                                )}
                            </div>
                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={avatarUploading}
                                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            >
                                {avatarUploading
                                    ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                                    : <Camera className="w-5 h-5 text-white" />
                                }
                            </button>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarUpload}
                            />
                        </div>
                        <div className="flex-1 w-full sm:w-auto">
                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={avatarUploading}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                {avatarUploading ? 'Téléchargement...' : 'Changer la photo'}
                            </button>
                            <p className="text-[10px] text-muted-foreground mt-1.5">JPG, PNG ou GIF · Max 5 Mo</p>
                        </div>
                    </div>
                </FieldRow>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <FieldRow label="Prénom" htmlFor="s-firstName">
                        <input
                            id="s-firstName"
                            value={formData.firstName}
                            onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))}
                            className="w-full px-3 py-2.5 sm:py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-card"
                            placeholder="Prénom"
                        />
                    </FieldRow>
                    <FieldRow label="Nom" htmlFor="s-lastName">
                        <input
                            id="s-lastName"
                            value={formData.lastName}
                            onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))}
                            className="w-full px-3 py-2.5 sm:py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-card"
                            placeholder="Nom de famille"
                        />
                    </FieldRow>
                </div>

                <div className="mt-3">
                    <FieldRow label="Email" htmlFor="s-email">
                        <input
                            id="s-email"
                            value={formData.email}
                            readOnly
                            className="w-full px-3 py-2.5 sm:py-2 text-sm rounded-lg border border-border bg-muted text-muted-foreground cursor-not-allowed"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">L'adresse email ne peut pas être modifiée ici.</p>
                    </FieldRow>
                </div>

                {/* Language — disabled */}
                <div className="mt-4 p-3 sm:p-4 rounded-xl border border-border bg-muted/70 opacity-70">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Langue de l'interface</p>
                                <p className="text-xs text-muted-foreground">Français</p>
                            </div>
                        </div>
                        <span className="text-xs text-muted-foreground bg-card border border-border px-2 py-1 rounded-md font-medium w-fit">FR</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed border-t border-border pt-2">
                        Pour l'instant, seule la langue française est disponible.
                    </p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
            </section>

            <Divider />

            {/* ── Authentication ────────────────────────────────────── */}
            <section>
                <SectionHeader
                    icon={Lock}
                    title="Authentification"
                    description="Gérez votre mot de passe et la sécurité de votre compte."
                />

                {/* Password reset */}
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg shrink-0 dark:bg-blue-500/15">
                            <Lock className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">Modifier le mot de passe</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Un lien de réinitialisation sera envoyé à votre adresse email.
                            </p>
                            {passwordSent && (
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                                    <Check className="w-3.5 h-3.5" />
                                    Email envoyé à {profile?.email}
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handlePasswordReset}
                        disabled={passwordLoading || passwordSent}
                        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-lg border border-blue-200 text-blue-600 text-sm font-semibold hover:bg-blue-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed dark:border-blue-500/40 dark:text-blue-300 dark:hover:bg-blue-500/10"
                    >
                        {passwordLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                        {passwordLoading ? 'Envoi en cours...' : passwordSent ? 'Lien envoyé ✓' : 'Envoyer le lien de réinitialisation'}
                    </button>
                </div>

            </section>

            <Divider />

            {/* ── Active Session ────────────────────────────────────── */}
            <section>
                <SectionHeader
                    icon={CalendarDays}
                    title="Session active"
                    description="Informations sur votre compte et options de déconnexion."
                />

                <div className="p-4 rounded-xl border border-border bg-card flex items-center gap-3 mb-3">
                    <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Inscrit le</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{signupDate}</p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-start gap-2 px-4 py-3 sm:py-2.5 rounded-xl border border-red-100 text-red-500 text-sm font-semibold hover:bg-red-50 active:scale-[0.98] transition-all dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                    <LogOut className="w-4 h-4" />
                    Se déconnecter
                </button>
            </section>
        </div>
    );
}

function AppearanceTab() {
    const { theme, setTheme } = useTheme();

    const themeOptions = [
        { id: 'light',  label: 'Mode clair',    description: 'Interface en thème clair',  icon: Sun     },
        { id: 'dark',   label: 'Mode sombre',   description: 'Interface en thème foncé',  icon: Moon    },
        { id: 'system', label: 'Thème système', description: 'Suit les préférences de votre OS', icon: Monitor },
    ];

    return (
        <div className="space-y-6">
            <section>
                <SectionHeader
                    icon={Palette}
                    title="Thème & Apparence"
                    description="Personnalisez l'apparence visuelle de l'application."
                />
                <div className="space-y-1 divide-y divide-border rounded-xl border border-border overflow-hidden bg-card">
                    {themeOptions.map(opt => {
                        const Icon = opt.icon;
                        const isActive = theme === opt.id;
                        return (
                            <button
                                key={opt.id}
                                onClick={() => setTheme(opt.id)}
                                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${isActive ? 'bg-primary/5' : 'hover:bg-muted'}`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`p-1.5 rounded-md transition-colors ${isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">{opt.label}</p>
                                        <p className="text-xs text-muted-foreground truncate">{opt.description}</p>
                                    </div>
                                </div>
                                {isActive && (
                                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                        <Check className="w-3 h-3" />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

function NotificationsTab({ profile, resolvedUid, onClose }) {
    const { showSuccess, showError, showConfirm } = useDialog();
    const { signOut } = useAuth();
    const [exporting, setExporting] = useState(false);
    const [exportDone, setExportDone] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleExportData = async () => {
        if (!resolvedUid || !auth?.currentUser) return false;
        setExporting(true);
        setExportDone(false);
        const downloadWindow = window.open('', '_blank');

        try {
            const idToken = await auth.currentUser.getIdToken();

            const res = await fetch('/api/export-data', {
                method: 'POST',
                headers: { Authorization: `Bearer ${idToken}` },
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.details || data.error || 'Erreur inconnue');

            if (downloadWindow) {
                downloadWindow.location.href = data.downloadUrl;
            } else {
                window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
            }

            setExportDone(true);
            showSuccess('Votre téléchargement a été lancé dans un nouvel onglet.');
            return true;

        } catch (err) {
            downloadWindow?.close();
            console.error('[Export]', err);
            showError(`Erreur lors de la demande d'export : ${err.message}`);
            return false;
        } finally {
            setExporting(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!resolvedUid || !auth?.currentUser) {
            showError('Impossible de supprimer ce compte pour le moment.');
            return;
        }

        const wantsExport = await showConfirm(
            'Souhaitez-vous télécharger une copie de vos données avant de supprimer votre compte ?',
            { type: 'warning', title: 'Exporter vos données ?', confirmLabel: 'Télécharger mes données', cancelLabel: 'Supprimer sans exporter' }
        );

        if (wantsExport) {
            const exportStarted = await handleExportData();
            if (!exportStarted) return;
        }

        const confirmed = await showConfirm(
            'Cette action est irréversible. Votre compte, votre profil et vos données seront supprimés définitivement.',
            { type: 'danger', title: 'Supprimer mon compte', confirmLabel: 'Supprimer le compte' }
        );

        if (!confirmed) return;

        setDeleting(true);

        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch('/api/account/delete', {
                method: 'POST',
                headers: { Authorization: `Bearer ${idToken}` },
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'La suppression du compte a échoué.');
            }

            if (auth.currentUser) {
                try { await signOut(); } catch (signOutError) { console.error('[SignOut after delete]', signOutError); }
            }

            onClose?.();
            showSuccess('Votre compte a bien été supprimé.');
        } catch (err) {
            console.error('[Delete account]', err);
            showError('La suppression du compte a échoué. Réessayez plus tard ou contactez l’assistance.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <section>
                <SectionHeader
                    icon={BellRing}
                    title="Canaux de notification"
                    description="Choisissez comment vous souhaitez être notifié."
                />
                <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    Les notifications essentielles restent actives selon votre compte.
                </div>
            </section>

            <Divider />

            <section>
                <SectionHeader
                    icon={Download}
                    title="Gestion des données"
                    description="Exportez ou supprimez vos données personnelles."
                />
                <div className="space-y-2">
                    <button
                        onClick={handleExportData}
                        disabled={exporting || exportDone}
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                    >
                        <span className="flex items-center gap-2">
                            {exporting
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : exportDone
                                ? <Check className="w-4 h-4 text-emerald-600" />
                                : <Download className="w-4 h-4" />
                            }
                            {exporting
                                ? 'Génération en cours…'
                                : exportDone
                                ? 'Téléchargement lancé ✓'
                                : 'Exporter mes données personnelles'
                            }
                        </span>
                        {!exporting && !exportDone && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 border border-blue-200 uppercase tracking-wide dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/40">
                                PDF immédiat
                            </span>
                        )}
                    </button>

                    {exporting && (
                        <p className="text-xs text-muted-foreground px-1 leading-relaxed animate-pulse">
                            Préparation de votre téléchargement sécurisé…
                        </p>
                    )}

                    <button
                        onClick={handleDeleteAccount}
                        disabled={deleting}
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                    >
                        <span className="flex items-center gap-2">
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            {deleting ? 'Suppression en cours…' : 'Supprimer définitivement mon compte'}
                        </span>
                    </button>
                </div>
            </section>
        </div>
    );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function SettingsModal({ isOpen, onClose, profile, resolvedUid }) {
    const [activeTab, setActiveTab] = useState('account');
    const overlayRef = useRef(null);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Prevent body scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Click-outside to close
    const handleOverlayClick = useCallback((e) => {
        if (e.target === overlayRef.current) onClose();
    }, [onClose]);

    if (!isOpen) return null;

    const TabContent = () => {
        switch (activeTab) {
            case 'account':       return <AccountTab profile={profile} resolvedUid={resolvedUid} onClose={onClose} />;
            case 'appearance':    return <AppearanceTab />;
            case 'notifications': return <NotificationsTab profile={profile} resolvedUid={resolvedUid} onClose={onClose} />;
            default:              return null;
        }
    };

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Paramètres"
        >
            <div className="relative w-full max-w-sm sm:max-w-2xl lg:max-w-3xl max-h-[85vh] sm:max-h-[90vh] bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border shrink-0">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
                            <UserCog className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm sm:text-base font-bold text-foreground truncate">Paramètres</h2>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Gérez votre compte</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
                        aria-label="Fermer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Body ───────────────────────────────────────────── */}
                <div className="flex flex-col lg:flex-row flex-1 min-h-0">

                    {/* Sidebar Navigation - Hidden on mobile, shown on lg screens */}
                    <nav className="hidden lg:flex lg:w-52 lg:shrink-0 border-r border-border bg-muted/70 p-3 flex-col gap-0.5 overflow-y-auto">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all group
                                        ${isActive
                                            ? 'bg-card text-primary shadow-sm border border-border'
                                            : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'}
                                    `}
                                >
                                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                                    <span className="flex-1 leading-tight">{tab.label}</span>
                                    {isActive && <ChevronRight className="w-3 h-3 text-primary/60 shrink-0" />}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Mobile Tab Navigation - Shown on small screens, hidden on lg */}
                    <nav className="lg:hidden border-b border-border bg-card px-2 py-2 overflow-x-auto shrink-0">
                        <div className="flex gap-1 min-w-min">
                            {TABS.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0
                                            ${isActive
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'bg-muted text-muted-foreground hover:bg-muted'}
                                        `}
                                    >
                                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Content Area */}
                    <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                        <TabContent />
                    </main>
                </div>
            </div>
        </div>
    );
}
