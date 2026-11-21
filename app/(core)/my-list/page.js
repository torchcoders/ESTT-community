'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db as staticDb } from '@/lib/data';
import { db, ref, get, remove as firebaseRemove, onValue } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge, Loader2, BookOpen, ClipboardList, FlaskConical, Layers, ListPlus, Search, X } from 'lucide-react';
import ResourceCard from '@/components/features/resources/ResourceCard';

const TYPE_CATEGORIES = [
    { id: 'all', label: 'Tous', icon: <Layers className="w-5 h-5 text-muted-foreground" /> },
    { id: 'Cours', label: 'Cours', icon: <BookOpen className="w-5 h-5 text-blue-500" /> },
    { id: 'TD', label: 'TD', icon: <ClipboardList className="w-5 h-5 text-indigo-500" /> },
    { id: 'TP', label: 'TP', icon: <FlaskConical className="w-5 h-5 text-emerald-500" /> },
];

export default function MyListPage() {
    const { user, loading: authLoading } = useAuth();
    const { showError } = useDialog();
    const router = useRouter();

    const [favorites, setFavorites] = useState([]);
    const [resources, setResources] = useState({});
    const [loading, setLoading] = useState(true);
    const [togglingFav, setTogglingFav] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedField, setSelectedField] = useState('all');
    const [selectedSemester, setSelectedSemester] = useState('all');
    const [selectedModule, setSelectedModule] = useState('all');
    const [selectedType, setSelectedType] = useState('all');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user || !db) return;

        const favRef = ref(db, `userFavorites/${user.uid}`);
        const unsub = onValue(favRef, (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.entries(data).map(([id, value]) => ({
                id,
                ...value,
            }));
            list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setFavorites(list);
        });

        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (favorites.length === 0) {
            setResources({});
            setLoading(false);
            return;
        }

        const fetchResources = async () => {
            setLoading(true);
            try {
                const resourcesRef = ref(db, 'resources');
                const snap = await get(resourcesRef);
                const allResources = snap.val() || {};

                const map = {};
                favorites.forEach((fav) => {
                    const resourceId = fav.resourceId || fav.id;
                    if (allResources[resourceId]) {
                        map[resourceId] = { id: resourceId, ...allResources[resourceId] };
                    } else {
                        map[resourceId] = {
                            id: resourceId,
                            title: fav.title || 'Ressource',
                            type: fav.type || '',
                            docType: fav.docType || '',
                            field: fav.field || null,
                            moduleId: fav.moduleId || null,
                            semester: fav.semester || null,
                            professor: fav.professor || '',
                            fromFav: true,
                        };
                    }
                });
                setResources(map);
            } catch (err) {
                console.error('Error fetching resources:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchResources();
    }, [favorites]);

    const handleRemoveFavorite = async (e, resourceId) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            setTogglingFav(resourceId);
            const favRef = ref(db, `userFavorites/${user.uid}/${resourceId}`);
            await firebaseRemove(favRef);
        } catch (err) {
            console.error('Error removing favorite:', err);
            showError('Erreur lors de la suppression.');
        } finally {
            setTogglingFav(null);
        }
    };

    const filteredFavorites = useMemo(() => {
        return favorites.filter((fav) => {
            const resource = resources[fav.resourceId || fav.id] || fav;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const title = (resource.title || '').toLowerCase();
                if (!title.includes(q)) return false;
            }

            if (selectedField !== 'all' && resource.field !== selectedField) {
                const matchesInFields = resource.fields && Array.isArray(resource.fields) &&
                    resource.fields.some(f => f.fieldId === selectedField);
                if (!matchesInFields) return false;
            }

            if (selectedSemester !== 'all' && resource.semester !== selectedSemester) return false;

            if (selectedModule !== 'all' && resource.moduleId !== selectedModule && resource.module !== selectedModule) {
                const matchesInFields = resource.fields && Array.isArray(resource.fields) &&
                    resource.fields.some(f => f.moduleId === selectedModule);
                if (!matchesInFields) return false;
            }

            if (selectedType !== 'all') {
                const docType = (resource.docType || '').toLowerCase();
                if (docType !== selectedType.toLowerCase()) return false;
            }

            return true;
        });
    }, [favorites, resources, searchQuery, selectedField, selectedSemester, selectedModule, selectedType]);

    const groupedFavorites = useMemo(() => {
        const groups = {};
        filteredFavorites.forEach((fav) => {
            const resource = resources[fav.resourceId || fav.id] || fav;
            const docType = resource.docType || 'Autres';
            if (!groups[docType]) groups[docType] = [];
            groups[docType].push({ fav, resource });
        });
        return groups;
    }, [filteredFavorites, resources]);

    const modules = selectedField !== 'all' && selectedSemester !== 'all'
        ? staticDb.modules[`${selectedField}-${selectedSemester}`] || []
        : [];

    if (authLoading || !user) {
        return (
            <main className="container py-6 md:py-10">
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                </div>
            </main>
        );
    }

    const renderCard = (resourceId, resource) => (
        <ResourceCard
            key={resourceId}
            resource={{ id: resourceId, ...resource }}
            togglingFav={togglingFav}
            onRemove={handleRemoveFavorite}
        />
    );

    const availableSemesters = selectedField !== 'all'
        ? (staticDb.fields.find(f => f.id === selectedField)?.semesters || staticDb.semesters)
        : staticDb.semesters;

    return (
        <main className="container py-6 md:py-10">
            <section className="mb-8 md:mb-10 text-center">
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">
                    Ma Liste
                </h1>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                    Retrouvez toutes les ressources que vous avez ajoutées à votre liste.
                </p>
            </section>

            <section className="mb-6">
                <div className="relative max-w-md mx-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Rechercher dans ma liste..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-10"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </section>

            <section className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Filière</label>
                    <Select
                        value={selectedField}
                        onValueChange={(value) => {
                            setSelectedField(value);
                            setSelectedSemester('all');
                            setSelectedModule('all');
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Toutes les filières" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Toutes les filières</SelectItem>
                            {staticDb.fields.map((field) => (
                                <SelectItem key={field.id} value={field.id}>
                                    {field.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Semestre</label>
                    <Select
                        value={selectedSemester}
                        onValueChange={(value) => {
                            setSelectedSemester(value);
                            setSelectedModule('all');
                        }}
                        disabled={selectedField === 'all'}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Tous les semestres" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les semestres</SelectItem>
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
                            setSelectedModule(value);
                        }}
                        disabled={selectedSemester === 'all'}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Tous les modules" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les modules</SelectItem>
                            {modules.map((mod) => (
                                <SelectItem key={mod.id} value={mod.id}>
                                    {mod.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">Type</label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger>
                            <SelectValue placeholder="Tous les types" />
                        </SelectTrigger>
                        <SelectContent>
                            {TYPE_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                    {cat.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </section>

            <section>
                <div className="flex items-center justify-between mb-6 border-b pb-3">
                    <h2 className="text-2xl font-semibold tracking-tight">
                        {filteredFavorites.length} ressource{filteredFavorites.length !== 1 ? 's' : ''}
                    </h2>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Chargement de votre liste...</p>
                    </div>
                ) : filteredFavorites.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-border rounded-xl">
                        <div className="mx-auto w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
                            <ListPlus className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <p className="font-semibold text-foreground mb-1">
                            {favorites.length === 0 ? 'Votre liste est vide' : 'Aucun résultat trouvé'}
                        </p>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                            {favorites.length === 0
                                ? 'Ajoutez des ressources depuis la page Ressources pour les retrouver ici.'
                                : 'Essayez de modifier vos filtres pour trouver ce que vous cherchez.'}
                        </p>
                        {favorites.length === 0 && (
                            <Link href="/browse">
                                <Button size="sm" className="rounded-full px-6">Parcourir les ressources</Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8 md:space-y-10">
                        {TYPE_CATEGORIES.filter(cat => cat.id !== 'all').map((category) => {
                            const categoryItems = groupedFavorites[category.id] || [];
                            if (categoryItems.length === 0) return null;

                            return (
                                <div key={category.id} className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-border pb-3">
                                        <div className="p-2 bg-muted rounded-lg">
                                            {category.icon}
                                        </div>
                                        <h3 className="text-xl font-bold text-foreground">{category.label}</h3>
                                        <Badge variant="outline" className="ml-2">{categoryItems.length}</Badge>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {categoryItems.map(({ fav, resource }) => renderCard(fav.resourceId || fav.id, resource))}
                                    </div>
                                </div>
                            );
                        })}

                        {Object.keys(groupedFavorites).filter(type => !TYPE_CATEGORIES.find(c => c.id === type)).map(type => (
                            <div key={type} className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-border pb-3">
                                    <div className="p-2 bg-muted rounded-lg">
                                        <Layers className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground">{type}</h3>
                                    <Badge variant="outline" className="ml-2">{groupedFavorites[type].length}</Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {groupedFavorites[type].map(({ fav, resource }) => renderCard(fav.resourceId || fav.id, resource))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
