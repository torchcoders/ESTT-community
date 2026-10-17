'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db as staticDb, getModulesForField } from '@/lib/data';
import { uploadResourceFile as uploadResourceFileToDrive } from '@/lib/drive';
import { uploadResourceFile as uploadResourceFileToSupabase } from '@/lib/supabase';
import { db, ref, push, set, get } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { Loader2, CheckCircle2, AlertCircle, CloudUpload, Info, Plus, Trash2, Copy, Check } from 'lucide-react';

import { Sparkles } from 'lucide-react';

export default function ContributePage() {
    const router = useRouter();
    const { user, profile, loading: authLoading } = useAuth();
    const [formData, setFormData] = useState({
        field: '',
        semester: '',
        module: '',
        professor: '',
        title: '',
        description: '',
        type: 'pdf',
        docType: '',
        url: '',
        anonymous: false,
        fields: []
    });
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const dropRef = useRef(null);
    const [professors, setProfessors] = useState([]);

    // Preview Image State
    const [addPreview, setAddPreview] = useState(false);
    const [previewMode, setPreviewMode] = useState('auto');
    const [previewImage, setPreviewImage] = useState(null);
    const [previewGenerating, setPreviewGenerating] = useState(false);
    const [previewError, setPreviewError] = useState('');

    // "Autre" professor popup state
    const [isProfAutreOpen, setIsProfAutreOpen] = useState(false);
    const [customProfName, setCustomProfName] = useState('');
    const [profAutreError, setProfAutreError] = useState('');

    // AI Autofill State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiResponseText, setAiResponseText] = useState('');
    const [aiParseError, setAiParseError] = useState('');
    const [copiedPrompt, setCopiedPrompt] = useState(false);

    useEffect(() => {
        if (!db) return;

        const fetchProfessors = async () => {
            try {
                const snapshot = await get(ref(db, 'metadata/professors'));
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const profList = Array.isArray(data)
                        ? data
                        : (data.professors || Object.values(data));
                    setProfessors(profList);
                }
            } catch (error) {
                console.error("Error fetching professors:", error);
            }
        };

        fetchProfessors();
    }, []);


    // Returns the MIME/extension accept string for the <input> based on the selected type
    const getAcceptString = (type) => {
        switch (type) {
            case 'pdf': return '.pdf,application/pdf';
            case 'image': return 'image/*';
            case 'powerpoint': return '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation';
            case 'excel': return '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case 'word': return '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            case 'html': return '.html,.htm,text/html';
            case 'autre': return '*';
            default: return '*';
        }
    };

    // Human-readable label for the accepted formats
    const getFileTypeLabel = (type) => {
        switch (type) {
            case 'pdf': return 'PDF uniquement';
            case 'image': return 'Images (PNG, JPG, GIF…)';
            case 'powerpoint': return 'PowerPoint (.ppt, .pptx)';
            case 'excel': return 'Excel (.xls, .xlsx)';
            case 'word': return 'Word (.doc, .docx)';
            case 'html': return 'Page HTML (.html)';
            case 'autre': return 'Tout format (auto-détecté)';
            default: return 'Fichier';
        }
    };

    // Auto-detect type from file extension when "autre" is selected
    const detectFileType = (f) => {
        if (!f) return formData.type;
        const ext = f.name.split('.').pop().toLowerCase();
        if (ext === 'pdf') return 'pdf';
        if (['ppt', 'pptx'].includes(ext)) return 'powerpoint';
        if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
        if (['doc', 'docx'].includes(ext)) return 'word';
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
        if (['html', 'htm'].includes(ext)) return 'html';
        return 'autre';
    };

    const handleChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const professorNames = professors.map(p => typeof p === 'string' ? p : p.name);

    const isCustomProf = Boolean(formData.professor)
        && formData.professor !== 'non-specifie'
        && !professorNames.includes(formData.professor);

    const openProfAutrePopup = () => {
        setCustomProfName(isCustomProf ? formData.professor : '');
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
        handleChange('professor', existing || name);
        setIsProfAutreOpen(false);
        setCustomProfName('');
        setProfAutreError('');
    };

    const applyFile = async (selectedFile) => {
        console.log("📂 [Client] applyFile started for:", selectedFile?.name);
        if (!selectedFile) return;
        setFile(selectedFile);

        // If auto-detect mode, update the type in formData
        const detected = detectFileType(selectedFile);
        console.log("📂 [Client] Detected file type:", detected);
        if (formData.type === 'autre' && detected !== 'autre') {
            handleChange('type', detected);
        }
    };

    const handleFileChange = (e) => {
        applyFile(e.target.files[0]);
    };

    // Drag & Drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only clear if leaving the drop zone entirely
        if (dropRef.current && !dropRef.current.contains(e.relatedTarget)) {
            setIsDragging(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) applyFile(dropped);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);
        setLoading(true);

        try {
            let resourceUrl = formData.url;

            if (file) {
                if (file.size > 10 * 1024 * 1024) {
                    throw new Error("Le fichier dépasse la taille maximale de 10 Mo.");
                }

                if (formData.type === 'html') {
                    // Upload to Supabase
                    const uploaded = await uploadResourceFileToSupabase(file);
                    if (!uploaded || !uploaded.publicUrl) {
                        throw new Error("Erreur lors de l'upload du fichier HTML.");
                    }
                    resourceUrl = uploaded.publicUrl;
                } else {
                    // Get human readable names for folder creation
                    const fieldObj = staticDb.fields.find(f => f.id === formData.field);
                    const moduleId = formData.module;
                    const moduleObj = staticDb.modules[`${formData.field}-${formData.semester}`]?.find(m => m.id === moduleId);

                    const folderMetadata = {
                        fieldName: fieldObj ? fieldObj.name : formData.field,
                        semester: formData.semester,
                        moduleName: moduleObj ? moduleObj.name : moduleId,
                        professorName: formData.professor,
                        displayTitle: formData.title
                    };

                    // Uses the new lib/drive.js which calls /api/upload-drive with metadata
                    const uploaded = await uploadResourceFileToDrive(file, folderMetadata, (progress) => {
                        setUploadProgress(progress);
                    }, user);

                    if (!uploaded || !uploaded.publicUrl) {
                        throw new Error("Erreur lors de l'upload du fichier.");
                    }
                    resourceUrl = uploaded.publicUrl;
                }
                setUploadProgress(100);
            }

            // Handle preview image generation
            let previewImageUrl = null;
            let previewSource = null;

            if (addPreview && resourceUrl) {
                if (previewMode === 'manual') {
                    if (!previewImage) {
                        throw new Error('Veuillez uploader une image de couverture ou désactiver l\'option.');
                    }
                    previewImageUrl = previewImage;
                    previewSource = 'imgbb';
                } else if (previewMode === 'auto') {
                    setLoading(true);
                    setMessage('Génération de l\'aperçu...');
try {
                                                                    await fetch('/api/generate-preview', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fileUrl: resourceUrl, resourceId: null }),
                        });
                        if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err.error || 'Échec de la génération de l\'aperçu');
                        }
                        const data = await res.json();
                        previewImageUrl = data.previewImageUrl;
                        previewSource = 'apyhub';
                    } catch (err) {
                        throw new Error(`Erreur lors de la génération de l'aperçu: ${err.message}`);
                    }
                }
            }

            const timestamp = Date.now();

            const moduleId = formData.module;
            const moduleObj = staticDb.modules[`${formData.field}-${formData.semester}`]?.find(m => m.id === moduleId);
            const fullModuleName = moduleObj ? moduleObj.name : moduleId;
            const firstWord = fullModuleName.trim().split(/\s+/)[0];
            const shortModuleName = `${firstWord}... - ${formData.semester}`;

            const contributionData = {
                ...formData,
                module: shortModuleName,
                fullModuleName: fullModuleName,
                moduleId: moduleId,
                url: resourceUrl,
                fileName: file?.name || null,
                authorId: user?.uid || null,
                authorName: formData.anonymous ? 'Anonyme' : (profile?.firstName ? `${profile.firstName} ${profile.lastName}` : 'Étudiant'),
                createdAt: timestamp,
                unverified: true,
                storageType: formData.type === 'html' ? 'supabase' : 'google-drive',
                previewImageUrl: previewImageUrl,
                previewSource: previewSource,
                previewGeneratedAt: previewImageUrl ? timestamp : null,
                previewStatus: previewImageUrl ? 'ready' : null,
            };

            const resourcesRef = ref(db, 'resources');
            const newResourceRef = push(resourcesRef);
            const resourceId = newResourceRef.key;

            const finalFields = [
                { fieldId: formData.field, moduleId: moduleId },
                ...(formData.fields || [])
            ];

            const updatedContributionData = {
                ...contributionData,
                fields: formData.fields || []
            };

            await set(newResourceRef, updatedContributionData);

            const writePromises = finalFields
                .filter(link => link.fieldId && link.moduleId)
                .flatMap(link => [
                    set(ref(db, `module_resources/${link.moduleId}/${resourceId}`), true),
                    set(ref(db, `metadata/keywords/${link.fieldId}/${resourceId}`), {
                        title: formData.title,
                        resourceId: resourceId
                    })
                ]);

            if (user) {
                writePromises.push(
                    set(ref(db, `users/${user.uid}/contributions/${resourceId}`), {
                        module: shortModuleName,
                        title: formData.title,
                        timestamp: timestamp,
                        unverified: true,
                        storageType: formData.type === 'html' ? 'supabase' : 'google-drive'
                    })
                );
            }

            await Promise.all(writePromises);

            setMessage('Contribution envoyée avec succès ! Elle sera vérifiée sous peu.');
            router.push('/thanks');

            // Fire-and-forget: server-side emails + Slack
            fetch('/api/contribute-notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userName: user?.displayName || 'Étudiant',
                    userEmail: user?.email || null,
                    userUid: user?.uid || null,
                    title: contributionData.title,
                    moduleName: contributionData.module,
                    fullModuleName: contributionData.fullModuleName,
                    authorName: contributionData.authorName
                })
            }).catch(() => {});

        } catch (error) {
            console.error('Error submitting contribution:', error);
            setIsError(true);
            setMessage(error.message || 'Erreur lors de l\'envoi. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    const modules = formData.field && formData.semester
        ? staticDb.modules[`${formData.field}-${formData.semester}`] || []
        : [];

    const availableSemesters = formData.field
        ? (staticDb.fields.find(f => f.id === formData.field)?.semesters || staticDb.semesters)
        : staticDb.semesters;

    const getAiPrompt = (isGoogle = false) => {
        let prompt = '';
        if (isGoogle) {
            prompt += `Voici ta mission : tu vas devoir analyser un document académique que je vais te fournir dans mon prochain message.\n\n`;
            prompt += `POUR L'INSTANT : Ne génère aucun JSON. Réponds UNIQUEMENT "J'ai bien compris la mission. Veuillez m'envoyer le document à analyser." et attends mon document.\n\n`;
            prompt += `UNE FOIS LE DOCUMENT REÇU : Analyse-le et génère un titre concis et une brève description.\n`;
        } else {
            prompt += `Analyse le document fourni et génère un titre concis et une brève description pour cette ressource académique.\n`;
        }

        prompt += `Tu devras renvoyer UNIQUEMENT un objet JSON valide avec les clés suivantes :\n`;
        prompt += `- "title": (Le titre de la ressource, max 10 mots)\n`;
        prompt += `- "description": (Une description pertinente, max 50 mots)\n`;

        if (formData.field && formData.semester && modules.length > 0) {
            prompt += `- "module": l'ID du module correspondant. Modules disponibles : ${modules.map(m => `"${m.id}" (${m.name})`).join(', ')}.\n`;
            const profNames = professors.map(p => typeof p === 'string' ? p : p.name);
            prompt += `- "professor": Le nom du professeur. Professeurs connus : ${profNames.join(', ')}. (Mettre "Non spécifié" si non trouvé)\n`;
            prompt += `- "docType": Le type de document. Choisir parmi : "Cours", "TD", "TP", "Exam".\n`;
        }

        if (isGoogle) {
            prompt += `\nRappel : Pour ce premier message, demande juste le document. Ne génère aucun JSON ni texte supplémentaire.`;
        } else {
            prompt += `\nImportant : Si je n'ai pas fourni de fichier, demande-moi de l'attacher avant de générer le JSON.\n`;
            prompt += `\nN'inclus aucun texte supplémentaire ni de formatage markdown, juste le JSON brut.`;
        }

        return prompt;
    };

    const handleAiAutofill = () => {
        setAiParseError('');
        try {
            let textToParse = aiResponseText.trim();
            if (textToParse.startsWith('```json')) {
                textToParse = textToParse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (textToParse.startsWith('```')) {
                textToParse = textToParse.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(textToParse);
            if (!parsed.title && !parsed.description && !parsed.module && !parsed.professor && !parsed.docType) {
                setAiParseError('Le JSON ne contient aucune clé valide ("title", "description", etc.).');
                return;
            }

            let matchedProf = formData.professor;
            if (parsed.professor) {
                const profInput = String(parsed.professor).toLowerCase().trim();
                if (profInput === 'non spécifié' || profInput === 'non specifie' || profInput === 'non-specifie') {
                    matchedProf = 'non-specifie';
                } else {
                    const profNames = professors.map(p => typeof p === 'string' ? p : p.name);
                    const exactMatch = profNames.find(p => p.toLowerCase() === profInput);
                    if (exactMatch) {
                        matchedProf = exactMatch;
                    } else {
                        const partialMatch = profNames.find(p => profInput.includes(p.toLowerCase()) || p.toLowerCase().includes(profInput));
                        if (partialMatch) matchedProf = partialMatch;
                    }
                }
            }

            setFormData(prev => ({
                ...prev,
                title: parsed.title || prev.title,
                description: parsed.description || prev.description,
                module: parsed.module && modules.some(m => m.id === parsed.module) ? parsed.module : prev.module,
                professor: matchedProf,
                docType: parsed.docType || prev.docType
            }));

            setIsAiModalOpen(false);
            setAiResponseText('');
            setIsError(false);
            setMessage('Champs remplis avec succès via l\'IA !');
        } catch {
            setAiParseError('Format JSON invalide. Assurez-vous de coller uniquement le JSON renvoyé par l\'IA.');
        }
    };

    const copyPromptToClipboard = () => {
        const prompt = getAiPrompt(false);
        navigator.clipboard.writeText(prompt);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
    };

    if (authLoading) {
        return (
            <main className="container py-12 max-w-4xl text-center flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </main>
        );
    }

    if (!user) {
        return (
            <main className="container py-12 max-w-4xl text-center">
                <Alert className="max-w-2xl mx-auto mb-6 text-left">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Connexion requise</AlertTitle>
                    <AlertDescription className="flex flex-col gap-4 mt-2">
                        <p>Vous devez être connecté pour contribuer une ressource.</p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => router.push('/login?redirect=/contribute')} className="w-fit">
                                Se connecter
                            </Button>
                            <Button onClick={() => router.push('/signup')} className="w-fit">
                                S&apos;inscrire
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            </main>
        );
    }

    const isAuthorized = (user && user.emailVerified) || (profile && (profile.verifiedEmail || profile.verified || profile.role === 'admin' || profile.role === 'moderator'));

    if (!isAuthorized) {
        return (
            <main className="container py-12 max-w-4xl text-center">
                <Alert variant="destructive" className="max-w-2xl mx-auto mb-6 text-left border-destructive/50 bg-destructive/10 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Accès refusé</AlertTitle>
                    <AlertDescription className="flex flex-col gap-4 mt-2">
                        <p>
                            Vous devez être un utilisateur vérifié pour pouvoir contribuer des ressources.<br />
                            Cela nous aide à maintenir la qualité des documents partagés.<br />
                            Veuillez vérifier votre compte dans votre profil.
                        </p>
                        <div className="flex gap-3">
                            <Button onClick={() => router.push(`/profile/${user.uid}`)} className="w-fit bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Mon profil
                            </Button>
                            <Button variant="outline" onClick={() => router.push('/')} className="w-fit border-destructive/30 hover:bg-destructive/20 text-destructive">
                                Retour à l&apos;accueil
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            </main>
        );
    }

    const _previewReady = !addPreview || (previewMode === 'auto') || (previewMode === 'manual' && previewImage);
    const previewDisabled = addPreview && previewMode === 'manual' && !previewImage;
    const isSubmitDisabled = loading || previewDisabled;

    return (
        <main className="container py-12 max-w-4xl">
            <section className="mb-12 text-center">
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">
                    Contribuer une ressource
                </h1>
                <p className="text-xl text-muted-foreground">
                    Aide tes camarades en partageant tes cours, TDs, exercices ou vidéos.
                </p>
            </section>

            <section>
                <Card className="shadow-lg border-muted-foreground/10">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between space-y-4 sm:space-y-0 pb-6">
                        <div className="space-y-1.5">
                            <CardTitle>Formulaire de contribution</CardTitle>
                            <CardDescription>
                                Les champs marqués d&apos;une astérisque (*) sont obligatoires.
                            </CardDescription>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAiModalOpen(true)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-100 hover:border-blue-200 font-semibold shadow-sm shrink-0 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40 dark:hover:border-blue-500/60"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Remplir avec l&apos;IA
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {message && (
                                <Alert variant={isError ? "destructive" : "default"} className={!isError ? "border-green-500 bg-green-50 text-green-700" : ""}>
                                    {isError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                    <AlertTitle>{isError ? "Erreur" : "Succès"}</AlertTitle>
                                    <AlertDescription>{message}</AlertDescription>
                                </Alert>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="field">Filière *</Label>
                                    <Select
                                        value={formData.field}
                                        onValueChange={(v) => {
                                            handleChange('field', v);
                                            handleChange('semester', '');
                                            handleChange('module', '');
                                        }}
                                        required
                                    >
                                        <SelectTrigger id="field">
                                            <SelectValue placeholder="Sélectionnez une filière" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {staticDb.fields.map((field) => (
                                                <SelectItem key={field.id} value={field.id}>{field.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="semester">Semestre *</Label>
                                    <Select
                                        value={formData.semester}
                                        onValueChange={(v) => {
                                            handleChange('semester', v);
                                            handleChange('module', '');
                                        }}
                                        required
                                        disabled={!formData.field}
                                    >
                                        <SelectTrigger id="semester">
                                            <SelectValue placeholder="Sélectionnez un semestre" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableSemesters.map((sem) => (
                                                <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="module">Module *</Label>
                                    <Select
                                        value={formData.module}
                                        onValueChange={(v) => handleChange('module', v)}
                                        required
                                        disabled={!formData.semester}
                                    >
                                        <SelectTrigger id="module">
                                            <SelectValue placeholder="Sélectionnez un module" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {modules.map((mod) => (
                                                <SelectItem key={mod.id} value={mod.id}>{mod.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="professor">Professeur (Optionnel)</Label>
                                    <Select
                                        value={formData.professor}
                                        onValueChange={(v) => {
                                            if (v === '__autre__') {
                                                openProfAutrePopup();
                                                return;
                                            }
                                            if (v === '') return;
                                            handleChange('professor', v);
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
                                                <SelectItem value={formData.professor}>
                                                    {formData.professor}
                                                </SelectItem>
                                            )}
                                            <SelectItem value="__autre__">Autre</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Additional Fields (Linking) */}
                            {formData.field && formData.semester && (
                                <div className="space-y-4 p-5 bg-muted/20 rounded-2xl border border-muted-foreground/10">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label className="text-sm font-bold flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-primary" />
                                                Aussi utile pour... (Optionnel)
                                            </Label>
                                            <p className="text-[11px] text-muted-foreground">
                                                Si cette ressource correspond à un module dans une autre filière.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs font-bold text-primary hover:bg-primary/5"
                                            onClick={() => {
                                                const current = formData.fields || [];
                                                handleChange('fields', [...current, { fieldId: '', semester: '', moduleId: '' }]);
                                            }}
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Ajouter
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {(formData.fields || []).map((link, lIndex) => {
                                            const linkModules = link.fieldId ? getModulesForField(link.fieldId) : [];
                                            const linkSemester = link.semester || '';

                                            return (
                                                <div key={lIndex} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-card/50 rounded-xl border border-muted-foreground/5 relative group">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] font-bold uppercase opacity-70">Filière</Label>
                                                        <Select
                                                            value={link.fieldId}
                                                            onValueChange={(val) => {
                                                                const updatedLinks = [...formData.fields];
                                                                updatedLinks[lIndex] = { ...updatedLinks[lIndex], fieldId: val, semester: '', moduleId: '' };
                                                                handleChange('fields', updatedLinks);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Filière" /></SelectTrigger>
                                                            <SelectContent>
                                                                {staticDb.fields.map(f => (
                                                                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] font-bold uppercase opacity-70">Semestre et module équivalents</Label>
                                                        <div className="flex gap-2">
                                                            <Select
                                                                value={linkSemester}
                                                                onValueChange={(val) => {
                                                                    const updatedLinks = [...formData.fields];
                                                                    updatedLinks[lIndex] = { ...updatedLinks[lIndex], semester: val, moduleId: '' };
                                                                    handleChange('fields', updatedLinks);
                                                                }}
                                                                disabled={!link.fieldId}
                                                            >
                                                                <SelectTrigger className="h-9 w-24 text-xs"><SelectValue placeholder="Semestre" /></SelectTrigger>
                                                                <SelectContent>
                                                                    {Array.from(new Set(linkModules.map(m => m.semester))).map(semester => (
                                                                        <SelectItem key={semester} value={semester}>{semester}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Select
                                                                value={link.moduleId}
                                                                onValueChange={(val) => {
                                                                    const updatedLinks = [...formData.fields];
                                                                    updatedLinks[lIndex] = { ...updatedLinks[lIndex], moduleId: val };
                                                                    handleChange('fields', updatedLinks);
                                                                }}
                                                                disabled={!link.fieldId}
                                                            >
                                                                <SelectTrigger className="h-9 text-xs flex-grow"><SelectValue placeholder="Module" /></SelectTrigger>
                                                                <SelectContent>
                                                                    {linkModules.filter(m => !linkSemester || m.semester === linkSemester).map(m => (
                                                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 text-destructive hover:bg-destructive/10"
                                                                onClick={() => {
                                                                    const updatedLinks = formData.fields.filter((_, i) => i !== lIndex);
                                                                    handleChange('fields', updatedLinks);
                                                                }}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(!formData.fields || formData.fields.length === 0) && (
                                            <p className="text-[10px] text-muted-foreground italic text-center py-2 opacity-60">
                                                Aucune liaison supplémentaire ajoutée.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="title">Titre de la ressource *</Label>
                                <Input
                                    id="title"
                                    placeholder="Ex: Cours complet chapitre 3"
                                    value={formData.title}
                                    onChange={(e) => handleChange('title', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Décrivez brièvement la ressource..."
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="type">Type de ressource *</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(v) => handleChange('type', v)}
                                        required
                                    >
                                        <SelectTrigger id="type">
                                            <SelectValue placeholder="Type de ressource" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pdf">PDF</SelectItem>
                                            <SelectItem value="powerpoint">PowerPoint</SelectItem>
                                            <SelectItem value="excel">Excel / Tableur</SelectItem>
                                            <SelectItem value="word">Word</SelectItem>
                                            <SelectItem value="image">Image</SelectItem>
                                            <SelectItem value="html">Page HTML (.html)</SelectItem>
                                            <SelectItem value="video">Vidéo (lien)</SelectItem>
                                            <SelectItem value="link">Lien externe</SelectItem>
                                            <SelectItem value="autre">Autre (auto-détecté)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
<Label htmlFor="docType">Type de document *</Label>
                                    <Select
                                        value={formData.docType}
                                        onValueChange={(v) => handleChange('docType', v)}
                                        required
                                    >
                                        <SelectTrigger id="docType">
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

                                {(formData.type === 'video' || formData.type === 'link') ? (
                                    <div className="space-y-2">
                                        <Label htmlFor="url">URL *</Label>
                                        <Input
                                            id="url"
                                            type="url"
                                            placeholder="https://..."
                                            value={formData.url}
                                            onChange={(e) => handleChange('url', e.target.value)}
                                            required
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label htmlFor="file">Fichier *</Label>
                                        <div
                                            ref={dropRef}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-all cursor-pointer relative group ${isDragging
                                                ? 'border-primary bg-primary/10 scale-[1.01]'
                                                : file
                                                    ? 'border-green-400 bg-green-50/50'
                                                    : 'border-muted-foreground/20 hover:bg-muted/50 hover:border-primary/40'
                                            }`}
                                        >
                                            <div className="space-y-2 text-center pointer-events-none">
                                                {isDragging ? (
                                                    <CloudUpload className="mx-auto h-12 w-12 text-primary animate-bounce" />
                                                ) : file ? (
                                                    <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                                                ) : (
                                                    <CloudUpload className="mx-auto h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
                                                )}
                                                <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground pointer-events-auto">
                                                    {isDragging ? (
                                                        <span className="font-semibold text-primary">Déposez le fichier ici</span>
                                                    ) : file ? (
                                                        <>
                                                            <span className="font-medium text-green-600 truncate max-w-[220px]">{file.name}</span>
                                                            <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                            <label htmlFor="file" className="cursor-pointer text-xs text-primary hover:underline">
                                                                Changer de fichier
                                                                <input id="file" name="file" type="file" className="sr-only" onChange={handleFileChange} accept={getAcceptString(formData.type)} />
                                                            </label>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <label htmlFor="file" className="cursor-pointer font-medium text-primary hover:text-primary/80">
                                                                Cliquez pour choisir un fichier
                                                                <input id="file" name="file" type="file" className="sr-only" onChange={handleFileChange} accept={getAcceptString(formData.type)} required={!formData.url} />
                                                            </label>
                                                            <span className="text-xs">ou glissez-déposez ici</span>
                                                        </>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {getFileTypeLabel(formData.type)} — jusqu&apos;à 10 MB
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Preview Image Option */}
                            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-muted-foreground/10">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="addPreview"
                                        checked={addPreview}
                                        onCheckedChange={(checked) => {
                                            setAddPreview(checked);
                                            if (!checked) {
                                                setPreviewImage(null);
                                                setPreviewError('');
                                            }
                                        }}
                                    />
                                    <Label htmlFor="addPreview" className="font-medium cursor-pointer">
                                        Ajouter une image de couverture (page de garde)
                                    </Label>
                                </div>

                                {addPreview && (
                                    <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                                        <div className="flex gap-3">
                                            <Label>
                                                <input
                                                    type="radio"
                                                    name="previewMode"
                                                    value="auto"
                                                    checked={previewMode === 'auto'}
                                                    onChange={() => setPreviewMode('auto')}
                                                    className="mr-2"
                                                />
                                                Automatique (générer depuis le document)
                                            </Label>
                                            <Label>
                                                <input
                                                    type="radio"
                                                    name="previewMode"
                                                    value="manual"
                                                    checked={previewMode === 'manual'}
                                                    onChange={() => setPreviewMode('manual')}
                                                    className="mr-2"
                                                />
                                                Manuelle (uploader une image)
                                            </Label>
                                        </div>

                                        {previewMode === 'manual' && (
                                            <div className="space-y-2">
                                                <Label htmlFor="previewUpload">Image de couverture</Label>
                                                <input
                                                    id="previewUpload"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;
                                                        try {
                                                            setPreviewError('');
                                                            const { uploadToImgBB } = await import('@/lib/uploadUtils');
                                                            const url = await uploadToImgBB(file);
                                                            setPreviewImage(url);
                                                        } catch (err) {
                                                            setPreviewError(err.message);
                                                        }
                                                    }}
                                                    className="w-full"
                                                />
                                                {previewImage && (
                                                    <div className="relative w-48 h-27 rounded overflow-hidden border">
                                                        <Image src={previewImage} alt="Preview" fill className="object-cover" />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {previewMode === 'auto' && (
                                            <div className="space-y-2 text-sm text-muted-foreground">
                                                <p>L&apos;aperçu sera généré automatiquement à partir de la première page du document après l&apos;envoi.</p>
                                                {file && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={async () => {
                                                            if (!file) return;
                                                            setPreviewGenerating(true);
                                                            setPreviewError('');
try {
                                                                    await fetch('/api/generate-preview', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ fileUrl: resourceUrl }),
                                                                });
                                                                // Note: resourceUrl not available yet, generation happens in handleSubmit
                                                            } catch (err) {
                                                                setPreviewError(err.message);
                                                            } finally {
                                                                setPreviewGenerating(false);
                                                            }
                                                        }}
                                                        disabled={previewGenerating || !file}
                                                    >
                                                        {previewGenerating ? 'Génération...' : 'Générer l\'aperçu'}
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        {previewError && (
                                            <p className="text-sm text-destructive">{previewError}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center space-x-2 bg-muted/30 p-4 rounded-lg">
                                <Checkbox
                                    id="anonymous"
                                    checked={formData.anonymous}
                                    onCheckedChange={(v) => handleChange('anonymous', v)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="anonymous" className="text-sm font-medium leading-none cursor-pointer">
                                        Contribuer de manière anonyme
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Votre nom ne sera pas affiché publiquement sur la ressource.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <Button type="submit" size="lg" className="w-full h-12 text-lg shadow-sm" disabled={isSubmitDisabled}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            {uploadProgress > 0 && uploadProgress < 100
                                                ? `Envoi en cours... ${uploadProgress}%`
                                                : uploadProgress === 100
                                                    ? "Finalisation..."
                                                    : "Envoi en cours..."}
                                        </>
                                    ) : (
                                        'Soumettre la ressource'
                                    )}
                                </Button>
                                {previewDisabled && (
                                    <p className="text-center text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded">
                                        Veuillez uploader une image de couverture ou désactiver l&apos;option.
                                    </p>
                                )}
                                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                    <Info className="h-3 w-3" />
                                    <span>Toutes les ressources sont vérifiées avant d&apos;être publiées.</span>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </section>

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

            {/* AI Autofill Modal */}
            <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Remplir avec l&apos;IA
                        </DialogTitle>
                        <DialogDescription>
                            Générez automatiquement le titre et la description en demandant à votre IA préférée (ChatGPT, Claude, Gemini, etc.).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 mt-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm flex items-center gap-2"><span className="flex items-center justify-center bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs">1</span> Copiez ce prompt</h3>
                                {!(formData.field && formData.semester) && (
                                    <span className="text-[10px] text-muted-foreground italic px-2 py-0.5 bg-muted rounded-full">Sélectionnez d&apos;abord une filière et un semestre pour un prompt avancé.</span>
                                )}
                            </div>
                            <div className="relative bg-muted/50 p-4 rounded-lg font-mono text-xs text-muted-foreground border border-muted whitespace-pre-wrap">
                                {getAiPrompt()}
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="absolute top-2 right-2 h-6 w-6"
                                    onClick={copyPromptToClipboard}
                                >
                                    {copiedPrompt ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm flex items-center gap-2"><span className="flex items-center justify-center bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs">2</span> Demandez à votre IA</h3>
                            <p className="text-xs text-muted-foreground pl-7">
                                Allez sur ChatGPT ou Google, collez le prompt copié ci-dessus, et <strong>attachez votre document</strong> (PDF, Image, etc.).
                            </p>
                            <div className="flex flex-wrap gap-2 pl-7 mt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 font-semibold bg-card text-foreground hover:bg-muted border-border"
                                    onClick={() => {
                                        const encodedPrompt = encodeURIComponent(getAiPrompt(false));
                                        window.open(`https://chatgpt.com/?prompt=${encodedPrompt}`, '_blank');
                                    }}
                                >
                                    <Image src="/assets/images/chatgpt_logo.svg" alt="ChatGPT" width={16} height={16} />
                                    Ouvrir ChatGPT
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 font-semibold bg-card text-foreground hover:bg-muted border-border"
                                    onClick={() => {
                                        const encodedPrompt = encodeURIComponent(getAiPrompt(true).replace(/\n/g, ' '));
                                        window.open(`https://www.google.com/search?udm=50&aep=11&q=${encodedPrompt}`, '_blank');
                                    }}
                                >
                                    <Image src="/assets/images/Google__G__logo.svg" alt="Google" width={16} height={16} />
                                    Ouvrir Google
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm flex items-center gap-2"><span className="flex items-center justify-center bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs">3</span> Collez la réponse JSON ici</h3>
                            <div className="pl-7 space-y-3">
                                {aiParseError && (
                                    <Alert variant="destructive" className="py-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription className="text-xs">{aiParseError}</AlertDescription>
                                    </Alert>
                                )}
                                <Textarea
                                    placeholder='{"title": "Mon Titre", "description": "Ma description"}'
                                    className="font-mono text-xs min-h-[120px]"
                                    value={aiResponseText}
                                    onChange={(e) => setAiResponseText(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                            <Button variant="ghost" onClick={() => setIsAiModalOpen(false)}>Annuler</Button>
                            <Button onClick={handleAiAutofill} disabled={!aiResponseText.trim()}>
                                Appliquer et remplir
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </main>
    );
}
