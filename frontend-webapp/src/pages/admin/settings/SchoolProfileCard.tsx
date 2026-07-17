import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Globe, Loader2, Save } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { cn } from '../../../lib/utils';
import { getApiErrorMessage } from '../../../services/apiError';
import { updateTenant } from '../../../services/tenants';
import type { AdminTenant } from '../../../types/admin';

interface SchoolProfileCardProps {
    tenant: AdminTenant;
    onTenantChange: (tenant: AdminTenant) => void;
}

const normalized = (value: string | null | undefined) => value?.trim() || '';

export const SchoolProfileCard = ({ tenant, onTenantChange }: SchoolProfileCardProps) => {
    const [name, setName] = useState(tenant.name);
    const [description, setDescription] = useState(tenant.description || '');
    const [vipGroupLink, setVipGroupLink] = useState(tenant.vip_group_link || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setName(tenant.name);
        setDescription(tenant.description || '');
        setVipGroupLink(tenant.vip_group_link || '');
    }, [tenant]);

    const hasChanges = useMemo(() => (
        normalized(name) !== normalized(tenant.name)
        || normalized(description) !== normalized(tenant.description)
        || normalized(vipGroupLink) !== normalized(tenant.vip_group_link)
    ), [description, name, tenant, vipGroupLink]);
    const hasMeaningfulDescription = description.trim().length >= 20;

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!name.trim() || !hasMeaningfulDescription || !hasChanges || isSaving) return;

        setIsSaving(true);
        setError(null);
        try {
            const updatedTenant = await updateTenant(tenant.id, {
                name: name.trim(),
                description: description.trim() || null,
                vip_group_link: vipGroupLink.trim() || null,
            });
            onTenantChange({ ...tenant, ...updatedTenant });
            setIsSaved(true);
            window.setTimeout(() => setIsSaved(false), 3000);
        } catch (requestError) {
            console.error('Failed to update school profile:', requestError);
            setError(getApiErrorMessage(requestError, 'Не удалось сохранить профиль школы.'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary"><Globe size={20} aria-hidden="true" /></div>
                    <CardTitle className="text-lg">Профиль школы</CardTitle>
                </div>
                <CardDescription className="text-xs leading-5">Название и короткое описание, которые увидят ученики.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="school-name" className="px-1 text-xs text-muted-foreground">Название школы</Label>
                        <Input id="school-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={160} required className="h-11 bg-muted/30" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="school-description" className="px-1 text-xs text-muted-foreground">Описание школы</Label>
                        <Textarea id="school-description" value={description} onChange={(event) => setDescription(event.target.value)} minLength={20} maxLength={2000} rows={4} required placeholder="Чему учит школа и для кого она создана" className="bg-muted/30" />
                        <div className="flex justify-between gap-3 px-1 text-[11px] text-muted-foreground">
                            <span>{hasMeaningfulDescription ? 'Описание готово' : 'Минимум 20 содержательных символов'}</span>
                            <span>{description.length} / 2000</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="school-vip-link" className="px-1 text-xs text-muted-foreground">Ссылка на оплату / VIP-группу</Label>
                        <Input id="school-vip-link" value={vipGroupLink} onChange={(event) => setVipGroupLink(event.target.value)} placeholder="https://t.me/..." className="h-11 bg-muted/30" />
                        <p className="px-1 text-xs leading-5 text-muted-foreground">Ученики увидят её при попытке открыть VIP-курс.</p>
                    </div>
                    {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
                    <div className="flex justify-center pt-2">
                        <Button type="submit" disabled={isSaving || !name.trim() || !hasMeaningfulDescription || !hasChanges} className={cn('h-12 rounded-lg px-10 text-sm font-bold', isSaved && 'bg-success text-primary-foreground hover:bg-success/90')}>
                            {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : isSaved ? <CheckCircle2 className="mr-2 h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />}
                            {isSaving ? 'Сохраняем…' : isSaved ? 'Сохранено' : 'Сохранить профиль'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};
