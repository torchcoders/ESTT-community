import { useState, useMemo } from 'react';
import { db, ref, set } from '@/lib/firebase';
import { db as staticDb } from '@/lib/data'; // Import static data for filieres/modules
import { useDialog } from '@/context/DialogContext';
import {
    Users,
    FileText,
    AlertCircle,
    ArrowUpRight,
    Search as SearchIcon,
    Loader2,
    PieChart as PieChartIcon,
    BarChart3,
    Clock,
    } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip, 
    Legend 
} from 'recharts';

const TYPE_COLORS = ['#3b82f6', '#f59e0b', '#ec4899', '#10b981', '#6366f1'];
const STATUS_COLORS = { 'Vérifié': '#10b981', 'En attente': '#ef4444' };
const EMAIL_STATUS_COLORS = { 'Vérifié': '#10b981', 'Non vérifié': '#f59e0b' };
const BUG_STATUS_COLORS = { 'Corrigé': '#10b981', 'En cours': '#f59e0b', 'Non vu': '#3b82f6' };
const USER_FIELD_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'];

function getTimestamp(value) {
    if (typeof value === 'number') return value;
    if (value && typeof value.seconds === 'number') return value.seconds * 1000;

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
}

function calculateGrowth(items, now, periodDays) {
    const currentPeriodStart = now - (periodDays * 24 * 60 * 60 * 1000);
    const previousPeriodStart = now - (2 * periodDays * 24 * 60 * 60 * 1000);
    let currentCount = 0;
    let previousCount = 0;

    items.forEach(item => {
        const timestamp = getTimestamp(item.createdAt);
        if (timestamp === null) return;

        if (timestamp >= currentPeriodStart && timestamp <= now) {
            currentCount++;
        } else if (timestamp >= previousPeriodStart && timestamp < currentPeriodStart) {
            previousCount++;
        }
    });

    if (previousCount === 0) {
        return currentCount > 0 ? null : 0;
    }

    return Math.round(((currentCount - previousCount) / previousCount) * 100);
}

export default function AdminOverview({ stats, resources, users = [], bugReports = [], setActiveTab }) {
    const { showSuccess, showError, showConfirm } = useDialog();
    const [rebuilding, setRebuilding] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Mounting check for Recharts in Next.js
    useState(() => {
        setIsMounted(true);
    }, []);

    // Filter states for modules explorer
    const [selectedField, setSelectedField] = useState(staticDb.fields[0]?.id || 'ia');
    const [selectedSem, setSelectedSem] = useState('S1');
    const [growthPeriod, setGrowthPeriod] = useState('7');

    const growth = useMemo(() => {
        const now = Date.now();
        const periodDays = Number(growthPeriod);

        return {
            users: calculateGrowth(users, now, periodDays),
            resources: calculateGrowth(resources, now, periodDays)
        };
    }, [growthPeriod, resources, users]);
    const growthPeriodLabel = growthPeriod === '1'
        ? 'les dernières 24 heures'
        : `les ${growthPeriod} derniers jours`;

    const handleExport = () => {
        try {
            const rows = [
                ['Section', 'Indicateur', 'Valeur', 'Détails'],
                ['Résumé', 'Utilisateurs', stats.users, 'Nombre total'],
                ['Résumé', 'Ressources', stats.resources, 'Nombre total'],
                ['Résumé', 'Ressources en attente', stats.pending, 'Ressources non vérifiées'],
                ['Évolution', 'Utilisateurs', growth.users === null ? 'Nouveau' : `${growth.users}%`, growthPeriodLabel],
                ['Évolution', 'Ressources', growth.resources === null ? 'Nouveau' : `${growth.resources}%`, growthPeriodLabel],
                ['Filtres', 'Filière', selectedField, 'Répartition par module'],
                ['Filtres', 'Semestre', selectedSem, 'Répartition par module'],
                ['Filtres', 'Période de croissance', growthPeriodLabel, ''],
            ];

            const chartSections = [
                ['Types de ressources', chartData.types],
                ['Statut des ressources', chartData.status],
                ['Vérification des emails', chartData.emailStatus],
                ['Statut des bugs', chartData.bugStatus],
                ['Ressources par filière', chartData.fields],
                ['Ressources par module', chartData.modules],
                ['Utilisateurs par filière', chartData.userFields],
            ];

            chartSections.forEach(([section, entries]) => {
                entries.forEach(({ name, value }) => {
                    rows.push([section, name, value, '']);
                });
            });

            const report = rows
                .map(([section, indicator, value, details]) => {
                    const suffix = details ? ` (${details})` : '';
                    return `${section} | ${indicator} | ${value}${suffix}`;
                })
                .join('\r\n');
            const blob = new Blob([`\uFEFF${report}`], { type: 'text/plain;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);

            link.href = url;
            link.download = `admin-overview-${date}.txt`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            showSuccess('Les données du tableau de bord ont été exportées.');
        } catch (error) {
            console.error('Failed to export admin overview:', error);
            showError("Erreur lors de l'exportation des données.");
        }
    };

    // Compute chart data
    const chartData = useMemo(() => {
        const typeMap = {};
        const statusMap = { 'Vérifié': 0, 'En attente': 0 };
        const fieldMap = {};
        const emailStatusMap = { 'Vérifié': 0, 'Non vérifié': 0 };
        const bugStatusMap = { 'Corrigé': 0, 'En cours': 0, 'Non vu': 0 };
        
        resources.forEach(res => {
            // Type
            const type = res.docType || 'Autre';
            typeMap[type] = (typeMap[type] || 0) + 1;

            // Status
            const status = res.unverified ? 'En attente' : 'Vérifié';
            statusMap[status] = (statusMap[status] || 0) + 1;

            // Count the resource once for every filière where it is available.
            const linkedFields = new Set([
                res.field,
                ...(Array.isArray(res.fields) ? res.fields.map(link => link.fieldId) : [])
            ].filter(Boolean));
            if (linkedFields.size === 0) linkedFields.add('Inconnu');
            linkedFields.forEach(field => {
                fieldMap[field] = (fieldMap[field] || 0) + 1;
            });
        });

        // Interactive Modules logic
        const selectedKey = `${selectedField}-${selectedSem}`;
        const modulesList = staticDb.modules[selectedKey] || [];
        const moduleCounts = modulesList.map(mod => {
            const count = resources.filter(res => {
                const matchesDirectModule = res.field === selectedField &&
                    res.semester === selectedSem &&
                    (res.module === mod.name || res.moduleId === mod.id);
                const matchesLinkedModule = Array.isArray(res.fields) &&
                    res.fields.some(link =>
                        link.fieldId === selectedField &&
                        link.moduleId === mod.id &&
                        (!link.semester || link.semester === selectedSem)
                    );
                return matchesDirectModule || matchesLinkedModule;
            }).length;
            return { name: mod.name, value: count };
        });

        // Users by Field distribution
        const userFieldMap = {};
        users.forEach(u => {
            const emailStatus = u.verifiedEmail === true ? 'Vérifié' : 'Non vérifié';
            emailStatusMap[emailStatus] += 1;

            const fieldId = u.filiere || 'Autre';
            const fieldName = staticDb.fields.find(f => f.id === fieldId)?.name || fieldId;
            userFieldMap[fieldName] = (userFieldMap[fieldName] || 0) + 1;
        });

        bugReports.forEach(bug => {
            if (bug.status === 'fixed' || bug.status === 'closed') {
                bugStatusMap['Corrigé'] += 1;
            } else if (bug.status === 'in-progress') {
                bugStatusMap['En cours'] += 1;
            } else {
                bugStatusMap['Non vu'] += 1;
            }
        });

        return {
            types: Object.entries(typeMap).map(([name, value]) => ({ name, value })),
            status: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
            emailStatus: Object.entries(emailStatusMap).map(([name, value]) => ({ name, value })),
            bugStatus: Object.entries(bugStatusMap).map(([name, value]) => ({ name, value })),
            fields: Object.entries(fieldMap)
                .map(([name, value]) => ({ 
                    name: staticDb.fields.find(f => f.id === name)?.name || name, 
                    value 
                }))
                .sort((a, b) => b.value - a.value),
            modules: moduleCounts,
            userFields: Object.entries(userFieldMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
        };
    }, [resources, users, bugReports, selectedField, selectedSem]);

    const handleRebuildIndex = async () => {
        const confirmed = await showConfirm("Voulez-vous vraiment reconstruire l'index de recherche ? Cela indexera toutes les ressources existantes.", {
            type: 'warning',
            title: 'Reconstruire l\'index',
            confirmLabel: 'Reconstruire'
        });
        if (!confirmed) return;

        setRebuilding(true);
        try {
            let count = 0;
            for (const res of resources) {
                if (!res.title || res.unverified) continue;

                const fields = new Set([
                    res.field,
                    ...(Array.isArray(res.fields) ? res.fields.map(link => link.fieldId) : [])
                ].filter(Boolean));
                for (const field of fields) {
                    const keywordRef = ref(db, `metadata/keywords/${field}/${res.id}`);
                    await set(keywordRef, {
                        title: res.title,
                        resourceId: res.id
                    });
                    count++;
                }
            }
            showSuccess(`Index reconstruit avec succès ! ${count} ressources indexées.`);
        } catch (error) {
            console.error("Error rebuilding index:", error);
            showError("Erreur lors de la reconstruction de l'index.");
        } finally {
            setRebuilding(false);
        }
    };

    const availableSemesters = selectedField 
        ? (staticDb.fields.find(f => f.id === selectedField)?.semesters || staticDb.semesters)
        : staticDb.semesters;

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Tableau de bord</h1>
                    <p className="text-muted-foreground">Analyses et gestion de la communauté.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={growthPeriod} onValueChange={setGrowthPeriod}>
                        <SelectTrigger className="w-[145px] rounded-xl">
                            <SelectValue placeholder="Période" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Dernières 24 heures</SelectItem>
                            <SelectItem value="3">3 derniers jours</SelectItem>
                            <SelectItem value="7">7 derniers jours</SelectItem>
                            <SelectItem value="30">30 derniers jours</SelectItem>
                            <SelectItem value="90">90 derniers jours</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-primary border-primary/20 hover:bg-primary/5 rounded-xl px-4"
                        onClick={handleRebuildIndex}
                        disabled={rebuilding}
                    >
                        {rebuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
                        Reconstruire l&apos;index
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-xl px-4"
                        onClick={handleExport}
                    >
                        <ArrowUpRight className="w-4 h-4" /> Exporter
                    </Button>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <Card className="border-none shadow-sm bg-card overflow-hidden group col-span-1">
                    <div className="h-1 bg-blue-600 w-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between mb-2 md:mb-4">
                            <div className="p-1.5 md:p-2 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-500/15 dark:text-blue-300">
                                <Users className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                            <Badge variant="outline" title={`Évolution sur ${growthPeriodLabel} par rapport à la période précédente`} className="text-[9px] md:text-[10px] border-blue-100 text-blue-600">
                                {growth.users === null ? 'Nouveau' : `${growth.users >= 0 ? '+' : ''}${growth.users}%`}
                            </Badge>
                        </div>
                        <p className="text-[10px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Utilisateurs</p>
                        <h3 className="text-xl md:text-3xl font-black mt-1">{stats.users}</h3>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-card overflow-hidden group col-span-1">
                    <div className="h-1 bg-purple-600 w-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between mb-2 md:mb-4">
                            <div className="p-1.5 md:p-2 bg-purple-50 text-purple-600 rounded-lg dark:bg-purple-500/15 dark:text-purple-300">
                                <FileText className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                            <Badge variant="outline" title={`Évolution sur ${growthPeriodLabel} par rapport à la période précédente`} className="text-[9px] md:text-[10px] border-purple-100 text-purple-600">
                                {growth.resources === null ? 'Nouveau' : `${growth.resources >= 0 ? '+' : ''}${growth.resources}%`}
                            </Badge>
                        </div>
                        <p className="text-[10px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Ressources</p>
                        <h3 className="text-xl md:text-3xl font-black mt-1">{stats.resources}</h3>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-primary text-white overflow-hidden col-span-1">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between mb-2 md:mb-4">
                            <div className="p-1.5 md:p-2 bg-white/20 text-white rounded-lg">
                                <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                        </div>
                        <p className="text-[10px] md:text-sm font-bold opacity-80 uppercase tracking-wider">En attente</p>
                        <h3 className="text-xl md:text-3xl font-black mt-1">{stats.pending}</h3>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => setActiveTab && setActiveTab('activity')}
                    className="border-none shadow-sm bg-card overflow-hidden group col-span-1 cursor-pointer hover:shadow-md transition-all border-dashed hover:border-primary/40"
                >
                    <div className="h-1 bg-emerald-500 w-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between mb-2 md:mb-4">
                            <div className="p-1.5 md:p-2 bg-emerald-50 text-emerald-600 rounded-lg dark:bg-emerald-500/15 dark:text-emerald-300">
                                <Clock className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                            <Badge variant="outline" className="text-[9px] md:text-[10px] border-emerald-100 text-emerald-600 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950">
                                Nouveau
                            </Badge>
                        </div>
                        <p className="text-[10px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Temps d&apos;activité</p>
                        <h3 className="text-sm md:text-base font-bold mt-2 text-primary group-hover:underline flex items-center gap-1">
                            Voir statistiques →
                        </h3>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Repartition par Type & Statut */}
                <Card className="border-none shadow-sm bg-card lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Analyse des Ressources</CardTitle>
                            <CardDescription>Par type de document et statut.</CardDescription>
                        </div>
                        <PieChartIcon className="w-5 h-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-4 min-h-[300px]">
                            {isMounted ? (
                                <>
                                    <div className="h-[250px] md:h-auto relative">
                                        <p className="text-[10px] font-black uppercase text-center mb-2 tracking-widest text-muted-foreground">Types</p>
                                        <ResponsiveContainer width="100%" height="90%">
                                            <PieChart>
                                                <Pie
                                                    data={chartData.types}
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {chartData.types.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                    itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                                                />
                                                <Legend 
                                                    verticalAlign="bottom" 
                                                    height={48} 
                                                    iconType="circle" 
                                                    wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', bottom: -10 }} 
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="h-[250px] md:h-auto relative">
                                        <p className="text-[10px] font-black uppercase text-center mb-2 tracking-widest text-muted-foreground">Statut</p>
                                        <ResponsiveContainer width="100%" height="90%">
                                            <PieChart>
                                                <Pie
                                                    data={chartData.status}
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {chartData.status.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                    itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                                                />
                                                <Legend 
                                                    verticalAlign="bottom" 
                                                    height={48} 
                                                    iconType="circle" 
                                                    wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', bottom: -10 }} 
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            ) : (
                                <div className="col-span-2 flex items-center justify-center h-[300px]">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* User Email Verification */}
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Vérification des emails</CardTitle>
                            <CardDescription>Utilisateurs avec une adresse email vérifiée.</CardDescription>
                        </div>
                        <PieChartIcon className="w-5 h-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            {isMounted ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData.emailStatus}
                                            innerRadius={75}
                                            outerRadius={105}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {chartData.emailStatus.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={EMAIL_STATUS_COLORS[entry.name]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={48}
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Bug Reports Status */}
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Statut des bugs</CardTitle>
                            <CardDescription>Bugs corrigés, en cours et non vus.</CardDescription>
                        </div>
                        <BarChart3 className="w-5 h-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            {isMounted ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData.bugStatus}
                                            innerRadius={75}
                                            outerRadius={105}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {chartData.bugStatus.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={BUG_STATUS_COLORS[entry.name]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={48}
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Popularite Filiere & Modules */}
                <Card className="border-none shadow-sm bg-card lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Popularité</CardTitle>
                            <CardDescription>Top filières et modules actifs.</CardDescription>
                        </div>
                        <BarChart3 className="w-5 h-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {isMounted ? (
                                <>
                                    <div className="h-[200px] md:h-[140px]">
                                        <p className="text-[10px] font-black uppercase mb-2 tracking-widest text-muted-foreground">Top Filières</p>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData.fields} layout="vertical">
                                                <XAxis type="number" hide />
                                                <YAxis 
                                                    dataKey="name" 
                                                    type="category" 
                                                    stroke="#94a3b8" 
                                                    fontSize={8} 
                                                    width={70} 
                                                    tickFormatter={(val) => val.split(' ')[0]} 
                                                />
                                                <Tooltip 
                                                    cursor={{ fill: '#f8fafc' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                    itemStyle={{ fontSize: '10px' }}
                                                />
                                                <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={12} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    
                                    <hr className="border-border" />

                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Explorateur de Modules</p>
                                            <div className="flex gap-2 w-full sm:w-auto">
                                                <Select value={selectedField} onValueChange={setSelectedField}>
                                                    <SelectTrigger className="w-full sm:w-[120px] h-7 text-[10px] uppercase font-bold rounded-lg px-2">
                                                        <SelectValue placeholder="Filière" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {staticDb.fields.map(f => (
                                                            <SelectItem key={f.id} value={f.id} className="text-[10px] font-bold uppercase">{f.id.toUpperCase()}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Select value={selectedSem} onValueChange={setSelectedSem}>
                                                    <SelectTrigger className="w-full sm:w-[80px] h-7 text-[10px] uppercase font-bold rounded-lg px-2">
                                                        <SelectValue placeholder="Sem." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableSemesters.map(s => (
                                                            <SelectItem key={s} value={s} className="text-[10px] font-bold uppercase">{s}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        
                                        <div className="h-[200px] md:h-[150px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartData.modules}>
                                                    <XAxis 
                                                        dataKey="name" 
                                                        stroke="#94a3b8" 
                                                        fontSize={7} 
                                                        tickFormatter={(val) => val.length > 6 ? val.slice(0, 5) + '..' : val} 
                                                        interval={0}
                                                    />
                                                    <YAxis fontSize={8} stroke="#94a3b8" />
                                                    <Tooltip 
                                                        cursor={{ fill: '#f8fafc' }}
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                        itemStyle={{ fontSize: '10px' }}
                                                    />
                                                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={15} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="h-[340px] flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User Distribution */}
                <Card className="border-none shadow-sm bg-card overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border">
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Utilisateurs par Filière</CardTitle>
                            <CardDescription>Répartition démographique.</CardDescription>
                        </div>
                        <Users className="w-5 h-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[300px] md:h-[250px]">
                            {isMounted ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.userFields} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis 
                                            dataKey="name" 
                                            type="category" 
                                            stroke="#94a3b8" 
                                            fontSize={9} 
                                            width={100} 
                                            tickFormatter={(val) => val.length > 15 ? val.slice(0, 12) + '...' : val} 
                                        />
                                        <Tooltip 
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            itemStyle={{ fontSize: '10px' }}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                                            {chartData.userFields.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={USER_FIELD_COLORS[index % USER_FIELD_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Resources */}
                <Card className="border-none shadow-sm bg-card overflow-hidden">
                    <CardHeader className="border-b border-border">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">Dernières Ressources</CardTitle>
                        <CardDescription>Les 5 ressources les plus récentes ajoutées.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {resources.slice(0, 5).map((res) => (
                                <div key={res.id} className="flex items-center justify-between p-4 hover:bg-muted transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 dark:bg-blue-500/15 dark:text-blue-300">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold truncate">{res.title}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-black truncate" title={res.fullModuleName || res.module}>{res.fullModuleName || res.module}</p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 ml-4">
                                        {res.unverified ? (
                                            <Badge variant="destructive" className="text-[8px] font-black uppercase tracking-tighter rounded-md">En attente</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter text-green-600 border-green-100 bg-green-50 rounded-md dark:text-green-300 dark:border-green-500/40 dark:bg-green-500/10">Vérifié</Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-muted/50">
                            <Button variant="ghost" className="w-full text-xs font-bold uppercase tracking-widest text-primary hover:bg-card" onClick={() => setActiveTab('resources')}>
                                Voir toutes les ressources <ArrowUpRight className="ml-2 w-3 h-3" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
