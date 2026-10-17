'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { db as staticDb } from '@/lib/data';
import { db, ref, get } from '@/lib/firebase';
import {
    } from '@/components/ui/select';
import { Loader2, FileText, Video, ImageIcon, Link as LinkIcon, ArrowRight, Search as SearchIcon, User, BookOpen, Sparkles, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get('q') || '';
    const fieldParam = searchParams.get('field') || '';

    const [selectedField, setSelectedField] = useState(fieldParam);
    const [results, setResults] = useState({ modules: [], resources: [], ads: [] });
    const [loading, setLoading] = useState(false);
    const [searchInputValue, setSearchInputValue] = useState(query);
    const inputRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === '/' && document.activeElement !== inputRef.current) {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (fieldParam) {
            setSelectedField(fieldParam);
        }
    }, [fieldParam]);

    useEffect(() => {
        setSearchInputValue(query);
        if (query.trim() && selectedField) {
            performSearch(query, selectedField);
        } else {
            setResults({ modules: [], resources: [], ads: [] });
        }
    }, [query, selectedField]);

    const performSearch = async (searchTerm, fieldId) => {
        setLoading(true);
        try {
            const searchLower = searchTerm.toLowerCase();

            // 1. Search in Static Modules (Filtered by field)
            const fieldModules = staticDb.modules[`${fieldId}-S1`] || []
                .concat(staticDb.modules[`${fieldId}-S2`] || [])
                .concat(staticDb.modules[`${fieldId}-S3`] || [])
                .concat(staticDb.modules[`${fieldId}-S4`] || []);

            const filteredModules = fieldModules.filter(m =>
                m.name.toLowerCase().includes(searchLower) ||
                m.id.toLowerCase().includes(searchLower)
            );

            // 2. Search in Firebase Keywords node for this field
            const keywordsRef = ref(db, `metadata/keywords/${fieldId}`);
            const snapshot = await get(keywordsRef);
            const keywordsData = snapshot.val() || {};

            const filteredResourceIds = Object.entries(keywordsData)
                .filter(([_id, data]) => data.title?.toLowerCase().includes(searchLower))
                .map(([id, _data]) => id);

            // 3. Fetch full resource data for matched IDs
            // (Note: In a high-traffic app, we might want to store more metadata in the keywords node to avoid fetching multiple resources)
            const fetchedResources = await Promise.all(
                filteredResourceIds.map(async (id) => {
                    const resRef = ref(db, `resources/${id}`);
                    const resSnap = await get(resRef);
                    if (resSnap.exists()) {
                        const resData = resSnap.val();
                        if (resData.unverified !== true) {
                            return { id, ...resData };
                        }
                    }
                    return null;
                })
            );

            setResults({
                modules: filteredModules,
                resources: fetchedResources.filter(r => r !== null),
                ads: [] // Placeholder, will fill below
            });

            // 4. Fetch Student Ads
            const adsRef = ref(db, 'studentAds');
            const adsSnap = await get(adsRef);
            if (adsSnap.exists()) {
                const now = new Date();
                const adsData = Object.entries(adsSnap.val())
                    .map(([id, data]) => ({ id, ...data }))
                    .filter(ad =>
                        ad.status === 'live' &&
                        (!ad.expirationDate || new Date(ad.expirationDate) > now)
                    )
                    .sort(() => Math.random() - 0.5) // Randomize for variety
                    .slice(0, 2); // Show max 2 ads

                setResults(prev => ({ ...prev, ads: adsData }));
            }
        } catch (error) {
            console.error('Error performing search:', error);
            setResults({ modules: [], resources: [], ads: [] });
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchInputValue.trim() && selectedField) {
            router.push(`/search?field=${selectedField}&q=${encodeURIComponent(searchInputValue)}`);
        }
    };

    const getResourceIcon = (type) => {
        switch (type) {
            case 'pdf': return <FileText className="w-5 h-5" />;
            case 'video': return <Video className="w-5 h-5" />;
            case 'image': return <ImageIcon className="w-5 h-5" />;
            case 'link': return <LinkIcon className="w-5 h-5" />;
            case 'html': return <Globe className="w-5 h-5" />;
            default: return <FileText className="w-5 h-5" />;
        }
    };

    return (
        <main className="container py-12">
            <section className="mb-12 text-center">
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">
                    Recherche
                </h1>

                {!selectedField ? (
                    <div className="max-w-4xl mx-auto mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-2">
                            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Choisissez votre filière</h2>
                            <p className="text-muted-foreground">Sélectionnez une filière pour commencer à explorer les ressources</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            {staticDb.fields.map((field) => (
                                <button
                                    key={field.id}
                                    className="group relative flex flex-col items-center p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
                                    onClick={() => setSelectedField(field.id)}
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300 mb-6 font-bold uppercase tracking-widest text-xs">
                                        {field.id.toUpperCase()}
                                    </div>
                                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors text-center">
                                        {field.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto relative mt-8 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="px-3 py-1 bg-muted border border-border text-muted-foreground font-semibold rounded-lg flex items-center gap-2 text-xs">
                                        <span className="text-[10px] uppercase tracking-widest opacity-50">Filière</span>
                                        <span>{staticDb.fields.find(f => f.id === selectedField)?.name}</span>
                                        <button onClick={() => {
                                            setSelectedField('');
                                            setResults({ modules: [], resources: [] });
                                            setSearchInputValue('');
                                            router.push('/search');
                                        }} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
                                            <i className="fas fa-times-circle text-xs"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSearchSubmit} className="relative group px-1 sm:px-0">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none group-focus-within:text-primary transition-colors z-10">
                                <SearchIcon className="h-5 w-5" />
                            </div>

                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full h-14 sm:h-16 pl-14 sm:pl-16 pr-36 sm:pr-40 rounded-xl border border-border bg-card focus:border-primary/50 focus:outline-none transition-all text-base sm:text-lg placeholder:text-muted-foreground font-medium"
                                placeholder="Rechercher par titre, module, prof..."
                                value={searchInputValue}
                                onChange={(e) => setSearchInputValue(e.target.value)}
                                autoFocus
                            />

                            <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                                <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-muted border border-border text-[10px] font-bold text-muted-foreground pointer-events-none">
                                    <span>Press</span>
                                    <span className="bg-card px-1 border rounded shadow-sm">/</span>
                                </div>
                                <Button
                                    type="submit"
                                    className="h-9 sm:h-10 rounded-xl px-5 sm:px-6 font-bold text-xs"
                                >
                                    Rechercher
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </section>

            {selectedField && (
                <>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground">Recherche en cours...</p>
                        </div>
                    ) : query ? (
                        <div className="space-y-12">
                            {/* Modules Results */}
                            {results.modules.length > 0 && (
                                <section>
                                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                                        <BookOpen className="w-6 h-6 text-primary" />
                                        Modules ({results.modules.length})
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {results.modules.map((module) => (
                                            <Link key={module.id} href={`/browse?module=${module.id}`} className="group p-5 border border-border rounded-xl hover:border-primary/50 transition-colors bg-card">
                                                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{module.name}</h3>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">{module.id}</p>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Student Ads Section */}
                            {results.ads.length > 0 && (
                                <section className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100/50 dark:bg-blue-500/10 dark:border-blue-500/20">
                                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-900 dark:text-blue-200">
                                        <Sparkles className="w-5 h-5 text-blue-600" />
                                        Opportunités Étudiantes
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {results.ads.map((ad) => (
                                            <div key={ad.id} className="group border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors flex flex-col sm:flex-row bg-card">
                                                <div className="w-full sm:w-28 aspect-video sm:aspect-square relative overflow-hidden shrink-0 bg-muted">
                                                    {ad.type === 'video' ? (
                                                        <video src={ad.url} className="w-full h-full object-cover" muted />
                                                    ) : (
                                                        <Image src={ad.url} alt="" fill className="object-cover" />
                                                    )}
                                                </div>
                                                <div className="p-4 flex flex-col justify-between flex-grow">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md dark:text-blue-300 dark:bg-blue-500/15">Annonce</span>
                                                        </div>
                                                        <h3 className="text-sm font-bold text-foreground line-clamp-1">{ad.title}</h3>
                                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{ad.description}</p>
                                                    </div>
                                                    <a href={ad.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:text-blue-700 mt-3 inline-flex items-center gap-1 group/link">
                                                        Découvrir
                                                        <ArrowRight className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Resources Results */}
                            <section>
                                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                                    <FileText className="w-6 h-6 text-primary" />
                                    Ressources ({results.resources.length})
                                </h2>
                                {results.resources.length === 0 ? (
                                    <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
                                        <p className="text-muted-foreground">Aucune ressource trouvée pour &quot;{query}&quot;</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
{results.resources.map((resource) => (
                                                <Link key={resource.id} href={`/resource/${resource.id}`} className="group flex flex-col h-full border border-border rounded-xl hover:border-primary/50 transition-colors bg-card cursor-pointer overflow-hidden">
                                                    <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-muted flex items-center justify-center">
                                                        {resource.previewImageUrl ? (
                                                            <Image
                                                                src={resource.previewImageUrl}
                                                                alt={resource.title}
                                                                fill
                                                                className="object-cover transition-opacity duration-300 group-hover:opacity-90"
                                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                            />
                                                        ) : (
                                                            <div className="p-4 text-muted-foreground/50">
                                                                {getResourceIcon(resource.type)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="p-5 flex flex-col flex-1">
                                                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-3">{resource.title}</h3>
                                                        <div className="flex flex-col gap-1.5 mb-4">
                                                            {resource.professor && (
                                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                    <User className="w-3 h-3" />
                                                                    <span>{resource.professor}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                <BookOpen className="w-3 h-3" />
                                                                <span>{resource.module || resource.moduleId}</span>
                                                            </div>
                                                        </div>

                                                        <div className="mt-auto pt-4 border-t border-border text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                                                            Ouvrir la ressource
                                                            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <SearchIcon className="w-16 h-16 text-muted/30 mx-auto mb-4" />
                            <p className="text-xl text-muted-foreground">Entrez un terme pour commencer votre recherche dans cette filière</p>
                        </div>
                    )}
                </>
            )}
        </main>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="container py-20 flex justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        }>
            <SearchContent />
        </Suspense>
    );
}
