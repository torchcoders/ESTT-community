'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { IMAGE_SIZES } from '@/lib/image-constants';
import { db, ref, get, update, onValue } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import UnifiedDialog from '@/components/ui/UnifiedDialog';
import { Loader2, User, Mail, GraduationCap, Calendar, Share2, Star, Edit2, X, ArrowRight, Award, Camera, Upload, ShieldCheck, Trophy, LogOut, Bug, Gem, MessageSquare, Settings } from 'lucide-react';
import { cn, getUserLevel, resolveUidFromIdentifier } from '@/lib/utils';
import { getClubPath } from '@/lib/clubUtils';
import { uploadToImgBB } from '@/lib/uploadUtils';
import SettingsModal from '@/components/profile/SettingsModal';

export default function PublicProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const { user: currentUser, signOut } = useAuth();
    const { showWarning, showError, showSuccess, showConfirm } = useDialog();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isStarred, setIsStarred] = useState(false);
    const [starCount, setStarCount] = useState(0);
    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [userClubs, setUserClubs] = useState([]);
    const [loadingClubs, setLoadingClubs] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        filiere: '',
        startYear: '',
        bannerUrl: '',
        photoUrl: ''
    });
    const [bannerUploading, setBannerUploading] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);

    // Verification state
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
    const [affiliatedClub, setAffiliatedClub] = useState(null);

    const [resolvedUid, setResolvedUid] = useState(null);
    const decodedId = id ? decodeURIComponent(id) : null;
    const isUsername = decodedId && decodedId.startsWith('@');

    useEffect(() => {
        if (!id) return;
        const resolve = async () => {
            const uid = await resolveUidFromIdentifier(db, ref, get, id);
            if (uid) {
                setResolvedUid(uid);
            } else {
                setError("Profil introuvable");
                setLoading(false);
            }
        };
        resolve();
    }, [id]);

    useEffect(() => {
        if (!resolvedUid) return;

        const profileRef = ref(db, `users/${resolvedUid}`);
        const unsubscribe = onValue(profileRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setProfile(data);
                setStarCount(data.stars || 0);
                setIsStarred(data.starredBy && currentUser && data.starredBy[currentUser.uid]);
                
                // Redirect legacy UID URLs to new @username URLs
                if (!isUsername && data.email) {
                    const username = data.email.split('@')[0];
                    router.replace(`/profile/@${username}`);
                }
            } else {
                setError("Profil introuvable");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [resolvedUid, isUsername, currentUser, router]);

    useEffect(() => {
        if (profile) {
            setFormData({
                firstName: profile.firstName || '',
                lastName: profile.lastName || '',
                filiere: profile.filiere || '',
                startYear: profile.startYear || '',
                bannerUrl: profile.bannerUrl || '',
                photoUrl: profile.photoUrl || ''
            });
        }
    }, [profile]);

    useEffect(() => {
        if (!resolvedUid || !currentUser || currentUser.uid !== resolvedUid) return;

        const fetchTickets = async () => {
            setLoadingTickets(true);
            try {
                const ticketsRef = ref(db, 'tickets');
                const snap = await get(ticketsRef);
                if (snap.exists()) {
                    const data = snap.val();
                    const userTickets = Object.entries(data)
                        .map(([tid, t]) => ({ id: tid, ...t }))
                        .filter(t => t.userId === resolvedUid)
                        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                    setTickets(userTickets);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingTickets(false);
            }
        };
        fetchTickets();
    }, [resolvedUid, currentUser]);

    useEffect(() => {
        if (!profile || !resolvedUid) return;

        const fetchUserClubs = async () => {
            setLoadingClubs(true);
            try {
                const clubsRef = ref(db, 'clubs');
                const snap = await get(clubsRef);
                if (snap.exists()) {
                    const allClubs = snap.val();
                    const userEmail = profile.email?.toLowerCase();
                    const userId = resolvedUid;

                    const associatedClubs = Object.entries(allClubs).map(([cId, club]) => {
                        const inOrg = club.organizationalChart && Object.values(club.organizationalChart).find(m =>
                            m?.email?.toLowerCase() === userEmail
                        );
                        const memberInfo = club.members && Array.isArray(club.members) && club.members.find(m =>
                            m?.email?.toLowerCase() === userEmail || m?.id === userId
                        );

                        if (inOrg || memberInfo) {
                            return {
                                id: cId,
                                ...club,
                                userMemberId: memberInfo?.id || inOrg?.id || null
                            };
                        }
                        return null;
                    }).filter(Boolean);

                    setUserClubs(associatedClubs);

                    // Find primary affiliation (part of bureau)
                    const primaryAffiliate = Object.entries(allClubs).find(([_cId, club]) => {
                        const inOrg = club.organizationalChart && Object.values(club.organizationalChart).find(m =>
                            m?.email?.toLowerCase() === userEmail
                        );
                        return !!inOrg;
                    });

                    if (primaryAffiliate) {
                        setAffiliatedClub({
                            id: primaryAffiliate[0],
                            ...primaryAffiliate[1]
                        });
                    } else {
                        setAffiliatedClub(null);
                    }
                }
            } catch (e) {
                console.error("Error fetching user clubs:", e);
            } finally {
                setLoadingClubs(false);
            }
        };

        fetchUserClubs();
    }, [profile, resolvedUid]);

    const handleStar = async () => {
        if (!currentUser) { showWarning("Vous devez être connecté pour liker un profil."); return; }
        if (currentUser.uid === resolvedUid) { showWarning("Vous ne pouvez pas liker votre propre profil."); return; }

        const newIsStarred = !isStarred;
        const newStarCount = newIsStarred ? starCount + 1 : Math.max(0, starCount - 1);

        try {
            await update(ref(db, `users/${resolvedUid}`), {
                stars: newStarCount,
                [`starredBy/${currentUser.uid}`]: newIsStarred || null
            });
            setIsStarred(newIsStarred);
            setStarCount(newStarCount);
        } catch (err) {
            console.error("Error updating star:", err);
            showError("Une erreur est survenue lors de la mise à jour des stars.");
        }
    };

    const handleBannerUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file size (max 10MB for ImgBB/Performance)
        if (file.size > 10 * 1024 * 1024) {
            showWarning("L'image est trop volumineuse (max 10 Mo).");
            return;
        }

        setBannerUploading(true);
        try {
            const url = await uploadToImgBB(file);
            await update(ref(db, `users/${resolvedUid}`), { bannerUrl: url, updatedAt: Date.now() });
            setProfile(prev => ({ ...prev, bannerUrl: url }));
            setFormData(prev => ({ ...prev, bannerUrl: url }));
        } catch (err) {
            console.error("Error uploading banner:", err);
            showError("Erreur lors du téléchargement de la bannière.");
        } finally {
            setBannerUploading(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file size (max 5MB for ImgBB/Performance)
        if (file.size > 5 * 1024 * 1024) {
            showWarning("L'image est trop volumineuse (max 5 Mo).");
            return;
        }

        setAvatarUploading(true);
        try {
            const url = await uploadToImgBB(file);
            await update(ref(db, `users/${resolvedUid}`), { photoUrl: url, updatedAt: Date.now() });
            setProfile(prev => ({ ...prev, photoUrl: url }));
            setFormData(prev => ({ ...prev, photoUrl: url }));
        } catch (err) {
            console.error("Error uploading avatar:", err);
            showError("Erreur lors du téléchargement de la photo de profil.");
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!currentUser || currentUser.uid !== resolvedUid) return;
        setSaving(true);
        try {
            await update(ref(db, `users/${resolvedUid}`), { ...formData, updatedAt: Date.now() });
            setIsEditOpen(false);
        } catch (err) {
            console.error("Error updating profile:", err);
            showError("Erreur lors de la mise à jour du profil.");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        const confirmed = await showConfirm("Êtes-vous sûr de vouloir vous déconnecter ?", { type: 'danger', title: 'Déconnexion', confirmLabel: 'Déconnexion' });
        if (!confirmed) return;
        try { await signOut(); } catch (error) { console.error("Error signing out", error); }
    };

    // Verification Logic
    useEffect(() => {
        let timer;
        if (cooldown > 0) {
            timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleSendVerificationCode = async () => {
        if (!profile?.email || isVerifying || cooldown > 0) return;

        setIsVerifying(true);
        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send',
                    uid: resolvedUid,
                    email: profile.email,
                    firstName: profile.firstName
                })
            });
            const data = await res.json();
            if (data.success) {
                showSuccess("Code de vérification envoyé à votre email académique.");
                setIsVerificationDialogOpen(true);
                setCooldown(60);
            } else {
                showError(data.error || "Erreur lors de l'envoi du code.");
            }
        } catch {
            showError("Impossible d'envoyer le code.");
        } finally {
            setIsVerifying(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!verificationCode || isVerifying) return;

        setIsVerifying(true);
        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'verify',
                    uid: resolvedUid,
                    email: profile.email,
                    code: verificationCode
                })
            });
            const data = await res.json();
            if (data.success) {
                showSuccess("Votre email a été vérifié avec succès !");
                setIsVerificationDialogOpen(false);
                setVerificationCode('');
            } else {
                showError(data.error || "Code incorrect ou expiré.");
            }
        } catch {
            showError("Erreur lors de la vérification.");
        } finally {
            setIsVerifying(false);
        }
    };

    const copyProfileLink = async () => {
        try {
            const url = window.location.href;
            if (navigator.share) {
                await navigator.share({ title: `Profil de ${profile.firstName} ${profile.lastName} | ESTT Community`, url });
                showSuccess("Lien du profil copié !");
            } else {
                await navigator.clipboard.writeText(url);
                showSuccess("Lien du profil copié !");
            }
        } catch (err) {
            console.error("Error sharing profile:", err);
            if (err.name !== 'AbortError') {
                try { await navigator.clipboard.writeText(window.location.href); showSuccess("Lien du profil copié !"); }
                catch { showError("Impossible de copier le lien."); }
            }
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh] text-primary">
            <Loader2 className="animate-spin w-10 h-10" />
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center min-h-[60vh] text-destructive">
            {error}
        </div>
    );

    const level = getUserLevel(profile?.startYear);
    const contributionsCount = Object.keys(profile?.contributions || {}).length;
    // isMentor is computed for potential future use
    const _isMentor = level === 2 && contributionsCount > 5;

    // New stats for badges
    const verifiedReports = profile?.stats?.verifiedReports || 0;
    const reportedBugsFixed = profile?.stats?.reportedBugsFixed || 0;
    const isSubscribed = profile?.subscription?.expiresAt && profile.subscription.expiresAt > Date.now();
    const subscriptionLabel = (() => {
        if (!isSubscribed) return null;
        const t = profile.subscription.type || '';
        if (t.includes('month')) return `ESTTPlus+ · ${t.split('_')[1].replace('month', ' mois')}`;
        if (t.includes('day')) return `ESTTPlus+ · ${t.split('_')[1].replace('day', ' jours')}`;
        return 'ESTTPlus+';
    })();

    return (
        <main className="min-h-screen bg-card py-12 border-t border-border">
            <div className="container max-w-5xl mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column */}
                    <div className="space-y-4">

                        {/* Profile Card */}
                        <div className="border border-border rounded-xl overflow-hidden text-center relative bg-card">
                            {/* Banner Area */}
                            <div className="h-28 bg-muted relative group">
                                {profile.bannerUrl ? (
                                    <Image
                                        src={profile.bannerUrl}
                                        alt="Profile Banner"
                                        fill
                                        priority
                                        className="object-cover"
                                    />
                                ) : (
                                    <Image
                                        src="https://i.ibb.co/hRFNsKvJ/default.png"
                                        alt="Default Profile Banner"
                                        fill
                                        priority
                                        className="object-cover"
                                    />
                                )}

                                {currentUser && currentUser.uid === resolvedUid && (
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="rounded-full shadow-lg h-8 text-[11px] font-bold"
                                            disabled={bannerUploading}
                                            onClick={() => document.getElementById('banner-upload').click()}
                                        >
                                            {bannerUploading ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                                            ) : (
                                                <Camera className="w-3.5 h-3.5 mr-2" />
                                            )}
                                            {bannerUploading ? 'Téléchargement...' : 'Changer la bannière'}
                                        </Button>
                                        <input
                                            id="banner-upload"
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleBannerUpload}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="p-8 -mt-12 relative">
                                <div className="w-24 h-24 bg-card rounded-full border-4 border-white flex items-center justify-center mx-auto mb-4 shadow-sm z-10 overflow-hidden relative group dark:border-border">
                                    <div className="w-full h-full bg-muted rounded-full flex items-center justify-center relative">
                                        {profile.photoUrl ? (
                                            <Image
                                                src={profile.photoUrl}
                                                alt={`Photo de ${profile.firstName}`}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <User className="w-10 h-10 text-muted-foreground" />
                                        )}
                                    </div>

                                    {currentUser && currentUser.uid === resolvedUid && (
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center cursor-pointer" onClick={async () => {
                                            const confirmed = await showConfirm("Cette image sera hébergée sur un service tiers (ImgBB). Voulez-vous continuer ?", { type: 'info', title: 'Upload d\'image', confirmLabel: 'Continuer' });
                                            if (confirmed) {
                                                document.getElementById('avatar-quick-upload').click();
                                            }
                                        }}>
                                            {avatarUploading ? (
                                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                                            ) : (
                                                <Camera className="w-6 h-6 text-white" />
                                            )}
                                        </div>
                                    )}

                                    <input
                                        id="avatar-quick-upload"
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                    />
                                </div>
                                <h1 className="text-xl font-bold text-foreground flex items-center justify-center gap-1.5">
                                    {profile.firstName} {profile.lastName}
                                    {profile.verifiedEmail && (
                                        <div className="group relative flex items-center">
                                            <span className={`material-symbols-outlined select-none ${(profile.role || '').toLowerCase() === 'admin' ? 'text-yellow-500' : 'text-emerald-500'}`} style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}>
                                                verified
                                            </span>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                                {(profile.role || '').toLowerCase() === 'admin' ? 'Administrateur Vérifié' : (profile.role || '').toLowerCase() === 'moderator' ? 'Modérateur Vérifié' : 'Email académique vérifié'}
                                            </div>
                                        </div>
                                    )}



                                    {affiliatedClub && (
                                        <Link href={getClubPath(affiliatedClub)} className="group relative flex items-center">
                                            <div className="w-[18px] h-[18px] rounded-[3px] overflow-hidden border border-border bg-card">
                                                {affiliatedClub.logo ? (
                                                    <Image
                                                        src={affiliatedClub.logo}
                                                        alt={affiliatedClub.name}
                                                        width={18}
                                                        height={18}
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-muted text-[10px] font-bold text-muted-foreground">
                                                        {affiliatedClub.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                                Membre du bureau de {affiliatedClub.name}
                                            </div>
                                        </Link>
                                    )}
                                </h1>
                                {profile.email && (
                                    <p className="text-muted-foreground text-sm mt-0.5 select-all font-normal">
                                        @{profile.email.split('@')[0]}
                                    </p>
                                )}
                                <p className="text-muted-foreground text-sm mt-1">
                                    {profile.filiere?.toUpperCase()} · {level === 1 ? 'S1/S2' : 'S3/S4'}
                                </p>
                                
                                {isSubscribed && (
                                    <div className="flex justify-center mt-3">
                                        <div className="group relative flex items-center">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-200/50 cursor-default">
                                                <Gem className="w-3.5 h-3.5" />
                                                {subscriptionLabel}
                                            </span>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                                Expire le {new Date(profile.subscription.expiresAt).toLocaleDateString('fr-FR')}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-center gap-2 mt-6">
                                    {currentUser && currentUser.uid === resolvedUid ? (
                                        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                                            <DialogTrigger asChild>
                                                <Button className="rounded-full px-5 gap-2" size="sm">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                    Modifier
                                                </Button>
                                            </DialogTrigger>
                                            <Button variant="outline" size="sm" className="rounded-full px-5 gap-2" onClick={() => setIsSettingsOpen(true)}>
                                                <Settings className="w-3.5 h-3.5" />
                                                Paramètres
                                            </Button>
                                            <DialogContent className="sm:max-w-md rounded-2xl">
                                                <DialogHeader>
                                                    <DialogTitle className="text-xl font-bold">Modifier mon profil</DialogTitle>
                                                    <DialogDescription>Mettez à jour vos informations publiques.</DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="firstName">Prénom</Label>
                                                            <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="rounded-lg" />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="lastName">Nom</Label>
                                                            <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="rounded-lg" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="email">Email</Label>
                                                        <Input id="email" value={profile.email} disabled className="rounded-lg bg-muted text-muted-foreground" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="filiere">Filière</Label>
                                                            <Input id="filiere" value={formData.filiere} onChange={(e) => setFormData({ ...formData, filiere: e.target.value })} className="rounded-lg uppercase" />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="startYear">Début</Label>
                                                            <Input id="startYear" type="number" value={formData.startYear} onChange={(e) => setFormData({ ...formData, startYear: e.target.value })} className="rounded-lg" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="photoUrl">Photo de profil</Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                id="photoUrl"
                                                                value={formData.photoUrl}
                                                                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                                                                placeholder="https://i.ibb.co/..."
                                                                className="rounded-lg flex-1"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="rounded-lg gap-2 shrink-0 bg-muted"
                                                                disabled={avatarUploading}
                                                                onClick={() => document.getElementById('dialog-avatar-upload').click()}
                                                            >
                                                                {avatarUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                                                Uploader
                                                            </Button>
                                                            <input
                                                                id="dialog-avatar-upload"
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={handleAvatarUpload}
                                                            />
                                                            {formData.photoUrl && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => setFormData({ ...formData, photoUrl: '' })}
                                                                    className="shrink-0 text-destructive hover:bg-red-50 dark:hover:bg-red-500/10 border-red-100"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="bannerUrl">URL de la bannière (Optionnel)</Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                id="bannerUrl"
                                                                value={formData.bannerUrl}
                                                                onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                                                                placeholder="https://i.ibb.co/..."
                                                                className="rounded-lg flex-1"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="rounded-lg gap-2 shrink-0 bg-muted"
                                                                disabled={bannerUploading}
                                                                onClick={() => document.getElementById('dialog-banner-upload').click()}
                                                            >
                                                                {bannerUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                                                Uploader
                                                            </Button>
                                                            <input
                                                                id="dialog-banner-upload"
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={handleBannerUpload}
                                                            />
                                                            {formData.bannerUrl && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    onClick={() => setFormData({ ...formData, bannerUrl: '' })}
                                                                    className="shrink-0 text-destructive hover:bg-red-50 dark:hover:bg-red-500/10 border-red-100"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Taille reco: 800x200 max 10 Mo</p>
                                                    </div>

                                                    <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs leading-5 text-muted-foreground dark:bg-blue-500/10 dark:border-blue-500/30">
                                                        <strong>Mise en garde :</strong> L&apos;outil d&apos;upload d&apos;images utilise <a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ImgBB</a>, un service tiers. Veuillez ne pas télécharger d&apos;images contenant des informations personnelles sensibles.
                                                    </div>
                                                </div>
                                                <DialogFooter className="flex gap-2">
                                                    <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="rounded-lg">Annuler</Button>
                                                    <Button onClick={handleSaveProfile} disabled={saving} className="rounded-lg bg-primary text-white">
                                                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                        Enregistrer
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Button
                                                variant={isStarred ? "default" : "outline"}
                                                size="sm"
                                                className={cn("rounded-full px-5 transition-all text-[11px] font-bold", isStarred && "bg-yellow-500 hover:bg-yellow-600 border-none text-white")}
                                                onClick={handleStar}
                                            >
                                                <Star className={cn("w-3.5 h-3.5 mr-1.5", isStarred && "fill-current")} />
                                                <span>{starCount}</span>
                                            </Button>

                                            <Button asChild variant="outline" size="sm" className="rounded-full px-5 gap-2 text-[11px] font-bold">
                                                <Link href={`/messages/${resolvedUid}`}>
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                    Message
                                                </Link>
                                            </Button>
                                        </div>
                                    )}
                                    <Button variant="outline" size="icon" className="rounded-full w-8 h-8" onClick={copyProfileLink}>
                                        <Share2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* About */}
                        <div className="border border-border rounded-xl p-5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">À propos</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span className="truncate">{profile.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span>Promotion {profile.startYear}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span>Membre depuis {new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Badges */}
                        <div className="border border-border rounded-xl p-5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Succès</h3>
                            <div className="flex flex-wrap gap-2">
                                {contributionsCount >= 1 && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300">
                                        <Award className="w-3.5 h-3.5" />
                                        Contributeur
                                    </span>
                                )}
                                {contributionsCount >= 10 && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                                        <Trophy className="w-3.5 h-3.5" />
                                        Major Contrib
                                    </span>
                                )}
                                {starCount >= 5 && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md bg-yellow-50 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300">
                                        <Star className="w-3.5 h-3.5 fill-current" />
                                        Populaire
                                    </span>
                                )}
                                {level === 2 && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
                                        <GraduationCap className="w-3.5 h-3.5" />
                                        Ancien
                                    </span>
                                )}
                                {verifiedReports >= 1 && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        Modérateur
                                    </span>
                                )}
                                {reportedBugsFixed >= 1 && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                                        <Bug className="w-3.5 h-3.5" />
                                        Bug Hunter
                                    </span>
                                )}
                                {isSubscribed && (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-md bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-sm shadow-violet-200">
                                        <Gem className="w-3.5 h-3.5" />
                                        {subscriptionLabel}
                                    </span>
                                )}
                                {contributionsCount === 0 && starCount < 5 && level !== 2 && verifiedReports === 0 && reportedBugsFixed === 0 && !isSubscribed && (

                                    <span className="text-xs text-muted-foreground italic">Aucun succès pour le moment.</span>
                                )}
                            </div>
                        </div>

                        {/* Account & Verification */}
                        {currentUser && currentUser.uid === resolvedUid && (
                            <div className="border border-border rounded-xl p-5 space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Compte</h3>

                                {!profile.verifiedEmail && (
                                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl dark:bg-amber-500/10 dark:border-amber-500/30">
                                        <div className="flex items-start gap-3">
                                            <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-amber-900">Email non vérifié</p>
                                                <p className="text-xs text-amber-700 leading-relaxed">Vérifiez votre email académique pour obtenir votre badge de confiance.</p>
                                                <Button
                                                    onClick={handleSendVerificationCode}
                                                    disabled={isVerifying || cooldown > 0}
                                                    variant="link"
                                                    className="p-0 h-auto text-amber-600 font-bold hover:text-amber-700 text-xs mt-1"
                                                >
                                                    {isVerifying ? "Envoi..." : cooldown > 0 ? `Renvoyer (${cooldown}s)` : "Vérifier maintenant →"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {profile.verifiedEmail && (
                                    <div className={`p-4 border rounded-xl ${(profile.role || '').toLowerCase() === 'admin' ? 'bg-yellow-50 border-yellow-100 dark:bg-yellow-500/10 dark:border-yellow-500/30' : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/30'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`material-symbols-outlined select-none ${(profile.role || '').toLowerCase() === 'admin' ? 'text-yellow-500' : 'text-emerald-500'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                                verified
                                            </span>
                                            <div className="space-y-0.5">
                                                <p className={`text-sm font-bold ${(profile.role || '').toLowerCase() === 'admin' ? 'text-yellow-900' : 'text-emerald-900'}`}>
                                                    {(profile.role || '').toLowerCase() === 'admin' ? 'Administrateur Vérifié' : (profile.role || '').toLowerCase() === 'moderator' ? 'Modérateur Vérifié' : 'Profil Vérifié'}
                                                </p>
                                                <p className={`text-[10px] ${(profile.role || '').toLowerCase() === 'admin' ? 'text-yellow-700' : 'text-emerald-700'}`}>
                                                    {(profile.role || '').toLowerCase() === 'admin' ? "Vous avez le rôle d'administrateur sur la plateforme." : (profile.role || '').toLowerCase() === 'moderator' ? "Vous avez le rôle de modérateur sur la plateforme." : 'Votre identité académique est confirmée.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={handleLogout}
                                    className="w-full justify-start rounded-lg border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 gap-2 text-sm dark:border-red-500/30 dark:hover:bg-red-500/10"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Déconnexion
                                </Button>
                            </div>
                        )}

                        {/* Verification Dialog */}
                        <UnifiedDialog
                            isOpen={isVerificationDialogOpen}
                            onClose={() => setIsVerificationDialogOpen(false)}
                            type="info"
                            title="Vérification de l'email"
                            message={`Un code de 6 chiffres a été envoyé à ${profile?.email}.`}
                            actions={[
                                {
                                    label: "Vérifier",
                                    variant: "primary",
                                    onClick: handleVerifyCode
                                }
                            ]}
                        >
                            <div className="mt-4 space-y-3">
                                <Label htmlFor="vcode" className="text-xs font-bold text-muted-foreground uppercase">Code de vérification</Label>
                                <Input
                                    id="vcode"
                                    placeholder="Ex: 123456"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="text-center text-2xl tracking-[0.5em] font-mono h-14 rounded-xl border-border focus:border-primary"
                                />
                                <div className="flex justify-between items-center px-1">
                                    <p className="text-[10px] text-muted-foreground">Pensez à vérifier vos spams.</p>
                                    {cooldown > 0 ? (
                                        <span className="text-[10px] font-bold text-muted-foreground">Renvoyer dans {cooldown}s</span>
                                    ) : (
                                        <button
                                            onClick={handleSendVerificationCode}
                                            className="text-[10px] font-bold text-primary hover:underline"
                                        >
                                            Renvoyer le code
                                        </button>
                                    )}
                                </div>
                            </div>
                        </UnifiedDialog>

                        {/* Settings Modal */}
                        <SettingsModal
                            isOpen={isSettingsOpen}
                            onClose={() => setIsSettingsOpen(false)}
                            profile={profile}
                            resolvedUid={resolvedUid}
                        />
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-2 space-y-8">



                        {/* Contributions (horizontal scroll) */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-foreground">Contributions</h2>
                                    <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                        {contributionsCount}
                                    </span>
                                </div>
                                {contributionsCount > 0 && (
                                    <Link
                                        href={`/profile/${id}/contributions`}
                                        className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
                                    >
                                        Tout voir
                                        <ArrowRight className="w-3 h-3" />
                                    </Link>
                                )}
                            </div>
                            {profile.contributions ? (
                                <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar">
                                    {Object.entries(profile.contributions)
                                        .filter(([_key, item]) => !item.unverified)
                                        .sort((a, b) => b[1].timestamp - a[1].timestamp)
                                        .map(([cid, item]) => (
                                            <Link
                                                key={cid}
                                                href={`/resource/${cid}`}
                                                className="min-w-[260px] max-w-xs group p-4 border border-border rounded-xl hover:border-primary/50 transition-colors bg-card flex flex-col justify-between"
                                            >
                                                <div>
                                                    <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                                        {item.title}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-2 text-xs">
                                                        <span className="font-bold text-primary">
                                                            {item.module || 'Ressource'}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            · {new Date(item.timestamp).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 border border-dashed border-border rounded-xl">
                                    <p className="text-muted-foreground text-sm">Aucune contribution pour le moment.</p>
                                </div>
                            )}
                        </section>

                        {/* Clubs */}
                        <section>
                            <h2 className="text-base font-bold text-foreground mb-4">Clubs</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {loadingClubs ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto col-span-full" />
                                ) : userClubs.length > 0 ? (
                                    userClubs.map(club => (
                                        <div key={club.id} className="group relative border border-border rounded-xl hover:border-primary/50 transition-colors text-center p-4 bg-card">
                                            <Link href={getClubPath(club)}>
                                                <div className="relative w-10 h-10 mx-auto mb-2">
                                                    {club.logo ? (
                                                        <Image src={club.logo} alt={club.name} fill sizes={IMAGE_SIZES.CLUB_LOGO_MD} className="object-contain" />
                                                    ) : (
                                                        <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: club.themeColor || '#64748b' }}>
                                                            {(club.name || '?')[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{club.name || 'Club'}</p>
                                            </Link>

                                            {currentUser && currentUser.uid === resolvedUid && club.userMemberId && (
                                                <Link
                                                    href={`${getClubPath(club)}/certificate/${club.userMemberId}`}
                                                    className="mt-2 text-[10px] font-bold text-primary flex items-center justify-center gap-1 hover:underline pt-2 border-t border-slate-50"
                                                >
                                                    <Award className="w-3 h-3" />
                                                    Certificat
                                                </Link>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-8 border border-dashed border-border rounded-xl">
                                        <p className="text-muted-foreground text-sm">Aucun club.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Tickets (own profile only) */}
                        {currentUser && currentUser.uid === resolvedUid && (
                            <section>
                                <h2 className="text-base font-bold text-foreground mb-4">Mes Tickets</h2>
                                <div className="grid gap-2">
                                    {loadingTickets ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
                                    ) : tickets.length > 0 ? (
                                        tickets.map(ticket => (
                                            <div key={ticket.id} className="flex items-center justify-between p-4 border border-border rounded-xl bg-card">
                                                <div>
                                                    <h3 className="font-semibold text-sm text-foreground">{ticket.eventName}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", ticket.status === 'valid' ? "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300" : "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300")}>
                                                            {ticket.status === 'valid' ? 'Validé' : 'En attente'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{ticket.clubName}</span>
                                                    </div>
                                                </div>
                                                <a href={`/tickets/${ticket.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary hover:underline">
                                                    Voir →
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 border border-dashed border-border rounded-xl">
                                            <p className="text-muted-foreground text-sm">Aucun ticket.</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
