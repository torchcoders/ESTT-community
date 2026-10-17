'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db as staticDb } from '@/lib/data';
import { db, ref, get, set as firebaseSet, remove as firebaseRemove, onValue } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge, Loader2, FileText, Video, ImageIcon, Link as LinkIcon, ArrowRight, FolderOpen, User, Star, BookOpen, ClipboardList, FlaskConical, FileCheck, Layers, Globe, ListPlus } from 'lucide-react';

const RESOURCE_CATEGORIES = [
    { id: 'Cours', label: 'Cours', icon: <BookOpen className="w-5 h-5 text-blue-500" /> },
    { id: 'TD', label: 'Travaux Dirigés (TD)', icon: <ClipboardList className="w-5 h-5 text-indigo-500" /> },
    { id: 'TP', label: 'Travaux Pratiques (TP)', icon: <FlaskConical className="w-5 h-5 text-emerald-500" /> },
    { id: 'Exam', label: 'Examens & Contrôles', icon: <FileCheck className="w-5 h-5 text-amber-500" /> },
    { id: 'Autres', label: 'Autres Ressources', icon: <Layers className="w-5 h-5 text-muted-foreground" /> },
];

let _savedField = '';
let _savedSemester = '';
let _savedModule = '';
let _savedProfessor = '';

export default function BrowsePage() {
    const { user } = useAuth();
    const { showWarning, showError } = useDialog();

    const [selectedField, setSelectedField] = useState(_savedField);
    const [selectedSemester, setSelectedSemester] = useState(_savedSemester);
    const [selectedModule, setSelectedModule] = useState(_savedModule);
    const [selectedProfessor, setSelectedProfessor] = useState(_savedProfessor);
    const [resources, setResources] = useState([]);
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [favorites, setFavorites] = useState({});
    const [togglingFav, setTogglingFav] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const fParam = params.get('field');
        const sParam = params.get('semester');
        const mParam = params.get('module');

        const field = [fParam, _savedField].find((id) => id && staticDb.fields.some(f => f.id === id)) || '';

        const semesterList = field
            ? (staticDb.fields.find(f => f.id === field)?.semesters || staticDb.semesters)
            : [];
        const semester = [sParam, _savedSemester].find((id) => id && semesterList.includes(id)) || '';

        const moduleList = field && semester ? (staticDb.modules[`${field}-${semester}`] || []) : [];
        const moduleId = [mParam, _savedModule].find((id) => id && moduleList.some(m => m.id === id)) || '';

        const professor = moduleId === _savedModule ? _savedProfessor : '';

        _savedField = field;
        _savedSemester = semester;
        _savedModule = moduleId;
        _savedProfessor = professor;

        setSelectedField(field);
        setSelectedSemester(semester);
        setSelectedModule(moduleId);
        setSelectedProfessor(professor);
    }, []);

    useEffect(() => {
        if (!db) return;
        if (selectedModule) {
            fetchResources();
            fetchAds();
        } else {
            setResources([]);
            setAds([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedModule]);

    useEffect(() => {
        if (!user || !db) return;
        const favRef = ref(db, `userFavorites/${user.uid}`);
        const unsub = onValue(favRef, (snapshot) => {
            const data = snapshot.val() || {};
            const map = {};
            Object.keys(data).forEach((resId) => {
                map[resId] = true;
            });
            setFavorites(map);
        });
        return () => unsub();
    }, [user]);

    const handleToggleFavorite = async (e, resource) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            showWarning('Connectez-vous pour ajouter cette ressource à votre liste.');
            return;
        }
        try {
            setTogglingFav(resource.id);
            const favRef = ref(db, `userFavorites/${user.uid}/${resource.id}`);
            if (favorites[resource.id]) {
                await firebaseRemove(favRef);
            } else {
                await firebaseSet(favRef, {
                    resourceId: resource.id,
                    title: resource.title || '',
                    type: resource.type || '',
                    docType: resource.docType || '',
                    field: resource.field || null,
                    moduleId: resource.moduleId || resource.module || null,
                    semester: resource.semester || null,
                    professor: resource.professor || '',
                    createdAt: Date.now(),
                });
            }
        } catch (err) {
            console.error('Error toggling favorite:', err);
            showError('Erreur lors de la mise à jour de votre liste.');
        } finally {
            setTogglingFav(null);
        }
    };

    const fetchAds = async () => {
        const adsRef = ref(db, 'studentAds');
        const snapshot = await get(adsRef);
        if (snapshot.exists()) {
            const now = new Date();
            const adsData = Object.entries(snapshot.val())
                .map(([id, data]) => ({ id, ...data }))
                .filter(ad => ad.status === 'live' && (!ad.expirationDate || new Date(ad.expirationDate) > now))
                .sort(() => Math.random() - 0.5)
                .slice(0, 1);
            setAds(adsData);
        }
    };

    const fetchResources = async () => {
        setLoading(true);
        try {
            // 1. Try fetching from mapping first (efficient)
            const mappingRef = ref(db, `module_resources/${selectedModule}`);
            const mappingSnap = await get(mappingRef);

            let resourceIds = [];
            if (mappingSnap.exists()) {
                resourceIds = Object.keys(mappingSnap.val());
            }

            // 2. Fetch actual resource data
            const resourcesRef = ref(db, 'resources');
            const resourcesSnap = await get(resourcesRef);
            const allResources = resourcesSnap.val() || {};

            let formattedResources = [];

            if (resourceIds.length > 0) {
                // If mapping exists, use it
                formattedResources = resourceIds
                    .map(id => ({
                        id,
                        ...allResources[id]
                    }))
                    .filter(resource =>
                        resource &&
                        resource.unverified !== true &&
                        (resource.url || resource.link || resource.file) &&
                        resource.title
                    );
            }

            // 3. Fallback: Search all resources for this module ID if no results or mismatch
            // This handles cases where mapping might be missing but resource has the module field
            if (formattedResources.length === 0) {
                formattedResources = Object.entries(allResources)
                    .map(([id, res]) => ({ id, ...res }))
                    .filter(res => {
                        const isVerified = res.unverified !== true;
                        const hasContent = res.url || res.link || res.file;
                        const hasTitle = !!res.title;

                        // Check direct module field
                        const matchesDirectModule = res.module === selectedModule || res.moduleId === selectedModule;

                        // Check multiple fields array
                        const matchesInFields = res.fields && Array.isArray(res.fields) &&
                            res.fields.some(f => f.moduleId === selectedModule);

                        return isVerified && (matchesDirectModule || matchesInFields) && hasContent && hasTitle;
                    });
            }

            setResources(formattedResources);
        } catch (error) {
            console.error('Error fetching resources:', error);
            setResources([]);
        } finally {
            setLoading(false);
        }
    };

    const updateParams = (updates) => {
        const params = new URLSearchParams(window.location.search);
        Object.entries(updates).forEach(([key, value]) => {
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        });
        const newSearch = params.toString();
        const newUrl = `${window.location.pathname}${newSearch ? '?' + newSearch : ''}`;
        window.history.replaceState(null, '', newUrl);
    };

    const modules = selectedField && selectedSemester
        ? staticDb.modules[`${selectedField}-${selectedSemester}`] || []
        : [];

    const selectedModuleData = modules.find(m => m.id === selectedModule);

    // All professor names found in this module's resources (includes custom "Autre" names)
    const availableProfessors = Array.from(new Set(
        resources
            .map(r => (typeof r.professor === 'string' ? r.professor.trim() : ''))
            .filter(p => p && p !== 'non-specifie')
    )).sort((a, b) => a.localeCompare(b, 'fr'));

    const filteredResources = selectedProfessor
        ? resources.filter(r => (typeof r.professor === 'string' ? r.professor.trim() : '') === selectedProfessor)
        : resources;

    const ensureProtocol = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        return `https://${url}`;
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



    const groupedResources = filteredResources.reduce((acc, resource) => {
        const type = resource.docType || 'Autres';
        // Normalize type to match our categories
        const normalizedType = RESOURCE_CATEGORIES.find(c => c.id === type) ? type : 'Autres';
        
        if (!acc[normalizedType]) acc[normalizedType] = [];
        acc[normalizedType].push(resource);
        return acc;
    }, {});

    const renderRating = (resource) => {
        const average = resource.ratingAverage;
        const count = resource.ratingCount || 0;
        if (!average || count === 0) return null;

        const rounded = Math.round(average * 10) / 10;

        return (
            <div className="flex items-center gap-1 mt-1.5">
                <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((value) => (
                        <Star
                            key={value}
                            className={`w-3 h-3 ${value <= Math.round(average) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
                        />
                    ))}
                </div>
                <span className="text-[11px] text-muted-foreground">
                    {rounded.toFixed(1)} ({count})
                </span>
            </div>
        );
    };

    const renderResourceCard = (resource) => {
        const rawUrl = resource.url || resource.link || resource.file;
        const validUrl = rawUrl ? ensureProtocol(rawUrl) : null;
        const isFav = favorites[resource.id] || false;
        const previewUrl = resource.previewImageUrl;

        return (
            <Link key={resource.id} href={`/resource/${resource.id}`} className="group flex flex-col h-full border border-border rounded-xl hover:border-primary/50 transition-all hover:shadow-md bg-card cursor-pointer overflow-hidden">
                <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-muted flex items-center justify-center">
                    {previewUrl ? (
                        <Image
                            src={previewUrl}
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
                    <div className="flex flex-col gap-2 mb-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {resource.professor && (
                                <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {resource.professor}
                                </span>
                            )}
                            <span className="text-[10px] font-bold uppercase py-0.5 px-1.5 bg-muted text-muted-foreground rounded">{resource.type}</span>
                            {resource.docType && (
                                <span className="text-[10px] font-bold uppercase py-0.5 px-1.5 bg-primary/10 text-primary rounded">{resource.docType}</span>
                            )}
                        </div>
                        {renderRating(resource)}
                    </div>

                    <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                        <button
                            onClick={(e) => handleToggleFavorite(e, resource)}
                            disabled={togglingFav === resource.id}
                            className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors ${
                                isFav
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-muted text-muted-foreground hover:bg-primary/5 hover:text-primary'
                            }`}
                        >
                            {togglingFav === resource.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <ListPlus className="w-3 h-3" />
                            )}
                            {isFav ? 'Dans ma liste' : 'Ajouter à ma liste'}
                        </button>
                        {validUrl ? (
                            <span className="text-xs font-bold text-primary group-hover:underline flex items-center gap-1 bg-primary/5 px-2.5 py-1 rounded-full">
                                Ouvrir <ArrowRight className="w-3 h-3" />
                            </span>
                        ) : (
                            <span className="text-xs text-muted-foreground">Non disponible</span>
                        )}
                    </div>
                </div>
            </Link>
        );
    };

    const availableSemesters = selectedField 
        ? (staticDb.fields.find(f => f.id === selectedField)?.semesters || staticDb.semesters)
        : staticDb.semesters;

    return (
        <main className="container py-6 md:py-10">
            <section className="mb-8 md:mb-10 text-center">
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">
                    Parcourir les ressources
                </h1>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                    Sélectionnez votre filière, semestre et module pour accéder aux ressources partagées par la communauté.
                </p>
            </section>

            <section className={`mb-8 md:mb-10 grid grid-cols-1 gap-6 bg-card p-6 rounded-xl border shadow-sm ${selectedModule ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Filière</label>
                    <Select
                        value={selectedField}
                        onValueChange={(value) => {
                            if (value === '') return;
                            _savedField = value;
                            _savedSemester = '';
                            _savedModule = '';
                            _savedProfessor = '';
                            setSelectedField(value);
                            setSelectedSemester('');
                            setSelectedModule('');
                            setSelectedProfessor('');
                            setResources([]);
                            updateParams({ field: value, semester: '', module: '' });
                        }}
                    >
                        <SelectTrigger>
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
                    <label className="text-sm font-medium leading-none">Semestre</label>
                    <Select
                        value={selectedSemester}
                        onValueChange={(value) => {
                            if (value === '') return;
                            _savedSemester = value;
                            _savedModule = '';
                            _savedProfessor = '';
                            setSelectedSemester(value);
                            setSelectedModule('');
                            setSelectedProfessor('');
                            setResources([]);
                            updateParams({ semester: value, module: '' });
                        }}
                        disabled={!selectedField}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un semestre" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableSemesters.map((sem) => (
                                <SelectItem key={sem} value={sem}>
                                    {sem}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Module</label>
                    <Select
                        value={selectedModule}
                        onValueChange={(value) => {
                            if (value === '') return;
                            _savedModule = value;
                            _savedProfessor = '';
                            setSelectedModule(value);
                            setSelectedProfessor('');
                            updateParams({ module: value });
                        }}
                        disabled={!selectedSemester}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un module" />
                        </SelectTrigger>
                        <SelectContent>
                            {modules.map((mod) => (
                                <SelectItem key={mod.id} value={mod.id}>
                                    {mod.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedModule && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Professeur</label>
                        <Select
                            value={selectedProfessor || 'all'}
                            onValueChange={(value) => {
                                if (value === '') return;
                                const prof = value === 'all' ? '' : value;
                                _savedProfessor = prof;
                                setSelectedProfessor(prof);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Tous les professeurs" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les professeurs</SelectItem>
                                {availableProfessors.map((name) => (
                                    <SelectItem key={name} value={name}>
                                        {name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </section>

            {selectedModule && (
                <section>
                    <div className="flex items-center justify-between mb-6 border-b pb-3">
                        <h2 className="text-2xl font-semibold tracking-tight">
                            Ressources : <span className="text-primary">{selectedModuleData?.name}</span>
                            {selectedProfessor && (
                                <span className="text-muted-foreground font-normal"> — {selectedProfessor}</span>
                            )}
                        </h2>
                        <Badge variant="outline" className="px-3 py-1">
                            {filteredResources.length} ressource{filteredResources.length > 1 ? 's' : ''}
                        </Badge>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground">Recherche des ressources...</p>
                        </div>
                    ) : filteredResources.length === 0 && selectedProfessor ? (
                        <div className="text-center py-16 border border-dashed border-border rounded-xl">
                            <div className="mx-auto w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
                                <User className="w-7 h-7 text-muted-foreground" />
                            </div>
                            <p className="font-semibold text-foreground mb-1">Aucune ressource de {selectedProfessor}</p>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">Aucun document de ce professeur pour ce module.</p>
                            <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full px-6"
                                onClick={() => {
                                    _savedProfessor = '';
                                    setSelectedProfessor('');
                                }}
                            >
                                Voir tous les professeurs
                            </Button>
                        </div>
                    ) : resources.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-border rounded-xl">
                            <div className="mx-auto w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
                                <FolderOpen className="w-7 h-7 text-muted-foreground" />
                            </div>
                            <p className="font-semibold text-foreground mb-1">Aucune ressource disponible</p>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">Aidez vos camarades en étant le premier à partager une ressource pour ce module !</p>
                            <Link href="/contribute">
                                <Button size="sm" className="rounded-full px-6">Contribuer une ressource</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-8 md:space-y-10">
                            {/* Student Ad Card - compact on mobile, hero on md+ */}
                            {ads.length > 0 && (
                                <div className="bg-gradient-to-r from-primary/5 to-transparent border border-primary/10 rounded-xl overflow-hidden relative">

                                    {/* ── Mobile layout (< md) ── 16:4 banner + content below */}
                                    <div className="flex md:hidden flex-col">
                                        {ads[0].url && (
                                            <div className="w-full aspect-video overflow-hidden">
                                                <img src={ads[0].url} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 p-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <Badge className="bg-primary/10 text-primary border-0 text-[9px] font-black uppercase py-0 px-1.5">Focus</Badge>
                                                </div>
                                                <p className="text-sm font-bold text-foreground line-clamp-1">{ads[0].title}</p>
                                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{ads[0].description}</p>
                                            </div>
                                            {ads[0].link && (
                                                <a href={ads[0].link} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                                    <span className="text-xs font-bold text-primary flex items-center gap-1 bg-primary/5 px-2.5 py-1 rounded-full whitespace-nowrap">
                                                        Voir <ArrowRight className="w-3 h-3" />
                                                    </span>
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Desktop layout (md+) ── hero card */}
                                    <div className="hidden md:flex flex-row gap-8 items-center p-6">
                                        <div className="w-1/3 aspect-video relative rounded-xl overflow-hidden shadow-2xl border-4 border-white">
                                            <img src={ads[0].url} alt="" className="w-full h-full object-cover" />
                                            <div className="absolute top-3 left-3">
                                                <Badge className="bg-white/90 text-primary hover:bg-white text-[10px] font-black uppercase shadow-sm">Focus</Badge>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <h3 className="text-2xl font-black text-foreground mb-2">{ads[0].title}</h3>
                                                <p className="text-muted-foreground text-lg leading-relaxed">{ads[0].description}</p>
                                            </div>
                                            {ads[0].link && (
                                                <a href={ads[0].link} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="default" className="rounded-full shadow-lg hover:shadow-primary/25 transition-all">
                                                        Découvrir l&apos;annonce <ArrowRight className="ml-2 w-4 h-4" />
                                                    </Button>
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    <div className="absolute top-4 right-4 opacity-5 hidden md:block">
                                        <Star className="w-24 h-24 fill-primary text-primary rotate-12" />
                                    </div>
                                </div>
                            )}

                            {RESOURCE_CATEGORIES.map((category) => {
                                const categoryResources = groupedResources[category.id] || [];
                                if (categoryResources.length === 0) return null;

                                return (
                                    <div key={category.id} className="space-y-6">
                                        <div className="flex items-center gap-3 border-b border-border pb-3">
                                            <div className="p-2 bg-muted rounded-lg">
                                                {category.icon}
                                            </div>
                                            <h3 className="text-xl font-bold text-foreground">{category.label}</h3>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {categoryResources.map((resource) => renderResourceCard(resource))}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Handle remaining types not in official list */}
                            {Object.keys(groupedResources).filter(type => !RESOURCE_CATEGORIES.find(c => c.id === type) && type !== 'Autres').map(type => (
                                <div key={type} className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-border pb-3">
                                        <div className="p-2 bg-muted rounded-lg">
                                            <Layers className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-xl font-bold text-foreground">{type}</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {groupedResources[type].map((resource) => renderResourceCard(resource))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </main>
    );
}
