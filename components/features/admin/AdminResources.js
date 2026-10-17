import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { logModeratorAction } from '@/lib/moderator-logs';
import { useDialog } from '@/context/DialogContext';
import { db, ref, update, remove, get, push, set } from '@/lib/firebase';
import Link from 'next/link';
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
import { Search, CheckCircle2, Eye, Trash2, Edit2, Loader2, Link2, Star, MessageCircle, Mail, ExternalLink, ArrowUpDown, BookOpen, Layers, Image as ImageIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
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
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import RejectionDialog from './RejectionDialog';
import { sendPrivateNotification, NOTIF_TYPES } from '@/lib/notifications';
import { db as staticDb, getModulesForField } from '@/lib/data';
import { Checkbox } from '@/components/ui/checkbox';

const SORT_OPTIONS = [
    { value: 'newest', label: 'Plus récents' },
    { value: 'oldest', label: 'Plus anciens' },
    { value: 'name_asc', label: 'Nom (A → Z)' },
    { value: 'name_desc', label: 'Nom (Z → A)' },
];

export default function AdminResources({ resources }) {
    const { user, profile } = useAuth();
    const { showSuccess, showError } = useDialog();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [filiereFilter, setFiliereFilter] = useState('all');
    const [moduleFilter, setModuleFilter] = useState('all');
    const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
    const [itemToReject, setItemToReject] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejecting, setRejecting] = useState(false);

    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState(null);
    const [editData, setEditData] = useState({
        title: '',
        description: '',
        professor: '',
        docType: ''
    });
    const [saving, setSaving] = useState(false);
    const [professors, setProfessors] = useState([]);
    const [isProfAutreOpen, setIsProfAutreOpen] = useState(false);
    const [customProfName, setCustomProfName] = useState('');
    const [profAutreError, setProfAutreError] = useState('');
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [itemToLink, setItemToLink] = useState(null);
    const [selectedFields, setSelectedFields] = useState([]);
    const [contactModalOpen, setContactModalOpen] = useState(false);
    const [itemToContact, setItemToContact] = useState(null);
    const [contactMessage, setContactMessage] = useState('');
    const [sendingContactEmail, setSendingContactEmail] = useState(false);
    const [contactError, setContactError] = useState('');

    // Ratings state (admin-only view of user feedback)
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [itemToRate, setItemToRate] = useState(null);
    const [currentRatings, setCurrentRatings] = useState([]);

    // Preview Modal State
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewResource, setPreviewResource] = useState(null);
    const [previewTab, setPreviewTab] = useState('auto');
    const [previewUploading, setPreviewUploading] = useState(false);
    const [previewError, setPreviewError] = useState('');

    useEffect(() => {
        if (!db) return;
        let cancelled = false;
        const fetchProfessors = async () => {
            try {
                const snapshot = await get(ref(db, 'metadata/professors'));
                if (!cancelled && snapshot.exists()) {
                    const data = snapshot.val();
                    const profList = Array.isArray(data) ? data : (data.professors || Object.values(data));
                    setProfessors(profList);
                }
            } catch (error) {
                console.error("Error fetching professors:", error);
            }
        };
        fetchProfessors();
        return () => { cancelled = true; };
    }, []);

    const professorNames = professors.map(p => typeof p === 'string' ? p : p.name);

    const isCustomProf = Boolean(editData.professor)
        && editData.professor !== 'non-specifie'
        && !professorNames.includes(editData.professor);

    const openProfAutrePopup = () => {
        setCustomProfName(isCustomProf ? editData.professor : '');
        setProfAutreError('');
        setIsProfAutreOpen(true);
    };

    const handleProfAutreSubmit = (e) => {
        e.preventDefault();
        const name = customProfName.trim();
        if (!name) {
            setProfAutreError('Veuillez saisir le nom du professeur.');
            return;
        }
        const existing = professorNames.find(p => p.toLowerCase() === name.toLowerCase());
        setEditData(prev => ({ ...prev, professor: existing || name }));
        setIsProfAutreOpen(false);
        setCustomProfName('');
        setProfAutreError('');
    };

    const userRole = profile?.role || 'student';
    const userFiliere = profile?.filiere || '';

    const canSeeResource = (resource) => {
        if (userRole === 'admin') return true;
        if (userRole === 'moderator') {
            if (resource.field === userFiliere) return true;
            if (resource.fields && Array.isArray(resource.fields)) {
                return resource.fields.some(link => link.fieldId === userFiliere);
            }
            return false;
        }
        return false;
    };

    const allowedResources = resources.filter(canSeeResource);

    const filiereOptions = useMemo(() => {
        const set = new Set();
        allowedResources.forEach(r => {
            if (r.field) set.add(r.field);
            if (r.fields && Array.isArray(r.fields)) {
                r.fields.forEach(f => f.fieldId && set.add(f.fieldId));
            }
        });
        return ['all', ...Array.from(set)].sort();
    }, [allowedResources]);

    const moduleOptions = useMemo(() => {
        const set = new Set();
        allowedResources.forEach(r => {
            if (r.module) set.add(r.module);
        });
        return ['all', ...Array.from(set)].sort();
    }, [allowedResources]);

    const filteredResources = useMemo(() => {
        let list = [...allowedResources];

        if (filiereFilter !== 'all') {
            list = list.filter(r => {
                if (r.field === filiereFilter) return true;
                if (r.fields && Array.isArray(r.fields)) {
                    return r.fields.some(f => f.fieldId === filiereFilter);
                }
                return false;
            });
        }

        if (moduleFilter !== 'all') {
            list = list.filter(r => r.module === moduleFilter);
        }

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            list = list.filter(r =>
                r.title?.toLowerCase().includes(q) ||
                r.module?.toLowerCase().includes(q)
            );
        }

        list.sort((a, b) => {
            if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
            if (sortBy === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
            if (sortBy === 'name_asc') return (a.title || '').localeCompare(b.title || '');
            if (sortBy === 'name_desc') return (b.title || '').localeCompare(a.title || '');
            return 0;
        });

        return list;
    }, [allowedResources, searchTerm, sortBy, filiereFilter, moduleFilter]);

    const getResourcePath = (resource) => {
        if (resource._isNested && resource.moduleId) {
            return `resources/${resource.moduleId}/${resource.id}`;
        }
        return `resources/${resource.id}`;
    };

    const openRatingModal = async (resource) => {
        setItemToRate(resource);
        setRatingModalOpen(true);

        try {
            const ratingsRef = ref(db, `resources/${resource.id}/ratings`);
            const snap = await get(ratingsRef);

            if (snap.exists()) {
                const data = snap.val();
                const list = Object.entries(data).map(([userId, value]) => ({
                    userId,
                    ...value,
                }));

                // Sort newest first
                list.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
                setCurrentRatings(list);
            } else {
                setCurrentRatings([]);
            }
        } catch (err) {
            console.error('Failed to load ratings', err);
            setCurrentRatings([]);
        }
    };

    const handleApproveResource = async (resource) => {
        try {
            // Determine the path based on the flag we set in the listener
            let path = `resources/${resource.id}`;
            if (resource._isNested && resource.moduleId) {
                path = `resources/${resource.moduleId}/${resource.id}`;
            }
            await update(ref(db, path), { unverified: null });

            // Sync with user profile if authorId exists
            if (resource.authorId) {
                const profileContribPath = `users/${resource.authorId}/contributions/${resource.id}`;
                await update(ref(db, profileContribPath), { unverified: null });

                // Send Resource Approved Email
                try {
                    // Fetch user email first
                    const userSnap = await get(ref(db, `users/${resource.authorId}`));
                    if (userSnap.exists()) {
                        const userData = userSnap.val();
                        if (userData.email) {
                            const { resourceApprovedEmail } = await import('@/lib/email-templates');
                            const resourceUrl = `https://estt.ma/resource/${resource.id}`;
                            const html = resourceApprovedEmail(userData.firstName || 'Étudiant', resource.title, resourceUrl);

                            await fetch('/api/send-email', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    to: userData.email,
                                    subject: 'Ta ressource est en ligne !',
                                    html: html
                                })
                            });
                        }
                    }
                } catch (err) {
                    console.error("Failed to send resource approval email:", err);
                }

                // Send in-app notification
                await sendPrivateNotification(resource.authorId, {
                    type: NOTIF_TYPES.RESOURCE,
                    title: 'Ressource Approuvée',
                    message: `Votre contribution "${resource.title}" a été validée et est maintenant en ligne.`,
                    icon: 'book-open',
                    action: { type: 'navigate', target: `/resource/${resource.id}` }
                });
            }


            showSuccess("Ressource approuvée !");

            // Log the action
            logModeratorAction(user?.uid, 'accept', {
                resourceId: resource.id,
                title: resource.title,
                authorId: resource.authorId
            });

        } catch (err) {
            console.error(err);
            showError("Erreur lors de l'approbation.");
        }
    };

    const handleDeleteResource = (resource) => {
        setItemToReject(resource);
        setRejectionReason('');
        setRejectionModalOpen(true);
    };

    const confirmRejection = async () => {
        if (!itemToReject) return;
        setRejecting(true);

        const resource = itemToReject;
        const reason = rejectionReason;

        try {
            let path = `resources/${resource.id}`;
            if (resource._isNested && resource.moduleId) {
                path = `resources/${resource.moduleId}/${resource.id}`;
            }

            await remove(ref(db, path));

            // Sync with user profile if authorId exists
            if (resource.authorId) {
                const profileContribPath = `users/${resource.authorId}/contributions/${resource.id}`;
                await remove(ref(db, profileContribPath));

                // Send Resource Rejected Email
                try {
                    // Fetch user email first
                    const userSnap = await get(ref(db, `users/${resource.authorId}`));
                    if (userSnap.exists()) {
                        const userData = userSnap.val();
                        if (userData.email) {
                            const { resourceRejectedEmail } = await import('@/lib/email-templates');
                            const html = resourceRejectedEmail(userData.firstName || 'Étudiant', resource.title, reason);

                            await fetch('/api/send-email', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    to: userData.email,
                                    subject: 'Mise à jour concernant ta contribution',
                                    html: html
                                })
                            });
                        }
                    }
                } catch (err) {
                    console.error("Failed to send resource rejection email:", err);
                }

                // Send in-app notification
                await sendPrivateNotification(resource.authorId, {
                    type: NOTIF_TYPES.RESOURCE,
                    title: 'Mise à jour contribution',
                    message: `Votre ressource "${resource.title}" n'a pas pu être acceptée. Raison: ${reason}`,
                    icon: 'x-circle',
                    priority: 'high'
                });
            }


            // Cleanup Keywords
            if (resource.field) {
                const keywordPath = `metadata/keywords/${resource.field}/${resource.id}`;
                await remove(ref(db, keywordPath));
            }
            // Log the action
            logModeratorAction(user?.uid, 'deletion', {
                resourceId: resource.id,
                title: resource.title,
                authorId: resource.authorId,
                reason: reason
            });
            // toast success?

        } catch (err) {
            console.error(err);
            showError("Une erreur est survenue lors du rejet.");
        } finally {
            setRejecting(false);
            setRejectionModalOpen(false);
            setItemToReject(null);
        }
    };

    const handleEditResource = (resource) => {
        setItemToEdit(resource);
        setEditData({
            title: resource.title || '',
            description: resource.description || '',
            professor: resource.professor || '',
            docType: resource.docType || ''
        });
        setEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!itemToEdit) return;
        setSaving(true);
        try {
            const changes = [];
            if (editData.title !== itemToEdit.title) changes.push({ label: 'Titre', old: itemToEdit.title || 'Non spécifié', new: editData.title });
            if (editData.description !== itemToEdit.description) changes.push({ label: 'Description', old: itemToEdit.description || 'Non spécifié', new: editData.description });
            if (editData.professor !== itemToEdit.professor) changes.push({ label: 'Professeur', old: itemToEdit.professor || 'Non spécifié', new: editData.professor });
            if (editData.docType !== itemToEdit.docType) changes.push({ label: 'Type de document', old: itemToEdit.docType || 'Non spécifié', new: editData.docType });

            let path = `resources/${itemToEdit.id}`;
            if (itemToEdit._isNested && itemToEdit.moduleId) {
                path = `resources/${itemToEdit.moduleId}/${itemToEdit.id}`;
            }

            await update(ref(db, path), editData);

            // Notify Contributor
            if (itemToEdit.authorId) {
                try {
                    // 1. Send In-App Notification
                    const changeDescription = changes.length > 0
                        ? `Modifications: ${changes.map(c => c.label).join(', ')}.`
                        : '';

                    await sendPrivateNotification(itemToEdit.authorId, {
                        type: NOTIF_TYPES.RESOURCE,
                        title: 'Ressource Mise à Jour',
                        message: `Votre contribution "${editData.title}" a été mise à jour par un administrateur. ${changeDescription}`,
                        icon: 'edit-3',
                        action: { type: 'navigate', target: `/resource/${itemToEdit.id}` }
                    });

                    // 2. Send Email Notification
                    const userSnap = await get(ref(db, `users/${itemToEdit.authorId}`));
                    if (userSnap.exists()) {
                        const userData = userSnap.val();
                        if (userData.email) {
                            const { resourceUpdatedEmail } = await import('@/lib/email-templates');
                            const resourceUrl = `https://estt.ma/resource/${itemToEdit.id}`;
                            const html = resourceUpdatedEmail(
                                userData.firstName || 'Étudiant',
                                editData.title,
                                resourceUrl,
                                changes
                            );

                            await fetch('/api/send-email', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    to: userData.email,
                                    subject: 'Ta ressource a été mise à jour',
                                    html: html
                                })
                            });
                        }
                    }
                } catch (notifErr) {
                    console.error("Failed to notify contributor of update:", notifErr);
                }
            }

            // Sync with keywords if field exists
            if (itemToEdit.field) {
                const keywordPath = `metadata/keywords/${itemToEdit.field}/${itemToEdit.id}`;
                await update(ref(db, keywordPath), { title: editData.title });
            }

            // Sync with user profile if authorId exists
            if (itemToEdit.authorId) {
                const profileContribPath = `users/${itemToEdit.authorId}/contributions/${itemToEdit.id}`;
                await update(ref(db, profileContribPath), {
                    title: editData.title
                });
            }

            // Log the action
            logModeratorAction(user?.uid, 'modification', {
                resourceId: itemToEdit.id,
                title: editData.title,
                changes: changes.map(c => ({
                    field: c.label,
                    old: c.old,
                    new: c.new
                }))
            });

            setEditModalOpen(false);

            setItemToEdit(null);
        } catch (err) {
            console.error(err);
            showError("Erreur lors de la mise à jour.");
        } finally {
            setSaving(false);
        }
    };

    const handleLinkResource = (resource) => {
        setItemToLink(resource);
        // Initialize with existing links or empty
        // Structure: [{ fieldId: 'ai', moduleId: 'ai_m1' }, ...]
        const existingLinks = resource.fields || [];
        setSelectedFields(existingLinks);
        setLinkModalOpen(true);
    };

    const handleSaveLinks = async () => {
        if (!itemToLink) return;
        setSaving(true);
        try {
            let path = `resources/${itemToLink.id}`;
            if (itemToLink._isNested && itemToLink.moduleId) {
                path = `resources/${itemToLink.moduleId}/${itemToLink.id}`;
            }

            // 1. Update the resource itself with the new fields structure
            await update(ref(db, path), { fields: selectedFields });

            // 2. Update keywords and module mappings for ALL linked fields
            for (const link of selectedFields) {
                if (!link.fieldId || !link.moduleId) continue;

                // Index by Field for Search
                const keywordRef = ref(db, `metadata/keywords/${link.fieldId}/${itemToLink.id}`);
                await update(keywordRef, { title: itemToLink.title, resourceId: itemToLink.id });

                // Index by Module for Browse
                const moduleMappingRef = ref(db, `module_resources/${link.moduleId}/${itemToLink.id}`);
                await set(moduleMappingRef, true);
            }

            setLinkModalOpen(false);
            setItemToLink(null);
        } catch (err) {
            console.error(err);
            showError("Erreur lors de la liaison des filières.");
        } finally {
            setSaving(false);
        }
    };

    const openContactModal = (resource) => {
        setItemToContact(resource);
        setContactMessage('');
        setContactError('');
        setContactModalOpen(true);
    };

    const openPreviewModal = (resource) => {
        setPreviewResource(resource);
        setPreviewTab('auto');
        setPreviewError('');
        setPreviewModalOpen(true);
    };

    const [generatedPreview, setGeneratedPreview] = useState(null);

    const handleGeneratePreview = async () => {
        setPreviewUploading(true);
        setPreviewError('');
        try {
            if (!previewResource) throw new Error('Ressource non sélectionnée');
            const fileUrl = previewResource.url || previewResource.link || previewResource.file;
            if (!fileUrl) throw new Error('Aucun fichier source');
            const res = await fetch('/api/generate-preview-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileUrl }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Échec de la génération');
            setGeneratedPreview(data.previewDataUrl);
            setPreviewError('');
        } catch (err) {
            setPreviewError(err.message);
        } finally {
            setPreviewUploading(false);
        }
    };

    const handleConfirmPreview = async () => {
        if (!generatedPreview || !previewResource) return;
        setPreviewUploading(true);
        setPreviewError('');
        try {
            // Convert base64 to blob and upload to ImgBB
            const base64Data = generatedPreview.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteArrays = [];
            for (let i = 0; i < byteCharacters.length; i += 512) {
                const slice = byteCharacters.slice(i, i + 512);
                const byteNumbers = new Array(slice.length);
                for (let j = 0; j < slice.length; j++) {
                    byteNumbers[j] = slice.charCodeAt(j);
                }
                byteArrays.push(new Uint8Array(byteNumbers));
            }
            const blob = new Blob(byteArrays, { type: 'image/png' });
            
            // Upload to ImgBB
            const formData = new FormData();
            formData.append('image', blob);
            
            const uploadRes = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData,
            });
            const uploadData = await uploadRes.json();
            if (!uploadData.success) throw new Error(uploadData.error?.message || 'ImgBB upload failed');
            
            // Save to RTDB
            const apiRes = await fetch('/api/admin/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'upload',
                    resourceId: previewResource.id,
                    previewImageUrl: uploadData.data.url,
                }),
            });
            const apiData = await apiRes.json();
            if (!apiRes.ok) throw new Error(apiData.error || 'Failed to save preview');

            showSuccess('Aperçu enregistré !');
            setGeneratedPreview(null);
            setPreviewModalOpen(false);
        } catch (err) {
            setPreviewError(err.message);
        } finally {
            setPreviewUploading(false);
        }
    };

    const handleManualPreviewUpload = async (file) => {
        setPreviewUploading(true);
        setPreviewError('');
        try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error?.message);

            const apiRes = await fetch('/api/admin/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'upload',
                    resourceId: previewResource.id,
                    previewImageUrl: data.data.url,
                }),
            });
            const apiData = await apiRes.json();
            if (!apiRes.ok) throw new Error(apiData.error || 'Failed to save preview');

            showSuccess('Image uploadée !');
            setPreviewModalOpen(false);
        } catch (err) {
            setPreviewError(err.message);
        } finally {
            setPreviewUploading(false);
        }
    };

    const handleDeletePreview = async () => {
        try {
            const apiRes = await fetch('/api/admin/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', resourceId: previewResource.id }),
            });
            const apiData = await apiRes.json();
            if (!apiRes.ok) throw new Error(apiData.error || 'Failed to delete preview');
            showSuccess('Aperçu supprimé');
            setPreviewModalOpen(false);
        } catch (err) {
            setPreviewError(err.message);
        }
    };

    const handleSendContactEmail = async () => {
        if (!itemToContact) return;

        const trimmedMessage = contactMessage.trim();
        if (!trimmedMessage) {
            setContactError("Ecris un message avant d'envoyer l'email.");
            return;
        }

        if (!itemToContact.authorId) {
            setContactError("Cette ressource n'est pas liee a un contributeur identifiable.");
            return;
        }

        setSendingContactEmail(true);
        setContactError('');

        try {
            const userSnap = await get(ref(db, `users/${itemToContact.authorId}`));
            if (!userSnap.exists()) {
                throw new Error('Impossible de retrouver le contributeur de cette ressource.');
            }

            const userData = userSnap.val();
            if (!userData.email) {
                throw new Error("Aucune adresse email n'est disponible pour ce contributeur.");
            }

            const now = Date.now();
            const authorName = itemToContact.authorName
                || `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
                || 'Etudiant';

            let threadId = itemToContact.contactThreadId || null;

            if (!threadId) {
                const newThreadRef = push(ref(db, 'resourceContactThreads'));
                threadId = newThreadRef.key;

                await set(newThreadRef, {
                    id: threadId,
                    resourceId: itemToContact.id,
                    resourceTitle: itemToContact.title || 'Ressource',
                    resourceModule: itemToContact.fullModuleName || itemToContact.module || '',
                    resourceStatus: itemToContact.unverified ? 'pending' : 'accepted',
                    authorId: itemToContact.authorId,
                    authorName,
                    authorEmail: userData.email,
                    status: 'awaiting_user',
                    lastSender: 'admin',
                    createdAt: now,
                    updatedAt: now,
                    lastMessagePreview: trimmedMessage.slice(0, 180),
                });
            } else {
                await update(ref(db, `resourceContactThreads/${threadId}`), {
                    resourceTitle: itemToContact.title || 'Ressource',
                    resourceModule: itemToContact.fullModuleName || itemToContact.module || '',
                    resourceStatus: itemToContact.unverified ? 'pending' : 'accepted',
                    authorId: itemToContact.authorId,
                    authorName,
                    authorEmail: userData.email,
                    status: 'awaiting_user',
                    lastSender: 'admin',
                    updatedAt: now,
                    lastMessagePreview: trimmedMessage.slice(0, 180),
                });
            }

            const newMessageRef = push(ref(db, `resourceContactThreads/${threadId}/messages`));
            await set(newMessageRef, {
                id: newMessageRef.key,
                senderType: 'admin',
                senderName: 'Administration ESTT Community',
                body: trimmedMessage,
                createdAt: now,
            });

            await update(ref(db, getResourcePath(itemToContact)), {
                contactThreadId: threadId,
                contactThreadUpdatedAt: now,
                lastAdminContactAt: now,
            });

            await update(ref(db, `users/${itemToContact.authorId}/contributions/${itemToContact.id}`), {
                contactThreadId: threadId,
                contactThreadUpdatedAt: now,
            });

            const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://estt.ma';
            const replyUrl = `${baseUrl}/resource-contact/${threadId}`;

            const { resourceContactRequestEmail } = await import('@/lib/email-templates');
            const html = resourceContactRequestEmail(
                userData.firstName || 'Etudiant',
                itemToContact.title || 'Ressource',
                trimmedMessage,
                replyUrl,
                itemToContact.unverified ? 'en attente de validation' : 'deja acceptee'
            );

            // Log the action
            logModeratorAction(user?.uid, 'contact', {
                resourceId: itemToContact.id,
                title: itemToContact.title,
                authorId: itemToContact.authorId,
                roomId: threadId
            });

            await fetch('/api/send-email', {

                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: userData.email,
                    subject: `Question concernant ta ressource : ${itemToContact.title || 'Ressource'}`,
                    html
                })
            });

            await sendPrivateNotification(itemToContact.authorId, {
                type: NOTIF_TYPES.RESOURCE,
                title: 'Question sur ta ressource',
                message: `Un administrateur t'a envoye une question a propos de "${itemToContact.title}".`,
                icon: 'mail',
                priority: 'high',
                action: { type: 'navigate', target: `/resource-contact/${threadId}` }
            });

            setContactModalOpen(false);
            setItemToContact(null);
            setContactMessage('');
        } catch (err) {
            console.error(err);
            setContactError(err.message || "Impossible d'envoyer l'email de contact.");
        } finally {
            setSendingContactEmail(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Gestion des Ressources</h1>
                    <p className="text-muted-foreground">
                        {filteredResources.length} ressource{filteredResources.length !== 1 ? 's' : ''} trouvée{filteredResources.length !== 1 ? 's' : ''}
                        {allowedResources.length !== filteredResources.length ? ` sur ${allowedResources.length}` : ''}
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-grow md:w-56">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-9 text-sm"
                        />
                    </div>

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

                    {/* Module filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={`h-9 gap-1.5 shrink-0 ${moduleFilter !== 'all' ? 'text-blue-600 border-blue-200 bg-blue-50/50 dark:text-blue-300 dark:border-blue-500/40 dark:bg-blue-500/10' : ''}`}>
                                <Layers className="w-4 h-4" />
                                <span className="hidden sm:inline truncate max-w-[100px]">
                                    {moduleFilter === 'all' ? 'Module' : moduleFilter}
                                </span>
                                {moduleFilter !== 'all' && (
                                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white font-bold">
                                        1
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 max-h-72 overflow-y-auto">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Filtrer par module
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={moduleFilter} onValueChange={setModuleFilter}>
                                {moduleOptions.map((m) => (
                                    <DropdownMenuRadioItem key={m} value={m} className={`text-sm cursor-pointer ${moduleFilter === m && m !== 'all' ? 'text-blue-600 font-bold' : ''}`}>
                                        {m === 'all' ? 'Tous les modules' : m}
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

                    {/* Reset */}
                    {(searchTerm || filiereFilter !== 'all' || moduleFilter !== 'all' || sortBy !== 'newest') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0 dark:hover:bg-red-500/10"
                            onClick={() => { setSearchTerm(''); setFiliereFilter('all'); setModuleFilter('all'); setSortBy('newest'); }}
                        >
                            Réinitialiser
                        </Button>
                    )}
                </div>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Titre</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Module</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Type</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Auteur</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Note</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest">Statut</TableHead>
                            <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredResources.map((res) => (
                            <TableRow key={res.id} className="hover:bg-muted/50 transition-colors">
                                <TableCell className="font-bold text-sm">{res.title}</TableCell>
                                <TableCell className="text-xs text-muted-foreground font-medium uppercase" title={res.fullModuleName || res.module}>
                                    {res.fullModuleName || res.module}
                                </TableCell>
                                <TableCell>
                                    {res.docType && <Badge variant="secondary" className="text-[9px] font-bold">{res.docType}</Badge>}
                                </TableCell>
                                <TableCell className="text-xs font-bold">{res.authorName || 'Anonyme'}</TableCell>
                                <TableCell>
                                    {(() => {
                                        const average = res.ratingAverage;
                                        const count = res.ratingCount || 0;
                                        if (!average || count === 0) {
                                            return <span className="text-[10px] text-muted-foreground">Aucune note</span>;
                                        }
                                        const rounded = Math.round(average * 10) / 10;
                                        return (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            className={`w-3 h-3 ${star <= Math.round(average) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {rounded.toFixed(1)} / 5 · {count} avis
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </TableCell>
                                <TableCell>
                                    {res.unverified ? (
                                        <Badge variant="destructive" className="text-[10px] font-bold uppercase whitespace-nowrap">En attente</Badge>
                                    ) : (
                                        <Badge className="text-[10px] font-bold uppercase whitespace-nowrap border-transparent bg-emerald-600 text-white hover:bg-emerald-600">Vérifié</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        {res.unverified && (
                                            <Button size="sm" variant="outline" className="h-8 px-2 text-green-600 border-green-100 hover:bg-green-50 dark:text-green-300 dark:border-green-500/40 dark:hover:bg-green-500/10" onClick={() => handleApproveResource(res)}>
                                                <CheckCircle2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button size="sm" variant="outline" className="h-8 px-2 text-primary border-primary/10 hover:bg-primary/5" onClick={() => handleEditResource(res)}>
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-8 px-2 text-primary border-primary/10 hover:bg-primary/5" onClick={() => handleLinkResource(res)} title="Lier à d'autres filières">
                                            <Link2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-2 text-sky-600 border-sky-100 hover:bg-sky-50 dark:text-sky-300 dark:border-sky-500/40 dark:hover:bg-sky-500/10"
                                            onClick={() => openContactModal(res)}
                                            title="Contacter le contributeur"
                                        >
                                            <Mail className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-2 text-purple-600 border-purple-100 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-500/40 dark:hover:bg-purple-500/10"
                                            onClick={() => openPreviewModal(res)}
                                            title="Gérer l'aperçu"
                                        >
                                            <ImageIcon className="w-4 h-4" />
                                        </Button>
                                        {res.contactThreadId && (
                                            <Button size="sm" variant="outline" className="h-8 px-2" asChild title="Ouvrir la room">
                                                <Link href={`/resource-contact/${res.contactThreadId}`} target="_blank">
                                                    <ExternalLink className="w-4 h-4" />
                                                </Link>
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-2 text-amber-600 border-amber-100 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-500/40 dark:hover:bg-amber-500/10"
                                            onClick={() => openRatingModal(res)}
                                            title="Voir les avis des étudiants"
                                        >
                                            <Star className="w-4 h-4" />
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-8 px-2" asChild>
                                            <a href={res.url || res.link || res.file} target="_blank"><Eye className="w-4 h-4" /></a>
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-8 px-2 text-destructive border-destructive/10 hover:bg-destructive/5" onClick={() => handleDeleteResource(res)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            <RejectionDialog
                open={rejectionModalOpen}
                onOpenChange={setRejectionModalOpen}
                onConfirm={confirmRejection}
                isSubmitting={rejecting}
                reason={rejectionReason}
                setReason={setRejectionReason}
            />

            {/* Rating Modal (admin-only, shows user feedback) */}
            <Dialog open={ratingModalOpen} onOpenChange={setRatingModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Notation de la ressource</DialogTitle>
                        <DialogDescription>
                            Attribuez une note (1 à 5 étoiles) et laissez un avis interne visible uniquement par les administrateurs.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        {itemToRate && (
                            <div className="rounded-lg border bg-muted px-4 py-3">
                                <p className="text-sm font-semibold">{itemToRate.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {itemToRate.module} {itemToRate.docType ? `· ${itemToRate.docType}` : ''}
                                </p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                                    Avis des étudiants (privé)
                                </p>
                            </div>
                            {currentRatings.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    Aucun avis enregistré pour cette ressource.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                    {currentRatings.map((r) => (
                                        <div
                                            key={`${r.userId}-${r.updatedAt || r.createdAt || ''}`}
                                            className="border rounded-lg px-3 py-2 bg-muted"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold">
                                                        {r.userName || r.adminName || 'Utilisateur'}
                                                    </span>
                                                    <div className="flex items-center gap-0.5">
                                                        {[1, 2, 3, 4, 5].map((value) => (
                                                            <Star
                                                                key={value}
                                                                className={`w-3 h-3 ${value <= (r.rating || 0)
                                                                    ? 'text-yellow-500 fill-yellow-500'
                                                                    : 'text-muted-foreground'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                {r.updatedAt && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(r.updatedAt).toLocaleDateString('fr-FR')}
                                                    </span>
                                                )}
                                            </div>
                                            {r.review && (
                                                <p className="text-xs text-foreground whitespace-pre-wrap">
                                                    {r.review}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRatingModalOpen(false)}
                        >
                            Fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Modifier la ressource</DialogTitle>
                        <DialogDescription>
                            Mettez à jour les informations de la ressource.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Titre</Label>
                            <Input
                                id="title"
                                value={editData.title}
                                onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="professor">Professeur</Label>
                            <Select
                                value={editData.professor}
                                onValueChange={(v) => {
                                    if (v === '__autre__') {
                                        openProfAutrePopup();
                                        return;
                                    }
                                    if (v === '') return;
                                    setEditData(prev => ({ ...prev, professor: v }));
                                }}
                            >
                                <SelectTrigger id="professor">
                                    <SelectValue placeholder="Sélectionnez un professeur" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="non-specifie">Non spécifié</SelectItem>
                                    {professors.map((p, index) => {
                                        const name = typeof p === 'string' ? p : p.name;
                                        return (
                                            <SelectItem key={index} value={name}>
                                                {name} {p.department ? `— ${p.department}` : ''}
                                            </SelectItem>
                                        );
                                    })}
                                    {isCustomProf && (
                                        <SelectItem value={editData.professor}>
                                            {editData.professor}
                                        </SelectItem>
                                    )}
                                    <SelectItem value="__autre__">Autre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="docType">Type de document</Label>
                            <Select
                                value={editData.docType}
                                onValueChange={(v) => setEditData(prev => ({ ...prev, docType: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir le type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cours">Cours</SelectItem>
                                    <SelectItem value="TD">TD</SelectItem>
                                    <SelectItem value="TP">TP</SelectItem>
                                    <SelectItem value="Exam">Examen</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={editData.description}
                                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={saving}>
                            Annuler
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* "Autre" professor popup */}
            <Dialog
                open={isProfAutreOpen}
                onOpenChange={(open) => {
                    setIsProfAutreOpen(open);
                    if (!open) {
                        setProfAutreError('');
                        setCustomProfName('');
                    }
                }}
            >
                <DialogContent overlayClassName="backdrop-blur-sm" className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Autre professeur</DialogTitle>
                        <DialogDescription>
                            Saisissez le nom du professeur. Il apparaîtra sur la ressource comme les autres noms de la liste.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleProfAutreSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="custom-prof">Nom du professeur *</Label>
                            <Input
                                id="custom-prof"
                                autoFocus
                                value={customProfName}
                                onChange={(e) => {
                                    setCustomProfName(e.target.value);
                                    if (profAutreError) setProfAutreError('');
                                }}
                                placeholder="Ex: Pr. Aboubakr EL HAMMOUMI"
                            />
                            {profAutreError && (
                                <p className="text-xs text-destructive">{profAutreError}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsProfAutreOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit">Valider</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Link Modal */}
            <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Lier à d&apos;autres filières</DialogTitle>
                        <DialogDescription>
                            Sélectionnez toutes les filières où cette ressource doit apparaître.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-1 gap-3">
                            {staticDb.fields.map((field) => {
                                const isSelected = selectedFields.some(f => f.fieldId === field.id);
                                const currentModuleId = selectedFields.find(f => f.fieldId === field.id)?.moduleId || '';

                                const fieldModules = getModulesForField(field.id);
                                const selectedLink = selectedFields.find(f => f.fieldId === field.id);
                                const currentSemester = selectedLink?.semester
                                    || fieldModules.find(m => m.id === currentModuleId)?.semester
                                    || '';

                                return (
                                    <div key={field.id} className="space-y-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`field-${field.id}`}
                                                checked={isSelected || field.id === itemToLink?.field}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedFields(prev => [...prev, { fieldId: field.id, semester: '', moduleId: '' }]);
                                                    } else {
                                                        setSelectedFields(prev => prev.filter(f => f.fieldId !== field.id));
                                                    }
                                                }}
                                                disabled={field.id === itemToLink?.field}
                                            />
                                            <label
                                                htmlFor={`field-${field.id}`}
                                                className="text-sm font-bold leading-none cursor-pointer flex-grow"
                                            >
                                                {field.name}
                                                {field.id === itemToLink?.field && <span className="ml-2 text-[10px] text-primary italic">(Source)</span>}
                                            </label>
                                        </div>

                                        {isSelected && (
                                            <div className="pl-6 animate-in slide-in-from-top-2 duration-200">
                                                <Label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Semestre et module équivalents</Label>
                                                <Select
                                                    value={currentSemester}
                                                    onValueChange={(val) => {
                                                        setSelectedFields(prev => prev.map(f =>
                                                            f.fieldId === field.id ? { ...f, semester: val, moduleId: '' } : f
                                                        ));
                                                    }}
                                                >
                                                    <SelectTrigger className="h-9 text-xs bg-card mb-2">
                                                        <SelectValue placeholder="Choisir le semestre" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Array.from(new Set(fieldModules.map(m => m.semester))).map(semester => (
                                                            <SelectItem key={semester} value={semester}>{semester}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Select
                                                    value={currentModuleId}
                                                    onValueChange={(val) => {
                                                        setSelectedFields(prev => prev.map(f =>
                                                            f.fieldId === field.id ? { ...f, moduleId: val } : f
                                                        ));
                                                    }}
                                                >
                                                    <SelectTrigger className="h-9 text-xs bg-card">
                                                        <SelectValue placeholder="Choisir le module" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {fieldModules.filter(m => !currentSemester || m.semester === currentSemester).map(m => (
                                                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLinkModalOpen(false)} disabled={saving}>
                            Annuler
                        </Button>
                        <Button onClick={handleSaveLinks} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Enregistrer les liaisons
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Contacter le contributeur</DialogTitle>
                        <DialogDescription>
                            Ecris ton message. Une room sera creee automatiquement et un lien de reponse sera envoye par email au contributeur.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {itemToContact && (
                            <div className="rounded-xl border bg-muted p-4">
                                <p className="font-semibold text-foreground">{itemToContact.title}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {itemToContact.fullModuleName || itemToContact.module || 'Module non specifie'}
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Statut: {itemToContact.unverified ? 'En attente de validation' : 'Acceptee'}
                                </p>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="contact-message">Message admin</Label>
                            <Textarea
                                id="contact-message"
                                rows={6}
                                placeholder="Explique clairement ce que tu souhaites demander."
                                value={contactMessage}
                                onChange={(e) => setContactMessage(e.target.value)}
                            />
                        </div>

                        {contactError && (
                            <p className="text-sm text-destructive">{contactError}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setContactModalOpen(false)} disabled={sendingContactEmail}>
                            Annuler
                        </Button>
                        <Button onClick={handleSendContactEmail} disabled={sendingContactEmail}>
                            {sendingContactEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                            Envoyer l&apos;email
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Modal */}
            <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Image de couverture</DialogTitle>
                        <DialogDescription>
                            Ressource: {previewResource?.title}
                        </DialogDescription>
                    </DialogHeader>
                    {!previewResource ? (
                        <div className="space-y-4 py-4 text-center text-muted-foreground">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                            <p>Chargement de la ressource...</p>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            {/* Current preview */}
                            {previewResource?.previewImageUrl && (
                                <div className="relative aspect-video rounded-lg overflow-hidden border">
                                    <Image
                                        src={previewResource.previewImageUrl}
                                        alt="Current preview"
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                                        Source: {previewResource.previewSource}
                                    </div>
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="flex gap-2">
                                <button
                                    className={`px-3 py-1 rounded text-sm ${previewTab === 'auto' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                                    onClick={() => setPreviewTab('auto')}
                                >
                                    Automatique
                                </button>
                                <button
                                    className={`px-3 py-1 rounded text-sm ${previewTab === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                                    onClick={() => setPreviewTab('manual')}
                                >
                                    Manuelle (ImgBB)
                                </button>
                            </div>

                            {/* Auto tab */}
                            {previewTab === 'auto' && (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Génère un aperçu depuis la première page du document.
                                    </p>
                                    {generatedPreview ? (
                                        <>
                                            <div className="relative aspect-video rounded-lg overflow-hidden border">
                                                <Image
                                                    src={generatedPreview}
                                                    alt="Generated preview"
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <Button
                                                onClick={handleConfirmPreview}
                                                disabled={previewUploading}
                                            >
                                                {previewUploading ? 'Enregistrement...' : 'Enregistrer'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setGeneratedPreview(null)}
                                                disabled={previewUploading}
                                            >
                                                Annuler
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                onClick={handleGeneratePreview}
                                                disabled={previewUploading || !previewResource || !(previewResource.url || previewResource.link || previewResource.file)}
                                            >
                                                {previewUploading ? 'Génération...' : 'Générer'}
                                            </Button>
                                        </>
                                    )}
                                    {previewError && <p className="text-sm text-destructive">{previewError}</p>}
                                </div>
                            )}

                            {/* Manual tab */}
                            {previewTab === 'manual' && (
                                <div className="space-y-3">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) handleManualPreviewUpload(file);
                                        }}
                                        className="w-full"
                                    />
                                    {previewError && <p className="text-sm text-destructive">{previewError}</p>}
                                </div>
                            )}

                            {/* Clear button if preview exists */}
                            {previewResource?.previewImageUrl && (
                                <Button
                                    variant="destructive"
                                    onClick={handleDeletePreview}
                                >
                                    Supprimer l aperçu
                                </Button>
                            )}
</div>
                    )}

                    <DialogFooter>
                        {generatedPreview && previewTab === 'auto' && (
                            <Button
                                onClick={handleConfirmPreview}
                                disabled={previewUploading}
                            >
                                {previewUploading ? 'Enregistrement...' : 'Enregistrer'}
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => { setGeneratedPreview(null); setPreviewModalOpen(false); }}>
                            Fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
