'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db as staticDb } from '@/lib/data';
import { uploadResourceFile } from '@/lib/drive'; // SWAPPED FROM SUPABASE TO DRIVE
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
import { Loader2, CheckCircle2, AlertCircle, CloudUpload, Info, Sparkles, Plus, Trash2, HardDrive } from 'lucide-react';

export default function ContributeDrivePage() {
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
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [professors, setProfessors] = useState([]);

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
    }, [db]);


    const handleChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);
        setLoading(true);

        try {
            let resourceUrl = formData.url;

            if (file) {
                // Keep the 10MB limit for now, same as original
                if (file.size > 10 * 1024 * 1024) {
                    throw new Error("Le fichier dépasse la taille maximale de 10 Mo.");
                }

                // Uses the new lib/drive.js which calls /api/upload-drive
                const uploaded = await uploadResourceFile(file, {}, null, user);
                if (!uploaded || !uploaded.publicUrl) {
                    throw new Error("Erreur lors de l'upload du fichier sur Google Drive.");
                }
                resourceUrl = uploaded.publicUrl;
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
                storageType: 'google-drive' // Tag for testing
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

            for (const link of finalFields) {
                if (!link.fieldId || !link.moduleId) continue;

                const moduleMappingRef = ref(db, `module_resources/${link.moduleId}/${resourceId}`);
                await set(moduleMappingRef, true);

                const keywordRef = ref(db, `metadata/keywords/${link.fieldId}/${resourceId}`);
                await set(keywordRef, {
                    title: formData.title,
                    resourceId: resourceId
                });
            }

            if (user) {
                const userActivityRef = ref(db, `users/${user.uid}/contributions/${resourceId}`);
                await set(userActivityRef, {
                    module: shortModuleName,
                    title: formData.title,
                    timestamp: timestamp,
                    unverified: true,
                    storageType: 'google-drive'
                });
            }

            setMessage('Contribution (Test Drive) envoyée avec succès !');
            setTimeout(() => router.push('/thanks'), 2000);

        } catch (error) {
            console.error('Error submitting drive contribution:', error);
            setIsError(true);
            setMessage(error.message || 'Erreur lors de l\'envoi vers Drive.');
        } finally {
            setLoading(false);
        }
    };

    const modules = formData.field && formData.semester
        ? staticDb.modules[`${formData.field}-${formData.semester}`] || []
        : [];

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
                            <Button variant="outline" onClick={() => router.push('/login?redirect=/contribute-drive')} className="w-fit">
                                Se connecter
                            </Button>
                            <Button onClick={() => router.push('/signup')} className="w-fit">
                                S'inscrire
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
                                Retour à l'accueil
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            </main>
        );
    }

    const availableSemesters = formData.field
        ? (staticDb.fields.find(f => f.id === formData.field)?.semesters || staticDb.semesters)
        : staticDb.semesters;

    return (
        <main className="container py-12 max-w-4xl">
            <section className="mb-12 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <HardDrive className="w-8 h-8 text-primary" />
                    <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        BETA - Google Drive Storage
                    </span>
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">
                    Contribuer une ressource
                </h1>
                <p className="text-xl text-muted-foreground">
                    Test de stockage sur Google Drive Centralisé.
                </p>
            </section>

            <section>
                <Card className="shadow-lg border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-primary flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            Mode Test : Google Drive
                        </CardTitle>
                        <CardDescription>
                            Cette page envoie les fichiers sur votre Drive Google au lieu de Supabase.
                        </CardDescription>
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
                                        <SelectTrigger id="field" className="bg-card">
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
                                        <SelectTrigger id="semester" className="bg-card">
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
                                        <SelectTrigger id="module" className="bg-card">
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
                                        onValueChange={(v) => handleChange('professor', v)}
                                    >
                                        <SelectTrigger id="professor" className="bg-card">
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
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title">Titre de la ressource *</Label>
                                <Input
                                    id="title"
                                    className="bg-card"
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
                                    className="bg-card"
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
                                        <SelectTrigger id="type" className="bg-card">
                                            <SelectValue placeholder="Type de ressource" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pdf">PDF</SelectItem>
                                            <SelectItem value="image">Image</SelectItem>
                                            <SelectItem value="video">Vidéo (lien)</SelectItem>
                                            <SelectItem value="link">Lien externe</SelectItem>
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
                                        <SelectTrigger id="docType" className="bg-card">
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
                                            className="bg-card"
                                            type="url"
                                            placeholder="https://..."
                                            value={formData.url}
                                            onChange={(e) => handleChange('url', e.target.value)}
                                            required
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label htmlFor="file">Fichier (Google Drive) *</Label>
                                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-primary/20 border-dashed rounded-md bg-card hover:bg-muted/50 transition-colors cursor-pointer relative group">
                                            <div className="space-y-1 text-center">
                                                <CloudUpload className="mx-auto h-12 w-12 text-primary group-hover:scale-110 transition-transform" />
                                                <div className="flex text-sm text-muted-foreground">
                                                    <label htmlFor="file" className="relative cursor-pointer bg-transparent rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none">
                                                        <span>{file ? file.name : "Cliquez pour uploader sur Drive"}</span>
                                                        <input id="file" name="file" type="file" className="sr-only" onChange={handleFileChange} accept={formData.type === 'pdf' ? '.pdf' : 'image/*'} required={!formData.url} />
                                                    </label>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    PDF ou Images jusqu'à 10MB
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-4">
                                <Button type="submit" size="lg" className="w-full h-12 text-lg shadow-sm bg-primary hover:bg-primary/90" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Upload sur Google Drive...
                                        </>
                                    ) : (
                                        'Envoyer sur Google Drive'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}
