'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { db, ref, update } from '@/lib/firebase';
import { db as staticDb } from '@/lib/data';
import { useDialog } from '@/context/DialogContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function ProfileCompletionDialog({ isOpen, user, profile }) {
    const { showError } = useDialog();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        filiere: '',
        startYear: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setFormData({
            firstName: profile?.firstName || '',
            lastName: profile?.lastName || '',
            filiere: profile?.filiere && !profile.filiere.toLowerCase().includes('compl') ? profile.filiere : '',
            startYear: profile?.startYear || '',
        });
    }, [profile]);

    const handleChange = (name, value) => {
        setFormData((previous) => ({ ...previous, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const values = Object.values(formData).map((value) => value.trim());
        if (values.some((value) => !value)) {
            showError('Veuillez renseigner tous les champs pour continuer.');
            return;
        }

        setSaving(true);
        try {
            await update(ref(db, `users/${user.uid}`), {
                ...formData,
                updatedAt: Date.now(),
            });
        } catch (error) {
            console.error('Error completing profile:', error);
            showError('Impossible de compléter votre profil pour le moment.');
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-lg rounded-2xl [&>button]:hidden">
                <DialogHeader>
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                        <div>
                            <DialogTitle>Complétez votre profil</DialogTitle>
                            <DialogDescription className="mt-2">
                                Ces informations sont nécessaires avant de continuer à utiliser la plateforme.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="completion-first-name">Prénom</Label>
                            <Input
                                id="completion-first-name"
                                value={formData.firstName}
                                onChange={(event) => handleChange('firstName', event.target.value)}
                                disabled={saving}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="completion-last-name">Nom</Label>
                            <Input
                                id="completion-last-name"
                                value={formData.lastName}
                                onChange={(event) => handleChange('lastName', event.target.value)}
                                disabled={saving}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="completion-filiere">Filière</Label>
                        <Select
                            value={formData.filiere}
                            onValueChange={(value) => handleChange('filiere', value)}
                            disabled={saving}
                            required
                        >
                            <SelectTrigger id="completion-filiere">
                                <SelectValue placeholder="Sélectionnez votre filière" />
                            </SelectTrigger>
                            <SelectContent>
                                {staticDb.fields.map((field) => (
                                    <SelectItem key={field.id} value={field.id}>{field.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="completion-start-year">Année d'entrée</Label>
                        <Input
                            id="completion-start-year"
                            type="number"
                            min="2023"
                            max={new Date().getFullYear()}
                            value={formData.startYear}
                            onChange={(event) => handleChange('startYear', event.target.value)}
                            disabled={saving}
                            required
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enregistrer et continuer
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
