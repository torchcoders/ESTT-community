'use client';

import { useState, useMemo } from 'react';
import { db, ref, update, auth } from '@/lib/firebase';
import { db as staticDb } from '@/lib/data';
import { sendPrivateNotification, NOTIF_TYPES, NOTIF_PRIORITY } from '@/lib/notifications';
import { useDialog } from '@/context/DialogContext';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    ExternalLink,
    Search,
    ArrowUpDown,
    Users,
    BookOpen,
    ShieldCheck,
    Pencil,
    Plus,
    Trash2,
    Loader2,
    Copy,
    MoreVertical,
    Mail,
    Link2,
    BadgeCheck,
    Bell,
    Clock,
    KeyRound,
    MailCheck,
    Ban,
    Download,
    MessageSquare,
} from 'lucide-react';

const ROLE_OPTIONS = [
    { value: 'all', label: 'Tous les rôles' },
    { value: 'admin', label: 'Admin' },
    { value: 'moderator', label: 'Modérateur' },
    { value: 'student', label: 'Étudiant' },
];

const SORT_OPTIONS = [
    { value: 'newest', label: 'Plus récents' },
    { value: 'oldest', label: 'Plus anciens' },
    { value: 'name_asc', label: 'Nom (A → Z)' },
    { value: 'name_desc', label: 'Nom (Z → A)' },
];

const VERIFIED_OPTIONS = [
    { value: 'all', label: 'Tous les utilisateurs' },
    { value: 'verified', label: 'Email vérifié' },
];

const ASSIGNABLE_ROLES = [
    { value: 'admin', label: 'Admin' },
    { value: 'moderator', label: 'Modérateur' },
    { value: 'student', label: 'Étudiant' },
];

const BAN_DURATIONS = [
    { value: '1', label: '1 jour' },
    { value: '7', label: '7 jours' },
    { value: '30', label: '30 jours' },
    { value: '90', label: '90 jours' },
    { value: 'permanent', label: 'Permanent' },
];

function formatDate(value) {
    if (!value) return '—';
    const timestamp = typeof value === 'number'
        ? value
        : value?.seconds
            ? value.seconds * 1000
            : new Date(value).getTime();
    if (!timestamp || Number.isNaN(timestamp)) return '—';
    return new Date(timestamp).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

function countEntries(value) {
    return value && typeof value === 'object' ? Object.keys(value).length : 0;
}

function InfoItem({ label, value }) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="break-all text-sm">{value || '—'}</p>
        </div>
    );
}

const ROLE_BADGE_CLASSES = {
    admin: 'bg-yellow-400 text-white hover:bg-yellow-500 border-none',
    moderator: 'bg-blue-600 text-white hover:bg-blue-700 border-none',
    contributor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40',
};

export default function AdminUsers({ users, canEdit = false }) {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [roleFilter, setRoleFilter] = useState('all');
    const [filiereFilter, setFiliereFilter] = useState('all');
    const [verifiedFilter, setVerifiedFilter] = useState('all');
    const [userToEdit, setUserToEdit] = useState(null);
    const [editFields, setEditFields] = useState([]);
    const [simpleMode, setSimpleMode] = useState(true);
    const [simpleForm, setSimpleForm] = useState({
        firstName: '',
        lastName: '',
        filiere: '',
        startYear: '',
    });
    const [savingUser, setSavingUser] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [banTarget, setBanTarget] = useState(null);
    const [banForm, setBanForm] = useState({ reason: '', duration: '7' });
    const [banSaving, setBanSaving] = useState(false);
    const [notifyTargets, setNotifyTargets] = useState([]);
    const [notifyForm, setNotifyForm] = useState({ title: '', message: '' });
    const [notifySending, setNotifySending] = useState(false);
    const [activityTarget, setActivityTarget] = useState(null);
    const { showSuccess, showError, showWarning, showConfirm } = useDialog();

    const currentUserId = auth?.currentUser?.uid;
    const isBanned = (user) => user?.banned === true && (!user.bannedUntil || user.bannedUntil > Date.now());

    const copyUserId = async (id) => {
        try {
            await navigator.clipboard.writeText(id);
            showSuccess('Identifiant copié dans le presse-papier !');
        } catch (error) {
            console.error('Failed to copy user id:', error);
            showError('Impossible de copier l’identifiant.');
        }
    };

    const copyEmail = async (user) => {
        if (!user?.email) {
            showWarning('Cet utilisateur n’a pas d’adresse email.');
            return;
        }
        try {
            await navigator.clipboard.writeText(user.email);
            showSuccess('Email copié dans le presse-papier !');
        } catch (error) {
            console.error('Failed to copy email:', error);
            showError('Impossible de copier l’email.');
        }
    };

    const copyProfileLink = async (user) => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/profile/${user.id}`);
            showSuccess('Lien du profil copié dans le presse-papier !');
        } catch (error) {
            console.error('Failed to copy profile link:', error);
            showError('Impossible de copier le lien du profil.');
        }
    };

    const requestAdminAction = async (payload) => {
        if (!auth?.currentUser) {
            throw new Error('Session administrateur introuvable.');
        }
        const token = await auth.currentUser.getIdToken();
        const response = await fetch('/api/admin/users/actions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || 'L’action a échoué.');
        }
        return data;
    };

    const changeUserRole = async (user, role) => {
        if (!user || (user.role || 'student') === role) return;
        try {
            await requestAdminAction({ uid: user.id, action: 'setRole', role });
            showSuccess(`Le rôle de ${user.firstName || ''} ${user.lastName || ''} est maintenant « ${ASSIGNABLE_ROLES.find((r) => r.value === role)?.label || role} ».`);
        } catch (error) {
            console.error('Failed to change user role:', error);
            showError(error.message || 'Impossible de modifier le rôle de cet utilisateur.');
        }
    };

    const toggleEmailVerification = async (user) => {
        const verified = user.verifiedEmail === true;
        try {
            await update(ref(db, `users/${user.id}`), {
                verifiedEmail: !verified,
                verifiedAt: verified ? null : Date.now(),
            });
            showSuccess(verified ? 'La vérification de l’email a été retirée.' : 'L’email a été marqué comme vérifié.');
        } catch (error) {
            console.error('Failed to toggle email verification:', error);
            showError('Impossible de modifier la vérification de l’email.');
        }
    };

    const sendVerificationEmail = async (user) => {
        if (!user?.email) {
            showWarning('Cet utilisateur n’a pas d’adresse email.');
            return;
        }
        try {
            const response = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send',
                    uid: user.id,
                    email: user.email,
                    firstName: user.firstName,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'L’envoi a échoué.');
            }
            showSuccess(`Un code de vérification a été envoyé à ${user.email}.`);
        } catch (error) {
            console.error('Failed to send verification email:', error);
            showError(error.message || 'Impossible d’envoyer l’email de vérification.');
        }
    };

    const sendPasswordReset = async (user) => {
        if (!user?.email) {
            showWarning('Cet utilisateur n’a pas d’adresse email.');
            return;
        }
        try {
            const { sendPasswordResetEmail } = await import('firebase/auth');
            await sendPasswordResetEmail(auth, user.email);
            showSuccess(`Un email de réinitialisation a été envoyé à ${user.email}.`);
        } catch (error) {
            console.error('Failed to send password reset email:', error);
            showError('Impossible d’envoyer l’email de réinitialisation.');
        }
    };

    const openBanDialog = (user) => {
        setBanTarget(user);
        setBanForm({ reason: '', duration: '7' });
    };

    const submitBan = async () => {
        if (!banTarget) return;
        setBanSaving(true);
        try {
            if (isBanned(banTarget)) {
                await requestAdminAction({ uid: banTarget.id, action: 'unban' });
                showSuccess('Le compte a été réactivé.');
            } else {
                const durationDays = banForm.duration === 'permanent' ? null : Number(banForm.duration);
                await requestAdminAction({
                    uid: banTarget.id,
                    action: 'ban',
                    reason: banForm.reason.trim(),
                    durationDays,
                });
                showSuccess('L’utilisateur a été banni.');
            }
            setBanTarget(null);
            setBanForm({ reason: '', duration: '7' });
        } catch (error) {
            console.error('Failed to update ban status:', error);
            showError(error.message || 'Impossible de modifier le statut du compte.');
        } finally {
            setBanSaving(false);
        }
    };

    const openNotificationDialog = (targets) => {
        setNotifyTargets(targets);
        setNotifyForm({ title: '', message: '' });
    };

    const submitNotification = async () => {
        if (!notifyForm.title.trim() || !notifyForm.message.trim()) {
            showWarning('Veuillez renseigner un titre et un message.');
            return;
        }
        setNotifySending(true);
        try {
            await Promise.all(
                notifyTargets.map((target) =>
                    sendPrivateNotification(target.id, {
                        type: NOTIF_TYPES.SYSTEM,
                        title: notifyForm.title.trim(),
                        message: notifyForm.message.trim(),
                        icon: 'bell',
                        priority: NOTIF_PRIORITY.NORMAL,
                    })
                )
            );
            showSuccess(
                notifyTargets.length === 1
                    ? 'Notification envoyée.'
                    : `Notification envoyée à ${notifyTargets.length} utilisateurs.`
            );
            setNotifyTargets([]);
            setNotifyForm({ title: '', message: '' });
        } catch (error) {
            console.error('Failed to send notification:', error);
            showError('Impossible d’envoyer la notification.');
        } finally {
            setNotifySending(false);
        }
    };

    const deleteUser = async (user) => {
        if (!user) return;
        if (user.id === currentUserId) {
            showError('Vous ne pouvez pas supprimer votre propre compte depuis cette page.');
            return;
        }
        const confirmed = await showConfirm(
            `Supprimer définitivement le compte de ${user.firstName || ''} ${user.lastName || ''} (${user.email || 'sans email'}) ? Cette action est irréversible.`,
            {
                type: 'danger',
                title: 'Supprimer l’utilisateur',
                confirmLabel: 'Supprimer',
                cancelLabel: 'Annuler',
            }
        );
        if (!confirmed) return;

        try {
            await requestAdminAction({ uid: user.id, action: 'delete' });
            showSuccess('L’utilisateur a été supprimé.');
        } catch (error) {
            console.error('Failed to delete user:', error);
            showError(error.message || 'Impossible de supprimer cet utilisateur.');
        }
    };

    const exportUsersCsv = (list) => {
        if (!list.length) return;
        const headers = ['ID', 'Prénom', 'Nom', 'Email', 'Filière', 'Année', 'Rôle', 'Email vérifié', 'Banni', 'Créé le'];
        const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const rows = list.map((user) => [
            user.id,
            user.firstName,
            user.lastName,
            user.email,
            user.filiere,
            user.startYear,
            user.role || 'student',
            user.verifiedEmail ? 'Oui' : 'Non',
            user.banned ? 'Oui' : 'Non',
            formatDate(user.createdAt),
        ]);
        const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showSuccess(`${list.length} utilisateur${list.length !== 1 ? 's' : ''} exporté${list.length !== 1 ? 's' : ''}.`);
    };

    const bulkDeleteUsers = async () => {
        const targets = users.filter((user) => selectedIds.includes(user.id) && user.id !== currentUserId);
        if (!targets.length) {
            showWarning('Aucun utilisateur sélectionné ne peut être supprimé.');
            return;
        }
        const confirmed = await showConfirm(
            `Supprimer définitivement ${targets.length} utilisateur${targets.length !== 1 ? 's' : ''} ? Cette action est irréversible.`,
            {
                type: 'danger',
                title: 'Supprimer les utilisateurs',
                confirmLabel: 'Supprimer',
                cancelLabel: 'Annuler',
            }
        );
        if (!confirmed) return;

        setBulkDeleting(true);
        try {
            const results = await Promise.allSettled(
                targets.map((target) => requestAdminAction({ uid: target.id, action: 'delete' }))
            );
            const failed = results.filter((result) => result.status === 'rejected').length;
            if (failed > 0) {
                showError(`${failed} suppression${failed !== 1 ? 's' : ''} sur ${targets.length} ont échoué.`);
            } else {
                showSuccess(`${targets.length} utilisateur${targets.length !== 1 ? 's' : ''} supprimé${targets.length !== 1 ? 's' : ''}.`);
            }
            setSelectedIds((ids) => ids.filter((id) => !targets.some((target) => target.id === id)));
        } catch (error) {
            console.error('Failed to bulk delete users:', error);
            showError('Impossible de supprimer les utilisateurs sélectionnés.');
        } finally {
            setBulkDeleting(false);
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]));
    };

    const openEditDialog = (user) => {
        setUserToEdit(user);
        setSimpleMode(true);
        setSimpleForm({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            filiere: user.filiere || '',
            startYear: user.startYear || '',
        });
        setEditFields(
            Object.entries(user)
                .filter(([key]) => key !== 'id' && key !== 'email')
                .map(([key, value]) => ({
                    id: `${key}-${Math.random()}`,
                    key,
                    value: JSON.stringify(value, null, 2) ?? 'null',
                    existing: true,
                }))
        );
    };

    const closeEditDialog = () => {
        if (savingUser) return;
        setUserToEdit(null);
        setEditFields([]);
        setSimpleMode(true);
    };

    const updateEditField = (fieldId, property, value) => {
        setEditFields((fields) =>
            fields.map((field) => field.id === fieldId ? { ...field, [property]: value } : field)
        );
    };

    const addEditField = () => {
        setEditFields((fields) => [
            ...fields,
            { id: `new-${Date.now()}-${fields.length}`, key: '', value: '""', existing: false },
        ]);
    };

    const removeEditField = (fieldId) => {
        setEditFields((fields) => fields.filter((field) => field.id !== fieldId));
    };

    const saveUser = async (event) => {
        event.preventDefault();
        if (!userToEdit) return;

        const payload = simpleMode
            ? {
                firstName: simpleForm.firstName.trim(),
                lastName: simpleForm.lastName.trim(),
                filiere: simpleForm.filiere.trim(),
                startYear: simpleForm.startYear.trim(),
            }
            : {};
        const keys = new Set();

        try {
            if (simpleMode) {
                if (!payload.firstName || !payload.lastName || !payload.filiere || !payload.startYear) {
                    throw new Error('Veuillez renseigner le prénom, le nom, la filière et l’année d’entrée.');
                }
            } else {
                editFields.forEach((field) => {
                    const key = field.key.trim();
                    if (!key || key.toLowerCase() === 'email') {
                        throw new Error('Chaque champ doit avoir un nom valide différent de « email ».');
                    }
                    if (/[.#$[\]/]/.test(key)) {
                        throw new Error(`Le nom « ${key} » contient un caractère interdit.`);
                    }
                    if (keys.has(key)) {
                        throw new Error(`Le champ « ${key} » est présent plusieurs fois.`);
                    }
                    keys.add(key);
                    payload[key] = JSON.parse(field.value);
                });
            }

            setSavingUser(true);
            await update(ref(db, `users/${userToEdit.id}`), payload);
            showSuccess('Les informations de l’utilisateur ont été mises à jour.');
            setUserToEdit(null);
            setEditFields([]);
        } catch (error) {
            console.error('Failed to update user:', error);
            showError(error instanceof SyntaxError
                ? 'Une valeur JSON est invalide. Vérifiez le champ concerné.'
                : error.message || 'Erreur lors de la mise à jour de l’utilisateur.');
        } finally {
            setSavingUser(false);
        }
    };

    // Derive unique filières dynamically from data
    const filiereOptions = useMemo(() => {
        const set = new Set(users.map((u) => u.filiere).filter(Boolean));
        return ['all', ...[...set].sort()];
    }, [users]);

    const filtered = useMemo(() => {
        let list = [...users];

        // Role filter
        if (roleFilter !== 'all') {
            list = list.filter((u) => {
                const role = (u.role || 'student').toLowerCase();
                return role === roleFilter;
            });
        }

        // Filière filter
        if (filiereFilter !== 'all') {
            list = list.filter((u) => (u.filiere || '') === filiereFilter);
        }

        // Verified email filter
        if (verifiedFilter === 'verified') {
            list = list.filter((u) => u.verifiedEmail === true);
        }

        // Search filter
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (u) =>
                    `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
                    (u.email || '').toLowerCase().includes(q) ||
                    (u.filiere || '').toLowerCase().includes(q)
            );
        }

        // Sort
        list.sort((a, b) => {
            if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
            if (sortBy === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
            if (sortBy === 'name_asc') return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
            if (sortBy === 'name_desc') return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
            return 0;
        });

        return list;
    }, [users, search, sortBy, roleFilter, filiereFilter, verifiedFilter]);

    const activeFilterCount = (roleFilter !== 'all' ? 1 : 0) + (filiereFilter !== 'all' ? 1 : 0) + (verifiedFilter !== 'all' ? 1 : 0);

    const filteredIds = filtered.map((user) => user.id);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
    const selectedUsers = users.filter((user) => selectedIds.includes(user.id));

    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            setSelectedIds((ids) => ids.filter((id) => !filteredIds.includes(id)));
        } else {
            setSelectedIds((ids) => [...new Set([...ids, ...filteredIds])]);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Utilisateurs</h1>
                    <p className="text-muted-foreground">
                        {filtered.length} membre{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}
                        {users.length !== filtered.length ? ` sur ${users.length}` : ''}
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-grow md:w-56">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Rechercher..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 h-9 text-sm"
                        />
                    </div>

                    {/* Role filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={`h-9 gap-1.5 shrink-0 ${roleFilter !== 'all' ? 'text-blue-600 border-blue-200 bg-blue-50/50 dark:text-blue-300 dark:border-blue-500/40 dark:bg-blue-500/10' : ''}`}>
                                <Users className="w-4 h-4" />
                                <span className="hidden sm:inline">
                                    {roleFilter === 'all'
                                        ? 'Rôle'
                                        : ROLE_OPTIONS.find((r) => r.value === roleFilter)?.label}
                                </span>
                                {activeFilterCount > 0 && (
                                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white font-bold">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Filtrer par rôle
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={roleFilter} onValueChange={setRoleFilter}>
                                {ROLE_OPTIONS.map((opt) => (
                                    <DropdownMenuRadioItem key={opt.value} value={opt.value} className={`text-sm cursor-pointer ${roleFilter === opt.value && opt.value !== 'all' ? 'text-blue-600 font-bold' : ''}`}>
                                        {opt.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Verified email filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={`h-9 gap-1.5 shrink-0 ${verifiedFilter !== 'all' ? 'text-blue-600 border-blue-200 bg-blue-50/50 dark:text-blue-300 dark:border-blue-500/40 dark:bg-blue-500/10' : ''}`}>
                                <ShieldCheck className="w-4 h-4" />
                                <span className="hidden sm:inline">
                                    {verifiedFilter === 'all' ? 'Vérification' : VERIFIED_OPTIONS.find((v) => v.value === verifiedFilter)?.label}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Filtrer par vérification
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={verifiedFilter} onValueChange={setVerifiedFilter}>
                                {VERIFIED_OPTIONS.map((opt) => (
                                    <DropdownMenuRadioItem key={opt.value} value={opt.value} className={`text-sm cursor-pointer ${verifiedFilter === opt.value && opt.value !== 'all' ? 'text-blue-600 font-bold' : ''}`}>
                                        {opt.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Filière filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={`h-9 gap-1.5 shrink-0 ${filiereFilter !== 'all' ? 'text-blue-600 border-blue-200 bg-blue-50/50 dark:text-blue-300 dark:border-blue-500/40 dark:bg-blue-500/10' : ''}`}>
                                <BookOpen className="w-4 h-4" />
                                <span className="hidden sm:inline truncate max-w-[100px]">
                                    {filiereFilter === 'all' ? 'Filière' : filiereFilter}
                                </span>
                                {filiereFilter !== 'all' && (
                                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white font-bold">
                                        1
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 max-h-72 overflow-y-auto">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Filtrer par filière
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={filiereFilter} onValueChange={setFiliereFilter}>
                                {filiereOptions.map((f) => (
                                    <DropdownMenuRadioItem key={f} value={f} className={`text-sm cursor-pointer ${filiereFilter === f && f !== 'all' ? 'text-blue-600 font-bold' : ''}`}>
                                        {f === 'all' ? 'Toutes les filières' : f}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Sort */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={`h-9 gap-1.5 shrink-0 ${sortBy !== 'newest' ? 'text-blue-600 border-blue-200 bg-blue-50/50 dark:text-blue-300 dark:border-blue-500/40 dark:bg-blue-500/10' : ''}`}>
                                <ArrowUpDown className="w-4 h-4" />
                                <span className="hidden sm:inline">
                                    {SORT_OPTIONS.find((s) => s.value === sortBy)?.label ?? 'Tri'}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Trier par
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                                {SORT_OPTIONS.map((opt) => (
                                    <DropdownMenuRadioItem key={opt.value} value={opt.value} className={`text-sm cursor-pointer ${sortBy === opt.value ? 'text-blue-600 font-bold' : ''}`}>
                                        {opt.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Reset filters */}
                    {(search || roleFilter !== 'all' || filiereFilter !== 'all' || verifiedFilter !== 'all' || sortBy !== 'newest') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0 dark:hover:bg-red-500/10"
                            onClick={() => { setSearch(''); setRoleFilter('all'); setFiliereFilter('all'); setVerifiedFilter('all'); setSortBy('newest'); }}
                        >
                            Réinitialiser
                        </Button>
                    )}
                </div>
            </div>

            {canEdit && selectedIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                    <span className="text-sm font-semibold">
                        {selectedIds.length} utilisateur{selectedIds.length !== 1 ? 's' : ''} sélectionné{selectedIds.length !== 1 ? 's' : ''}
                    </span>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => exportUsersCsv(selectedUsers)} className="gap-1.5">
                            <Download className="w-4 h-4" />
                            Exporter CSV
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openNotificationDialog(selectedUsers)} className="gap-1.5">
                            <Bell className="w-4 h-4" />
                            Notifier
                        </Button>
                        <Button size="sm" variant="destructive" onClick={bulkDeleteUsers} disabled={bulkDeleting} className="gap-1.5">
                            {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Supprimer
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                            Effacer
                        </Button>
                    </div>
                </div>
            )}

            {/* Table */}
            <Card className="border-none shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted">
                        <TableRow>
                            {canEdit && (
                                <TableHead className="w-10">
                                    <Checkbox
                                        checked={allFilteredSelected}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Sélectionner tous les utilisateurs affichés"
                                    />
                                </TableHead>
                            )}
                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Nom</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Email</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Filière</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Rôle</TableHead>
                            <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-12 text-muted-foreground text-sm">
                                    Aucun utilisateur ne correspond à votre recherche.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((u) => {
                                const isSelf = u.id === currentUserId;
                                return (
                                    <TableRow key={u.id} className="hover:bg-muted/50 transition-colors">
                                        {canEdit && (
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(u.id)}
                                                    onCheckedChange={() => toggleSelect(u.id)}
                                                    aria-label={`Sélectionner ${u.firstName || ''} ${u.lastName || ''}`}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div className="font-bold text-sm">{u.firstName} {u.lastName}</div>
                                            {isBanned(u) && (
                                                <Badge
                                                    variant="outline"
                                                    className="mt-1 text-[8px] font-black uppercase tracking-tighter bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/40"
                                                >
                                                    Banni
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                                        <TableCell className="text-xs font-bold uppercase">{u.filiere}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`text-[8px] font-black uppercase tracking-tighter ${ROLE_BADGE_CLASSES[(u.role || '').toLowerCase()] || 'bg-muted text-foreground border-border'}`}
                                            >
                                                {u.role || 'Étudiant'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        aria-label={`Actions pour ${u.firstName || ''} ${u.lastName || ''}`}
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56">
                                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                        Actions
                                                    </DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    {canEdit && (
                                                        <DropdownMenuItem onClick={() => openEditDialog(u)}>
                                                            <Pencil />
                                                            Modifier
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem asChild>
                                                        <a href={`/profile/${u.id}`} target="_blank" rel="noreferrer">
                                                            <ExternalLink />
                                                            Ouvrir le profil
                                                        </a>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => copyUserId(u.id)}>
                                                        <Copy />
                                                        Copier l’identifiant
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => copyEmail(u)}>
                                                        <Mail />
                                                        Copier l’email
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => copyProfileLink(u)}>
                                                        <Link2 />
                                                        Copier le lien du profil
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {canEdit && (
                                                        <DropdownMenuSub>
                                                            <DropdownMenuSubTrigger disabled={isSelf}>
                                                                <ShieldCheck />
                                                                Changer le rôle
                                                            </DropdownMenuSubTrigger>
                                                            <DropdownMenuSubContent>
                                                                {ASSIGNABLE_ROLES.map((role) => (
                                                                    <DropdownMenuItem
                                                                        key={role.value}
                                                                        disabled={(u.role || 'student') === role.value}
                                                                        onClick={() => changeUserRole(u, role.value)}
                                                                    >
                                                                        {role.label}
                                                                    </DropdownMenuItem>
                                                                ))}
                                                            </DropdownMenuSubContent>
                                                        </DropdownMenuSub>
                                                    )}
                                                    {canEdit && (
                                                        <DropdownMenuItem onClick={() => toggleEmailVerification(u)}>
                                                            <BadgeCheck />
                                                            {u.verifiedEmail ? 'Retirer la vérification' : 'Vérifier l’email'}
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem asChild>
                                                        <a href={`/messages/${u.id}`} target="_blank" rel="noreferrer">
                                                            <MessageSquare />
                                                            Envoyer un message
                                                        </a>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openNotificationDialog([u])}>
                                                        <Bell />
                                                        Envoyer une notification
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setActivityTarget(u)}>
                                                        <Clock />
                                                        Voir l’activité
                                                    </DropdownMenuItem>
                                                    {canEdit && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => sendPasswordReset(u)}>
                                                                <KeyRound />
                                                                Réinitialiser le mot de passe
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => sendVerificationEmail(u)}>
                                                                <MailCheck />
                                                                Envoyer l’email de vérification
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem disabled={isSelf} onClick={() => openBanDialog(u)}>
                                                                <Ban />
                                                                {isBanned(u) ? 'Débannir l’utilisateur' : 'Bannir l’utilisateur'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                disabled={isSelf}
                                                                onClick={() => deleteUser(u)}
                                                                className="text-red-600 focus:text-red-600 dark:text-red-400"
                                                            >
                                                                <Trash2 />
                                                                Supprimer l’utilisateur
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={Boolean(userToEdit)} onOpenChange={(open) => !open && closeEditDialog()}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-4 pr-8">
                            <DialogTitle>Modifier l’utilisateur</DialogTitle>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSimpleMode((mode) => !mode)}
                            >
                                {simpleMode ? 'Mode avancé' : 'Mode simplifié'}
                            </Button>
                        </div>
                        <DialogDescription>
                            Modifiez les données de {userToEdit?.firstName || ''} {userToEdit?.lastName || ''}.
                            L’adresse email est protégée et ne peut pas être modifiée ici.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={saveUser} className="space-y-4">
                        <div className="rounded-lg border bg-muted/40 p-3">
                            <p className="text-xs font-semibold text-muted-foreground">Email (lecture seule)</p>
                            <p className="mt-1 break-all text-sm">{userToEdit?.email || 'Aucun email renseigné'}</p>
                        </div>

                        {simpleMode ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label htmlFor="admin-user-first-name" className="text-sm font-medium">Prénom</label>
                                    <Input
                                        id="admin-user-first-name"
                                        value={simpleForm.firstName}
                                        onChange={(event) => setSimpleForm((form) => ({ ...form, firstName: event.target.value }))}
                                        placeholder="Prénom"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="admin-user-last-name" className="text-sm font-medium">Nom</label>
                                    <Input
                                        id="admin-user-last-name"
                                        value={simpleForm.lastName}
                                        onChange={(event) => setSimpleForm((form) => ({ ...form, lastName: event.target.value }))}
                                        placeholder="Nom"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="admin-user-filiere" className="text-sm font-medium">Filière</label>
                                    <Select
                                        value={simpleForm.filiere}
                                        onValueChange={(value) => setSimpleForm((form) => ({ ...form, filiere: value }))}
                                    >
                                        <SelectTrigger id="admin-user-filiere">
                                            <SelectValue placeholder="Sélectionnez une filière..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {staticDb.fields.map((field) => (
                                                <SelectItem key={field.id} value={field.id}>
                                                    {field.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="admin-user-start-year" className="text-sm font-medium">Année d’entrée</label>
                                    <Input
                                        id="admin-user-start-year"
                                        type="number"
                                        min="2000"
                                        max="2100"
                                        value={simpleForm.startYear}
                                        onChange={(event) => setSimpleForm((form) => ({ ...form, startYear: event.target.value }))}
                                        placeholder="2025"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3">
                                    {editFields.map((field) => (
                                        <div key={field.id} className="rounded-lg border p-3">
                                            <div className="mb-2 flex items-center gap-2">
                                        <Input
                                            value={field.key}
                                            onChange={(event) => updateEditField(field.id, 'key', event.target.value)}
                                            placeholder="Nom du champ"
                                            aria-label="Nom du champ"
                                            disabled={field.existing}
                                            className="font-medium"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeEditField(field.id)}
                                            disabled={field.existing}
                                            aria-label={`Supprimer ${field.key || 'ce champ'}`}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                            </div>
                                            <Textarea
                                                value={field.value}
                                                onChange={(event) => updateEditField(field.id, 'value', event.target.value)}
                                                aria-label={`Valeur de ${field.key || 'ce champ'}`}
                                                className="min-h-20 font-mono text-xs"
                                                spellCheck="false"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <Button type="button" variant="outline" onClick={addEditField} className="w-full gap-2">
                                    <Plus className="h-4 w-4" />
                                    Ajouter un champ
                                </Button>

                                <p className="text-xs text-muted-foreground">
                                    Les valeurs doivent être du JSON valide : texte entre guillemets, nombres, true/false,
                                    null, objets ou tableaux. Une valeur null supprime le champ dans Firebase.
                                </p>
                            </>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeEditDialog} disabled={savingUser}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={savingUser}>
                                {savingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enregistrer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(banTarget)} onOpenChange={(open) => !open && !banSaving && setBanTarget(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {isBanned(banTarget) ? 'Débannir l’utilisateur' : 'Bannir l’utilisateur'}
                        </DialogTitle>
                        <DialogDescription>
                            {banTarget?.firstName || ''} {banTarget?.lastName || ''} ({banTarget?.email || 'sans email'})
                        </DialogDescription>
                    </DialogHeader>

                    {isBanned(banTarget) ? (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Ce compte est actuellement désactivé. La réactivation permettra à l’utilisateur de se reconnecter.
                            </p>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setBanTarget(null)} disabled={banSaving}>
                                    Annuler
                                </Button>
                                <Button type="button" onClick={submitBan} disabled={banSaving}>
                                    {banSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Réactiver le compte
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="ban-reason" className="text-sm font-medium">Motif</label>
                                <Textarea
                                    id="ban-reason"
                                    value={banForm.reason}
                                    onChange={(event) => setBanForm((form) => ({ ...form, reason: event.target.value }))}
                                    placeholder="Expliquez la raison du bannissement..."
                                    className="min-h-20"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="ban-duration" className="text-sm font-medium">Durée</label>
                                <Select
                                    value={banForm.duration}
                                    onValueChange={(value) => setBanForm((form) => ({ ...form, duration: value }))}
                                >
                                    <SelectTrigger id="ban-duration">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BAN_DURATIONS.map((duration) => (
                                            <SelectItem key={duration.value} value={duration.value}>
                                                {duration.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setBanTarget(null)} disabled={banSaving}>
                                    Annuler
                                </Button>
                                <Button type="button" variant="destructive" onClick={submitBan} disabled={banSaving}>
                                    {banSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Bannir
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={notifyTargets.length > 0} onOpenChange={(open) => !open && !notifySending && setNotifyTargets([])}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Envoyer une notification</DialogTitle>
                        <DialogDescription>
                            {notifyTargets.length === 1
                                ? `Destinataire : ${notifyTargets[0]?.firstName || ''} ${notifyTargets[0]?.lastName || ''}`
                                : `${notifyTargets.length} destinataires`}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={(event) => { event.preventDefault(); submitNotification(); }} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="notification-title" className="text-sm font-medium">Titre</label>
                            <Input
                                id="notification-title"
                                value={notifyForm.title}
                                onChange={(event) => setNotifyForm((form) => ({ ...form, title: event.target.value }))}
                                placeholder="Titre de la notification"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="notification-message" className="text-sm font-medium">Message</label>
                            <Textarea
                                id="notification-message"
                                value={notifyForm.message}
                                onChange={(event) => setNotifyForm((form) => ({ ...form, message: event.target.value }))}
                                placeholder="Contenu de la notification..."
                                className="min-h-24"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setNotifyTargets([])} disabled={notifySending}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={notifySending || !notifyForm.title.trim() || !notifyForm.message.trim()}>
                                {notifySending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Envoyer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(activityTarget)} onOpenChange={(open) => !open && setActivityTarget(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Activité de l’utilisateur</DialogTitle>
                        <DialogDescription>
                            {activityTarget?.firstName || ''} {activityTarget?.lastName || ''} — {activityTarget?.email || 'sans email'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <InfoItem label="Identifiant" value={activityTarget?.id} />
                        <InfoItem label="Rôle" value={activityTarget?.role || 'Étudiant'} />
                        <InfoItem label="Filière" value={activityTarget?.filiere} />
                        <InfoItem label="Année d’entrée" value={activityTarget?.startYear} />
                        <InfoItem label="Inscrit le" value={formatDate(activityTarget?.createdAt)} />
                        <InfoItem label="Dernière mise à jour" value={formatDate(activityTarget?.updatedAt)} />
                        <InfoItem label="Email vérifié le" value={formatDate(activityTarget?.verifiedAt)} />
                        <InfoItem
                            label="Statut"
                            value={isBanned(activityTarget)
                                ? (activityTarget?.bannedUntil ? `Banni jusqu’au ${formatDate(activityTarget.bannedUntil)}` : 'Banni définitivement')
                                : 'Actif'}
                        />
                        <InfoItem label="Contributions" value={String(countEntries(activityTarget?.contributions))} />
                        <InfoItem label="Projets" value={String(countEntries(activityTarget?.projectBriefs))} />
                        <InfoItem label="Soumissions" value={String(countEntries(activityTarget?.projectSubmissions))} />
                        <InfoItem label="Vitrines" value={String(countEntries(activityTarget?.projectShowcases))} />
                        <InfoItem
                            label="Abonnement"
                            value={activityTarget?.subscription?.type
                                ? `${activityTarget.subscription.type}${activityTarget.subscription.expiresAt ? ` (jusqu’au ${formatDate(activityTarget.subscription.expiresAt)})` : ''}`
                                : 'Aucun'}
                        />
                        <InfoItem label="Motif du bannissement" value={activityTarget?.banReason} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setActivityTarget(null)}>
                            Fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
