'use client';

import { useState, useMemo } from 'react';
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
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ExternalLink, Search, ArrowUpDown, Users, BookOpen, ShieldCheck } from 'lucide-react';

const ROLE_OPTIONS = [
    { value: 'all', label: 'Tous les rôles' },
    { value: 'admin', label: 'Admin' },
    { value: 'moderator', label: 'Modérateur' },
    { value: 'contributor', label: 'Contributeur' },
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

const ROLE_BADGE_CLASSES = {
    admin: 'bg-yellow-400 text-white hover:bg-yellow-500 border-none',
    moderator: 'bg-blue-600 text-white hover:bg-blue-700 border-none',
    contributor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40',
};

export default function AdminUsers({ users }) {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [roleFilter, setRoleFilter] = useState('all');
    const [filiereFilter, setFiliereFilter] = useState('all');
    const [verifiedFilter, setVerifiedFilter] = useState('all');

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

            {/* Table */}
            <Card className="border-none shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted">
                        <TableRow>
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
                                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                                    Aucun utilisateur ne correspond à votre recherche.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((u) => (
                                <TableRow key={u.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="font-bold text-sm">{u.firstName} {u.lastName}</TableCell>
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
                                        <Button size="sm" variant="ghost" asChild>
                                            <a href={`/profile/${u.id}`} target="_blank">
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
