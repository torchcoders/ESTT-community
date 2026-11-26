'use client';

import { useState, useEffect } from 'react';
import { db, ref, onValue, remove, update } from '@/lib/firebase';
import { useDialog } from '@/context/DialogContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, Plus, Search, CheckCircle2, XCircle, Power, UserCheck, FileDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export default function AdminRewardCodes() {
    const { showError, showSuccess, showConfirm } = useDialog();
    const [codes, setCodes] = useState([]);
    const [selectedCodes, setSelectedCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [bulkData, setBulkData] = useState({
        quantity: 10,
        reward: 'esttplus_1month'
    });

    useEffect(() => {
        if (!db) return;

        const rewardCodesRef = ref(db, 'rewardCodes');
        const unsubscribe = onValue(rewardCodesRef, (snapshot) => {
            const data = snapshot.val() || {};
            // Handle both array and object formats from Firebase
            const list = Object.entries(data).map(([id, val]) => ({
                id,
                ...val
            }));
            setCodes(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleBulkGenerate = async (e) => {
        e.preventDefault();
        const qty = parseInt(bulkData.quantity);
        if (isNaN(qty) || qty < 1 || qty > 100) {
            showError('La quantité doit être entre 1 et 100.');
            return;
        }

        setIsCreating(true);
        try {
            const nextIndex = codes.length > 0 ? Math.max(...codes.map(c => parseInt(c.id) || 0)) : -1;
            const updates = {};
            
            for (let i = 0; i < qty; i++) {
                const id = nextIndex + 1 + i;
                const chars = '0123456789';
                let codeString = '';
                for (let j = 0; j < 4; j++) {
                    codeString += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                
                updates[id] = {
                    code: codeString,
                    reward: bulkData.reward,
                    isValid: true,
                    createdAt: Date.now()
                };
            }

            // Using update to add multiple codes at once
            await update(ref(db, 'rewardCodes'), updates);
            
            showSuccess(`${qty} code(s) de récompense généré(s) avec succès !`);
        } catch (error) {
            console.error('Error generating reward codes:', error);
            showError('Erreur lors de la génération des codes');
        } finally {
            setIsCreating(false);
        }
    };

    const toggleSelection = (id) => {
        setSelectedCodes(prev => 
            prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
        );
    };

    const toggleAllSelection = (filteredArray) => {
        const activeIds = filteredArray.filter(c => c.isValid).map(c => c.id);
        const allSelected = activeIds.length > 0 && activeIds.every(id => selectedCodes.includes(id));
        
        if (allSelected) {
            setSelectedCodes(prev => prev.filter(id => !activeIds.includes(id)));
        } else {
            setSelectedCodes(prev => {
                const newSelection = [...prev];
                activeIds.forEach(id => {
                    if (!newSelection.includes(id)) newSelection.push(id);
                });
                return newSelection;
            });
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            await update(ref(db, `rewardCodes/${id}`), {
                isValid: !currentStatus
            });
            showSuccess(`Code ${!currentStatus ? 'activé' : 'désactivé'} !`);
        } catch (error) {
            console.error('Error toggling status:', error);
            showError('Erreur lors de la modification du statut');
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer ce code ?', {
            type: 'danger',
            title: 'Supprimer le code',
            confirmLabel: 'Supprimer'
        });
        if (!confirmed) return;

        try {
            await remove(ref(db, `rewardCodes/${id}`));
            showSuccess('Code supprimé.');
        } catch (error) {
            console.error('Error deleting code:', error);
            showError('Erreur lors de la suppression');
        }
    };

    const handleGeneratePDF = async () => {
        try {
            const activeCodes = codes.filter(c => c.isValid && selectedCodes.includes(c.id));
            if (activeCodes.length === 0) {
                showError("Veuillez sélectionner au moins un code actif pour générer l'affiche.");
                return;
            }
            showSuccess('Génération du PDF en cours...', { duration: 3000 });
            const { generateRewardCodesPDF } = await import('@/lib/generateRewardCodesPDF');
            await generateRewardCodesPDF(activeCodes);
            showSuccess('PDF généré et téléchargé avec succès !');
        } catch (error) {
            console.error('Erreur PDF:', error);
            showError('Erreur lors de la génération du PDF');
        }
    };

    const filteredCodes = codes.filter(c =>
        String(c.code).includes(searchTerm) ||
        c.reward?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tightest text-foreground dark:text-white">
                        Gestion des <span className="text-primary text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">Récompenses QR</span>
                    </h1>
                    <p className="text-muted-foreground font-medium">Gérez les codes promotionnels pour les affiches QR</p>
                </div>
            </div>

            <Card className="border-border overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-primary to-indigo-600 w-full" />
                <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" /> Génération Rapide
                    </CardTitle>
                    <CardDescription>
                        Générez plusieurs codes uniques automatiquement et imprimez-les.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleBulkGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantité</label>
                            <Input
                                type="number"
                                min="1"
                                max="100"
                                value={bulkData.quantity}
                                onChange={(e) => setBulkData({ ...bulkData, quantity: e.target.value })}
                                className="font-mono text-lg text-center h-11"
                                required
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Récompense</label>
                            <Select
                                value={bulkData.reward}
                                onValueChange={(v) => setBulkData({ ...bulkData, reward: v })}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Sélectionner une récompense" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="esttplus_1month">ESTTPlus+ (1 Mois)</SelectItem>
                                    <SelectItem value="esttplus_2month">ESTTPlus+ (2 Mois)</SelectItem>
                                    <SelectItem value="esttplus_12month">ESTTPlus+ (1 An)</SelectItem>
                                    <SelectItem value="esttplus_7day">ESTTPlus+ (7 Jours)</SelectItem>
                                    <SelectItem value="esttplus_15day">ESTTPlus+ (15 Jours)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <Button type="submit" className="w-full h-11 font-bold shadow-lg shadow-primary/20" disabled={isCreating}>
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                Générer ({bulkData.quantity || 0})
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-border">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
                    <div>
                        <CardTitle className="text-xl font-bold">Codes Actifs</CardTitle>
                        <CardDescription>Liste des codes configurés dans la base de données.</CardDescription>
                    </div>
                    <div className="flex w-full max-w-md gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher par code ou récompense..."
                                className="pl-9 h-11 bg-muted border-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            className={cn(
                                "h-11 px-4 gap-2 border-indigo-200 font-semibold transition-all",
                                selectedCodes.length > 0 ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                            )}
                            onClick={handleGeneratePDF}
                            disabled={selectedCodes.length === 0}
                        >
                            <FileDown className="w-4 h-4" />
                            {selectedCodes.length > 0 ? `Affiche PDF (${selectedCodes.length})` : 'Affiche PDF'}
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/80">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="w-12 text-center">
                                        <Checkbox 
                                            checked={
                                                filteredCodes.filter(c => c.isValid).length > 0 && 
                                                filteredCodes.filter(c => c.isValid).every(c => selectedCodes.includes(c.id))
                                            }
                                            onCheckedChange={() => toggleAllSelection(filteredCodes)}
                                        />
                                    </TableHead>
                                    <TableHead className="font-bold py-4">Code</TableHead>
                                    <TableHead className="font-bold py-4">Récompense (Format FB)</TableHead>
                                    <TableHead className="font-bold py-4">Libellé</TableHead>
                                    <TableHead className="font-bold py-4 text-center">Status</TableHead>
                                    <TableHead className="font-bold py-4 text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCodes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">
                                            Aucun code de récompense trouvé.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCodes.map((c) => (
                                        <TableRow key={c.id} className="group border-border">
                                            <TableCell className="text-center py-4">
                                                {c.isValid && (
                                                    <Checkbox 
                                                        checked={selectedCodes.includes(c.id)}
                                                        onCheckedChange={() => toggleSelection(c.id)}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono font-black text-lg text-primary py-4">
                                                {c.code}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground py-4">
                                                {c.reward}
                                            </TableCell>
                                            <TableCell className="font-bold text-foreground py-4">
                                                {c.reward.includes('month') ? c.reward.split('_')[1].replace('month', ' Mois') :
                                                    c.reward.includes('day') ? c.reward.split('_')[1].replace('day', ' Jours') :
                                                        'Récompense Standard'}
                                            </TableCell>
                                            <TableCell className="text-center py-4">
                                                {c.isValid ? (
                                                    <Badge className="bg-emerald-500 hover:bg-emerald-600">
                                                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> ACTIF</span>
                                                    </Badge>
                                                ) : c.usedAt ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Badge className="bg-amber-500 hover:bg-amber-600">
                                                            <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> UTILISÉ</span>
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground max-w-[140px] truncate">
                                                            {c.usedByEmail || c.usedByUid || 'Utilisateur inconnu'}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {new Date(c.usedAt).toLocaleDateString('fr-FR')}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                                        <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> INACTIF</span>
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right py-4 pr-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!c.usedAt && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className={cn(
                                                                "h-10 w-10 rounded-full transition-all",
                                                                c.isValid ? "text-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10"
                                                            )}
                                                            onClick={() => handleToggleStatus(c.id, c.isValid)}
                                                            title={c.isValid ? "Désactiver" : "Activer"}
                                                        >
                                                            <Power className="w-5 h-5" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
                                                        onClick={() => handleDelete(c.id)}
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
