'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, ref, get, set, push, update, remove, runTransaction, onValue } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText, Video, Image as ImageIcon, Link as LinkIcon, Download, ExternalLink, User, Share2, GraduationCap, Play, MessageCircle, Send, X, Flag, AlertTriangle, Star, Bookmark, Eye, Globe, ListPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Link from 'next/link';

export default function ResourcePage() {
    const params = useParams();
    const router = useRouter();
    const { resourceId } = params;
    const { user, profile } = useAuth();
    const { showWarning, showError, showSuccess } = useDialog();

    const [resource, setResource] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [commentText, setCommentText] = useState('');
    const [replyTexts, setReplyTexts] = useState({});
    const [expandedReplies, setExpandedReplies] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Reporting state
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
    const [reportReason, setReportReason] = useState('spam');
    const [reportDetails, setReportDetails] = useState('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    // Rating state (per-user rating + optional private review)
    const [userRating, setUserRating] = useState(0);
    const [userReview, setUserReview] = useState('');
    const [isLoadingRating, setIsLoadingRating] = useState(false);
    const [isSavingRating, setIsSavingRating] = useState(false);

    // View count state
    const [viewCount, setViewCount] = useState(null);

    // Favorites state
    const [isFavorite, setIsFavorite] = useState(false);
    const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

    useEffect(() => {
        if (resourceId) {
            fetchResource();
            fetchComments();
            // Load persisted view count
            const loadViewCount = async () => {
                try {
                    const vcRef = ref(db, `resourceViews/${resourceId}/viewCount`);
                    const snap = await get(vcRef);
                    if (snap.exists()) setViewCount(snap.val());
                } catch (_) {}
            };
            loadViewCount();
        }
    }, [resourceId]);

    useEffect(() => {
        if (resourceId && user) {
            fetchUserRating();
        }
    }, [resourceId, user]);

    // Track views and notify Slack every 10 views milestone
    const hasTrackedView = useState(false);
    useEffect(() => {
        const trackView = async () => {
            if (!resource || hasTrackedView[0]) return;
            hasTrackedView[1](true);

            try {
                // Get user IP first for anonymous tracking/uniqueness
                let userIp = '127.0.0.1';
                try {
                    const ipRes = await fetch('/api/utils/ip');
                    if (ipRes.ok) {
                        const ipData = await ipRes.json();
                        userIp = ipData.ip;
                    }
                } catch (ipErr) {
                    console.error('Failed to fetch IP:', ipErr);
                }

                // 1. Fetch existing views to check for duplicates/abuse
                const viewsRef = ref(db, `resourceViews/${resourceId}/views`);
                const snapshot = await get(viewsRef);
                const allViews = snapshot.exists() ? Object.values(snapshot.val()) : [];

                // 2. Filter for views by the current user OR same IP (for anonymous) in the last hour
                const oneHourAgo = Date.now() - 3600000;
                const userId = user?.uid || 'anonymous';
                
                const recentUserView = allViews.find(v => {
                    // Match by UID if logged in
                    if (userId !== 'anonymous' && v.uid === userId) return v.viewedAt > oneHourAgo;
                    // Match by IP if anonymous (or cross-check IP for all)
                    return v.ip === userIp && v.viewedAt > oneHourAgo;
                });

                if (recentUserView) {
                    return;
                }

                // 3. Record this new view in Firebase
                const newViewRef = push(viewsRef);
                const viewData = {
                    uid: userId,
                    ip: userIp,
                    email: user?.email || 'anonymous',
                    name: userId === 'anonymous' 
                        ? `Anonyme (${userIp})`
                        : (profile?.displayName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || user?.email || 'Étudiant'),
                    viewedAt: Date.now(),
                };
                await set(newViewRef, viewData);

                // 4. Increment persistent view counter atomically (never reset)
                const viewCountRef = ref(db, `resourceViews/${resourceId}/viewCount`);
                const txResult = await runTransaction(viewCountRef, (current) => (current || 0) + 1);
                if (txResult.committed) setViewCount(txResult.snapshot.val());

                // 5. Count total views in the current batch
                const updatedTotalViews = allViews.length + 1;

                // 5. Notify Slack only on every 10th view milestone
                if (updatedTotalViews >= 10) {
                    const latestBatch = [...allViews, viewData];
                    const last10 = latestBatch
                        .sort((a, b) => (b.viewedAt || 0) - (a.viewedAt || 0))
                        .slice(0, 10);

                    const { notifySlack, SLACK_CHANNELS } = await import('@/lib/slack');
                    await notifySlack(SLACK_CHANNELS.COMMUNITY, {
                        title: `🎯 Milestone : 10 nouvelles vues sur une ressource`,
                        resource: {
                            id: resource.id,
                            title: resource.title,
                            type: resource.type,
                        },
                        totalViews: updatedTotalViews,
                        last10Viewers: last10.map((v) => ({
                            name: v.name,
                            email: v.email,
                            ip: v.ip,
                            viewedAt: new Date(v.viewedAt).toLocaleString('fr-FR'),
                        })),
                    });

                    // Clear views after notification to reset counter to 0
                    await remove(viewsRef);
                }
            } catch (err) {
                console.error('Failed to track resource view or send Slack notification:', err);
            }
        };

        if (resource) {
            trackView();
        }
    }, [resource, user, profile]);

    useEffect(() => {
        if (!user || !resourceId || !db) {
            setIsFavorite(false);
            return;
        }

        const favRef = ref(db, `userFavorites/${user.uid}/${resourceId}`);
        const unsubscribe = onValue(favRef, (snapshot) => {
            setIsFavorite(snapshot.exists());
        });

        return () => unsubscribe();
    }, [user, resourceId, db]);

    const fetchResource = async () => {
        try {
            const resourceRef = ref(db, `resources/${resourceId}`);
            const snapshot = await get(resourceRef);

            if (snapshot.exists()) {
                const data = snapshot.val();
                // Check if verified - admins might view unverified via this link too, but general public shouldn't?
                // For now, we'll display it, assuming the link is shared only when approved or by admin.
                setResource({ id: resourceId, ...data });
            } else {
                setError('Ressource introuvable');
            }
        } catch (err) {
            console.error(err);
            setError('Erreur lors du chargement de la ressource');
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const commentsRef = ref(db, `resources/${resourceId}/comments`);
            const snapshot = await get(commentsRef);

            if (snapshot.exists()) {
                const commentsData = snapshot.val();
                const commentsList = [];

                // Convert comments object to array and organize with replies
                Object.entries(commentsData).forEach(([id, comment]) => {
                    commentsList.push({ id, ...comment });
                });

                // Sort by timestamp (newest first)
                commentsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

                setComments(commentsList);
            } else {
                setComments([]);
            }
        } catch (err) {
            console.error('Error fetching comments:', err);
            setComments([]);
        }
    };

    const fetchUserRating = async () => {
        if (!user) return;
        try {
            setIsLoadingRating(true);
            const ratingRef = ref(db, `resources/${resourceId}/ratings/${user.uid}`);
            const snapshot = await get(ratingRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                setUserRating(data.rating || 0);
                setUserReview(data.review || '');
            } else {
                setUserRating(0);
                setUserReview('');
            }
        } catch (err) {
            console.error('Error fetching user rating:', err);
        } finally {
            setIsLoadingRating(false);
        }
    };

    const getResourceIcon = (type) => {
        switch (type) {
            case 'pdf': return <FileText className="w-12 h-12 text-primary" />;
            case 'video': return <Video className="w-12 h-12 text-primary" />;
            case 'image': return <ImageIcon className="w-12 h-12 text-primary" />;
            case 'link': return <LinkIcon className="w-12 h-12 text-primary" />;
            case 'html': return <Globe className="w-12 h-12 text-primary" />;
            default: return <FileText className="w-12 h-12 text-primary" />;
        }
    };

    const ensureProtocol = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        return `https://${url}`;
    };

    const getYouTubeEmbedUrl = (url) => {
        if (!url) return null;

        // Handle playlist
        const playlistMatch = url.match(/[?&]list=([^#\&\?]+)/);
        if (playlistMatch && playlistMatch[1]) {
            return `https://www.youtube.com/embed/videoseries?list=${playlistMatch[1]}`;
        }

        // Handle video
        const videoMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (videoMatch && videoMatch[1]) {
            return `https://www.youtube.com/embed/${videoMatch[1]}`;
        }

        return null;
    };

    const getGoogleWorkspaceEmbedUrl = (url) => {
        if (!url) return null;

        // Match general Google Docs/Sheets/Slides/Forms formats
        // Typically: https://docs.google.com/document/d/FILE_ID/edit
        // We want to replace /edit, /view, etc. with /preview
        const googleDocsRegex = /(https:\/\/docs\.google\.com\/(?:document|spreadsheets|presentation|forms)\/d\/[a-zA-Z0-9-_]+)\/(?:edit|view|copy)?(.*)?/i;

        const match = url.match(googleDocsRegex);
        if (match && match[1]) {
            return `${match[1]}/preview`;
        }

        // Handle drive folder/file sharing links (some can be previewed)
        const driveRegex = /(https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9-_]+)\/(?:edit|view)?(.*)?/i;
        const driveMatch = url.match(driveRegex);
        if (driveMatch && driveMatch[1]) {
            return `${driveMatch[1]}/preview`;
        }

        return null;
    };

    const isPdfUrl = (url) => {
        if (!url) return false;
        // Check if URL contains .pdf (ignoring query params)
        try {
            const urlObj = new URL(url);
            return urlObj.pathname.toLowerCase().endsWith('.pdf');
        } catch (e) {
            return url.toLowerCase().includes('.pdf');
        }
    };

    const getFieldName = (fieldCode) => {
        return fieldCode?.toUpperCase() || 'N/A';
    };

    const formatCommentDate = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'À l\'instant';
        if (diffMins < 60) return `Il y a ${diffMins}m`;
        if (diffHours < 24) return `Il y a ${diffHours}h`;
        if (diffDays < 7) return `Il y a ${diffDays}j`;
        return date.toLocaleDateString('fr-FR');
    };

    const getParentComments = () => {
        return comments.filter(comment => !comment.isReply);
    };

    const getReplies = (parentId) => {
        return comments.filter(comment => comment.parentId === parentId);
    };

    const handleAddComment = async () => {
        if (!user) {
            showWarning('Veuillez vous connecter pour commenter');
            return;
        }

        if (!commentText.trim()) {
            alert('Le commentaire ne peut pas être vide');
            return;
        }

        try {
            setSubmitting(true);
            const commentsRef = ref(db, `resources/${resourceId}/comments`);
            const newCommentRef = push(commentsRef);

            await set(newCommentRef, {
                text: commentText,
                authorId: user.uid,
                authorName: profile?.displayName || user.email || 'Anonyme',
                timestamp: Date.now(),
                isReply: false
            });

            setCommentText('');
            // Optionally refresh comments
            fetchComments();
        } catch (err) {
            console.error('Error posting comment:', err);
            showError('Erreur lors de la publication du commentaire');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddReply = async (parentId) => {
        if (!user) {
            showWarning('Veuillez vous connecter pour répondre');
            return;
        }

        const replyText = replyTexts[parentId];
        if (!replyText?.trim()) {
            showWarning('La réponse ne peut pas être vide');
            return;
        }

        try {
            setSubmitting(true);
            const commentsRef = ref(db, `resources/${resourceId}/comments`);
            const newReplyRef = push(commentsRef);

            await set(newReplyRef, {
                text: replyText,
                authorId: user.uid,
                authorName: profile?.displayName || user.email || 'Anonyme',
                timestamp: Date.now(),
                isReply: true,
                parentId: parentId
            });

            setReplyTexts(prev => ({ ...prev, [parentId]: '' }));
            setExpandedReplies(prev => ({ ...prev, [parentId]: false }));
            // Optionally refresh comments
            fetchComments();
        } catch (err) {
            console.error('Error posting reply:', err);
            showError('Erreur lors de la publication de la réponse');
        } finally {
            setSubmitting(false);
        }
    };

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            showSuccess('Lien copié dans le presse-papiers !');
        } catch (err) {
            console.error('Failed to copy link: ', err);
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = window.location.href;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showSuccess('Lien copié dans le presse-papiers !');
            } catch (fallbackErr) {
                console.error('Fallback copy failed', fallbackErr);
            }
            document.body.removeChild(textArea);
        }
    };

    const handleReportSubmit = async () => {
        if (!user) {
            showWarning('Veuillez vous connecter pour signaler une ressource');
            return;
        }

        try {
            setIsSubmittingReport(true);
            const reportsRef = ref(db, 'reports');
            const newReportRef = push(reportsRef);

            let finalReason = reportReason;
            if (reportReason === 'other') {
                finalReason = `Autre: ${reportDetails}`;
            }

            await set(newReportRef, {
                resourceId: resourceId,
                resourceTitle: resource.title,
                reporterId: user.uid,
                reporterName: profile?.displayName || user.email || 'Anonyme',
                reason: finalReason,
                timestamp: Date.now(),
                status: 'pending'
            });

            setIsReportDialogOpen(false);
            setReportReason('spam');
            setReportDetails('');
            showSuccess('Signalement envoyé avec succès. Merci pour votre aide !');
        } catch (err) {
            console.error('Error submitting report:', err);
            showError('Erreur lors de lenvoi du signalement.');
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const handleToggleFavorite = async () => {
        if (!user) {
            showWarning('Connectez-vous pour ajouter cette ressource à votre liste.');
            return;
        }

        try {
            setIsTogglingFavorite(true);
            const favRef = ref(db, `userFavorites/${user.uid}/${resourceId}`);

            if (isFavorite) {
                await remove(favRef);
                setIsFavorite(false);
            } else {
                await set(favRef, {
                    resourceId,
                    title: resource.title || '',
                    type: resource.type || '',
                    docType: resource.docType || '',
                    field: resource.field || null,
                    moduleId: resource.moduleId || resource.module || null,
                    semester: resource.semester || null,
                    professor: resource.professor || '',
                    createdAt: Date.now(),
                });
                setIsFavorite(true);
            }
        } catch (err) {
            console.error('Error toggling favorite:', err);
            showError('Erreur lors de la mise à jour de votre liste.');
        } finally {
            setIsTogglingFavorite(false);
        }
    };

    const handleSaveRating = async () => {
        if (!user) {
            showWarning('Veuillez vous connecter pour noter cette ressource');
            return;
        }

        if (!userRating || userRating < 1 || userRating > 5) {
            showWarning('Veuillez choisir une note entre 1 et 5 étoiles.');
            return;
        }

        try {
            setIsSavingRating(true);
            const ratingRef = ref(db, `resources/${resourceId}/ratings/${user.uid}`);
            const now = Date.now();

            await set(ratingRef, {
                rating: userRating,
                review: userReview || '',
                userId: user.uid,
                userName: profile?.displayName || user.email || 'Utilisateur',
                updatedAt: now,
                createdAt: now,
            });

            // Recompute average and count
            const allRatingsRef = ref(db, `resources/${resourceId}/ratings`);
            const snap = await get(allRatingsRef);

            let avg = userRating;
            let count = 1;

            if (snap.exists()) {
                const data = snap.val();
                const values = Object.values(data);
                count = values.length;
                avg = values.reduce((sum, r) => sum + (r.rating || 0), 0) / count;
            }

            const roundedAvg = Math.round(avg * 10) / 10;

            // Persist denormalized fields
            const resourceRef = ref(db, `resources/${resourceId}`);
            await update(resourceRef, {
                ratingAverage: roundedAvg,
                ratingCount: count,
            });

            // Update local resource state so UI reflects latest numbers
            setResource((prev) => prev ? { ...prev, ratingAverage: roundedAvg, ratingCount: count } : prev);

            showSuccess('Votre note a bien été enregistrée. Merci pour votre retour !');
        } catch (err) {
            console.error('Error saving rating:', err);
            showError('Erreur lors de lenregistrement de votre note.');
        } finally {
            setIsSavingRating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !resource) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-xl text-muted-foreground">{error || 'Introuvable'}</p>
                <Button asChild>
                    <Link href="/browse">Parcourir les ressources</Link>
                </Button>
            </div>
        );
    }

    const downloadUrl = ensureProtocol(resource.url || resource.link || resource.file);

    return (
        <main className="min-h-screen bg-muted/50 py-8 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center w-full">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        ← Retour
                    </Button>

                    <div className="flex items-center gap-1 sm:gap-2">
                        {user && (
                            <Button
                                variant={isFavorite ? 'default' : 'ghost'}
                                size="sm"
                                onClick={handleToggleFavorite}
                                disabled={isTogglingFavorite}
                                className={`gap-1 sm:gap-2 transition-colors ${!isFavorite ? 'text-muted-foreground hover:text-primary' : ''}`}
                            >
                                {isTogglingFavorite ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ListPlus
                                        className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`}
                                    />
                                )}
                                <span className="hidden sm:inline">
                                    {isFavorite ? 'Ajouté à ma liste' : 'Ajouter à ma liste'}
                                </span>
                            </Button>
                        )}

                        <Button variant="ghost" size="sm" onClick={handleShare} className="text-muted-foreground hover:text-primary gap-1 sm:gap-2 transition-colors">
                            <Share2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Partager</span>
                        </Button>

                        {user && (
                            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-2 transition-colors">
                                        <Flag className="w-4 h-4" />
                                        <span>Signaler</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-destructive">
                                            <AlertTriangle className="w-5 h-5" />
                                            Signaler cette ressource
                                        </DialogTitle>
                                        <DialogDescription>
                                            Pourquoi signalez-vous "{resource.title}" ? Notre équipe examinera ce contenu.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="py-4">
                                        <RadioGroup value={reportReason} onValueChange={setReportReason} className="space-y-3">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="spam" id="spam" />
                                                <Label htmlFor="spam">Spam ou contenu promotionnel</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="inappropriate" id="inappropriate" />
                                                <Label htmlFor="inappropriate">Contenu inapproprié ou offensant</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="copyright" id="copyright" />
                                                <Label htmlFor="copyright">Violation des droits d'auteur</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="irrelevant" id="irrelevant" />
                                                <Label htmlFor="irrelevant">Document hors sujet ou incorrect</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="broken_link" id="broken_link" />
                                                <Label htmlFor="broken_link">Le lien est cassé ou introuvable</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="other" id="other" />
                                                <Label htmlFor="other">Autre raison</Label>
                                            </div>
                                        </RadioGroup>

                                        {reportReason === 'other' && (
                                            <div className="mt-4">
                                                <Label htmlFor="details" className="mb-2 block text-sm">Précisez votre raison</Label>
                                                <Textarea
                                                    id="details"
                                                    placeholder="Décrivez le problème..."
                                                    value={reportDetails}
                                                    onChange={(e) => setReportDetails(e.target.value)}
                                                    className="min-h-[80px]"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsReportDialogOpen(false)} disabled={isSubmittingReport}>
                                            Annuler
                                        </Button>
                                        <Button variant="destructive" onClick={handleReportSubmit} disabled={isSubmittingReport || (reportReason === 'other' && !reportDetails.trim())}>
                                            {isSubmittingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                            Envoyer le signalement
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                <Card className="shadow-sm border-0 rounded-2xl overflow-hidden">
                    <CardHeader className="pb-4">
                        <div className="space-y-4">
                            <div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <Badge variant="outline" className="text-xs">
                                        {resource.type.toUpperCase()}
                                    </Badge>
                                    {resource.docType && (
                                        <Badge variant="secondary" className="text-xs">
                                            {resource.docType}
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="text-2xl font-bold mb-2">
                                    {resource.title}
                                </CardTitle>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                    {resource.professor && (
                                        <span>Prof. {resource.professor}</span>
                                    )}
                                    {resource.createdAt && (
                                        <span>{new Date(resource.createdAt).toLocaleDateString('fr-FR')}</span>
                                    )}
                                    {viewCount !== null && (
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Eye className="w-3 h-3" />
                                            {viewCount.toLocaleString('fr-FR')} vue{viewCount > 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {resource.ratingAverage && resource.ratingCount > 0 && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map((value) => (
                                                    <Star
                                                        key={value}
                                                        className={`w-3 h-3 ${value <= Math.round(resource.ratingAverage) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="ml-1">
                                                {Math.round(resource.ratingAverage * 10) / 10} ({resource.ratingCount})
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="py-6 space-y-6">
                        {resource.description && (
                            <div className="text-sm text-foreground leading-relaxed">
                                {resource.description}
                            </div>
                        )}

                        {getYouTubeEmbedUrl(downloadUrl) && (
                            <div className="aspect-video w-full rounded-lg overflow-hidden border shadow-sm">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={getYouTubeEmbedUrl(downloadUrl)}
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        )}

                        {!getYouTubeEmbedUrl(downloadUrl) && isPdfUrl(downloadUrl) && (
                            <div className="w-full h-[60vh] sm:h-[600px] md:h-[700px] rounded-xl overflow-hidden border shadow-sm bg-muted transition-all hover:shadow-md">
                                <object
                                    data={downloadUrl}
                                    type="application/pdf"
                                    width="100%"
                                    height="100%"
                                >
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={downloadUrl}
                                        title="PDF viewer"
                                        frameBorder="0"
                                    >
                                        <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground bg-muted/50">
                                            <FileText className="w-12 h-12 mb-3 text-muted-foreground" />
                                            <p className="mb-4">Votre navigateur ne supporte pas l'affichage direct des PDF.</p>
                                            <Button asChild>
                                                <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                                                    <Download className="w-4 h-4" />
                                                    Téléchargez le PDF
                                                </a>
                                            </Button>
                                        </div>
                                    </iframe>
                                </object>
                            </div>
                        )}

                        {!getYouTubeEmbedUrl(downloadUrl) && !isPdfUrl(downloadUrl) && getGoogleWorkspaceEmbedUrl(downloadUrl) && (
                            <div className="w-full h-[60vh] sm:h-[600px] md:h-[700px] rounded-xl overflow-hidden border shadow-sm bg-muted transition-all hover:shadow-md">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={getGoogleWorkspaceEmbedUrl(downloadUrl)}
                                    title="Google Workspace viewer"
                                    frameBorder="0"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        )}

                        {/* Fallback for generic links (Not YouTube, Not PDF, Not Google Workspace) */}
                        {downloadUrl && !getYouTubeEmbedUrl(downloadUrl) && !isPdfUrl(downloadUrl) && !getGoogleWorkspaceEmbedUrl(downloadUrl) && resource.type === 'link' && (
                            <div className="border rounded-xl p-5 sm:p-6 bg-muted hover:bg-muted/80 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-4 shadow-sm hover:shadow-md mt-6">
                                <div className="flex items-start sm:items-center gap-4 w-full sm:w-auto">
                                    <div className="p-3 bg-primary/10 rounded-full text-primary shrink-0 mt-1 sm:mt-0">
                                        <LinkIcon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-foreground mb-1 text-base sm:text-lg">Lien externe</h4>
                                        <p className="text-sm text-muted-foreground truncate w-full max-w-[200px] xs:max-w-xs sm:max-w-sm md:max-w-md">
                                            {downloadUrl}
                                        </p>
                                    </div>
                                </div>
                                <Button asChild className="w-full sm:w-auto shrink-0 gap-2 font-medium">
                                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-4 h-4" />
                                        Visiter le site
                                    </a>
                                </Button>
                            </div>
                        )}

                        {/* Interactive HTML page preview box */}
                        {downloadUrl && !getYouTubeEmbedUrl(downloadUrl) && !isPdfUrl(downloadUrl) && !getGoogleWorkspaceEmbedUrl(downloadUrl) && resource.type === 'html' && (
                            <div className="border rounded-xl p-5 sm:p-6 bg-muted hover:bg-muted/80 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-4 shadow-sm hover:shadow-md mt-6">
                                <div className="flex items-start sm:items-center gap-4 w-full sm:w-auto">
                                    <div className="p-3 bg-primary/10 rounded-full text-primary shrink-0 mt-1 sm:mt-0">
                                        <Globe className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-foreground mb-1 text-base sm:text-lg">Page HTML Interactive</h4>
                                        <p className="text-sm text-muted-foreground truncate w-full max-w-[200px] xs:max-w-xs sm:max-w-sm md:max-w-md">
                                            {resource.fileName || 'page.html'}
                                        </p>
                                    </div>
                                </div>
                                <Button asChild className="w-full sm:w-auto shrink-0 gap-2 font-medium">
                                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-4 h-4" />
                                        Ouvrir la page
                                    </a>
                                </Button>
                            </div>
                        )}

                        {((resource.fields && resource.fields.length > 0) || resource.field) && (
                            <div className="border-t pt-4">
                                <p className="text-xs font-semibold text-muted-foreground mb-3">Filières</p>
                                <div className="flex flex-wrap gap-2">
                                    {resource.field && (
                                        <Badge variant="secondary">
                                            {getFieldName(resource.field)}
                                        </Badge>
                                    )}
                                    {resource.fields?.map((f, idx) => (
                                        <Badge key={idx} variant="outline">
                                            {getFieldName(f.fieldId)}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="py-4 border-t flex flex-wrap gap-4 justify-between items-center">
                        <Button asChild className="gap-2 flex-1 sm:flex-none">
                            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                {(resource.type === 'link' || resource.type === 'html') ? <ExternalLink className="w-4 h-4" /> : resource.type === 'video' ? <Play className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                                {(resource.type === 'link' || resource.type === 'html' || resource.type === 'video') ? 'Ouvrir' : 'Télécharger'}
                            </a>
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 text-muted-foreground hover:text-primary flex-1 sm:flex-none">
                            <Share2 className="w-4 h-4" />
                            Partager
                        </Button>
                    </CardFooter>
                </Card>

                {/* Comments Section */}
                <Card className="shadow-md">
                    <CardHeader className="border-b pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            Commentaires
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="py-4 space-y-6">
                        {/* Comment Form */}
                        {user ? (
                            <div className="border rounded-lg p-4 bg-muted">
                                <Textarea
                                    placeholder="Partagez votre avis..."
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    className="mb-3 min-h-20 text-sm"
                                />
                                <Button
                                    onClick={handleAddComment}
                                    disabled={submitting || !commentText.trim()}
                                    size="sm"
                                    className="gap-2"
                                >
                                    <Send className="w-3 h-3" />
                                    Publier
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                                <Link href="/login" className="text-primary font-semibold hover:underline">
                                    Connectez-vous
                                </Link>
                                {' '}pour commenter
                            </div>
                        )}

                        <div className="border-t pt-4">
                            {comments.length === 0 && (
                                <p className="text-center text-muted-foreground text-sm py-6">Aucun commentaire pour l'instant.</p>
                            )}
                            {comments.length > 0 && (
                                <div className="space-y-4">
                                    {getParentComments().map((comment) => (
                                        <div key={comment.id} className="space-y-4">
                                            {/* Parent Comment */}
                                            <div className="border rounded-lg p-3 bg-muted">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0">
                                                        <User className="w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="font-semibold text-sm">{comment.authorName}</span>
                                                            <span className="text-xs text-muted-foreground">{formatCommentDate(comment.timestamp)}</span>
                                                        </div>
                                                        <p className="text-sm text-foreground mb-2">{comment.text}</p>
                                                        {user && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-xs h-auto p-0 text-primary hover:bg-transparent"
                                                                onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                                                            >
                                                                Répondre
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Reply Form */}
                                            {expandedReplies[comment.id] && user && (
                                                <div className="ml-6 border rounded-lg p-3 bg-muted">
                                                    <Textarea
                                                        placeholder="Votre réponse..."
                                                        value={replyTexts[comment.id] || ''}
                                                        onChange={(e) => setReplyTexts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                                        className="mb-2 min-h-16 text-sm"
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            onClick={() => handleAddReply(comment.id)}
                                                            disabled={submitting || !(replyTexts[comment.id]?.trim())}
                                                            size="sm"
                                                            className="gap-2"
                                                        >
                                                            <Send className="w-3 h-3" />
                                                            Répondre
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: false }))}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Replies */}
                                            {getReplies(comment.id).length > 0 && (
                                                <div className="ml-6 space-y-2 border-l px-3">
                                                    {getReplies(comment.id).map((reply) => (
                                                        <div key={reply.id} className="bg-muted rounded p-3 text-xs">
                                                            <div className="flex items-start gap-2">
                                                                <User className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-semibold text-xs">{reply.authorName}</span>
                                                                        <span className="text-muted-foreground">{formatCommentDate(reply.timestamp)}</span>
                                                                    </div>
                                                                    <p className="text-foreground">{reply.text}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* User rating input (bottom of page) */}
                <Card className="shadow-sm">
                    <CardHeader className="border-b pb-3">
                        <CardTitle className="text-base">
                            Note de la ressource
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="py-4 space-y-3">
                        <p className="text-xs text-muted-foreground">
                            Ta note s&apos;affiche en moyenne d&apos;étoiles pour tout le monde, mais ton commentaire écrit reste privé pour les admins.
                        </p>
                        {user ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            className="focus:outline-none"
                                            onClick={() => setUserRating(value)}
                                            disabled={isSavingRating}
                                        >
                                            <Star
                                                className={`w-6 h-6 ${
                                                    value <= userRating
                                                        ? 'text-yellow-500 fill-yellow-500'
                                                        : 'text-muted-foreground'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                    {isLoadingRating && (
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-2" />
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="user-review" className="text-xs text-muted-foreground">
                                        Avis (optionnel, uniquement pour les admins)
                                    </Label>
                                    <Textarea
                                        id="user-review"
                                        value={userReview}
                                        onChange={(e) => setUserReview(e.target.value)}
                                        rows={2}
                                        className="text-sm"
                                        placeholder="Partage plus de détails avec l'équipe (problèmes, qualité, suggestions...)."
                                        disabled={isSavingRating}
                                    />
                                </div>
                                <Button
                                    size="sm"
                                    className="gap-2"
                                    onClick={handleSaveRating}
                                    disabled={isSavingRating || !userRating}
                                >
                                    {isSavingRating && (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    )}
                                    Enregistrer ma note
                                </Button>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                <Link href="/login" className="text-primary font-semibold hover:underline">
                                    Connecte-toi
                                </Link>{' '}
                                pour noter cette ressource.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
