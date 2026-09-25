'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CloudUpload, CheckCircle2, AlertCircle, ExternalLink, HardDrive, Key } from 'lucide-react';

export default function DriveTestPage() {
    const { user } = useAuth();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const handleUpload = async () => {
        if (!file) return;
        if (!user) {
            setError('Vous devez être connecté pour effectuer cet upload.');
            return;
        }
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            const idToken = await user.getIdToken();

            const res = await fetch('/api/upload-drive', {
                method: 'POST',
                headers: { Authorization: `Bearer ${idToken}` },
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.details || data.error || 'Upload failed');
            }

            setResult(data);
        } catch (err) {
            console.error(err);
            setError(err.message || "Erreur lors de l'upload");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="container py-12 max-w-2xl">
            <h1 className="text-3xl font-bold mb-8 text-center text-primary">Test Stockage Centralisé (Votre Drive)</h1>

            <div className="space-y-8">
                {/* Admin Setup Section */}
                <Card className="border-blue-200 bg-blue-50/30 dark:border-blue-500/40 dark:bg-blue-500/10">
                    <CardHeader>
                        <CardTitle className="text-blue-800 text-lg flex items-center gap-2 dark:text-blue-300">
                            <Key className="h-4 w-4" />
                            Configuration Admin
                        </CardTitle>
                        <CardDescription>
                            Étape unique : Liez votre compte Google pour que tous les fichiers soient stockés sur <b>votre</b> Drive.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-500/40 dark:text-blue-300 dark:hover:bg-blue-500/10"
                            onClick={() => window.open('/api/drive/auth', '_blank')}
                        >
                            Lier mon compte Drive
                        </Button>
                        <p className="text-[10px] text-blue-600/70 mt-2 italic text-center">
                            Cela générera un Refresh Token pour le stockage global du site.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HardDrive className="h-5 w-5 text-primary" />
                            Upload Test
                        </CardTitle>
                        <CardDescription>
                            Une fois le compte lié, testez l'upload vers le stockage global.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg border-muted-foreground/20 hover:bg-muted/50 transition-colors">
                            <input
                                type="file"
                                id="test-file"
                                className="hidden"
                                onChange={(e) => setFile(e.target.files[0])}
                            />
                            <label htmlFor="test-file" className="cursor-pointer flex flex-col items-center">
                                <CloudUpload className="h-10 w-10 text-muted-foreground mb-2" />
                                <span className="text-sm font-medium">
                                    {file ? file.name : "Cliquez pour choisir un fichier"}
                                </span>
                            </label>
                        </div>

                        <Button onClick={handleUpload} disabled={!file || loading} className="w-full">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Uploader maintenant
                        </Button>
                    </CardContent>
                </Card>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Erreur Configuration / API</AlertTitle>
                        <AlertDescription className="break-all">
                            {error}
                            <p className="mt-2 text-xs opacity-80">
                                Note: Vérifiez que la clé privée dans .env.local est complète et commence par
                                <code>-----BEGIN PRIVATE KEY-----</code>.
                            </p>
                        </AlertDescription>
                    </Alert>
                )}

                {result && (
                    <Alert className="border-green-500 bg-green-50 text-green-800 dark:border-green-500/50 dark:bg-green-500/15 dark:text-green-300">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertTitle>Succès !</AlertTitle>
                        <AlertDescription className="space-y-2">
                            <p>Fichier uploadé avec succès sur le Drive central.</p>
                            <div className="flex items-center gap-2 mt-2">
                                <a
                                    href={result.publicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-sm font-bold text-green-700 hover:underline"
                                >
                                    Voir la ressource <ExternalLink className="ml-1 h-3 w-3" />
                                </a>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </main>
    );
}
