import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Save, Video } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Textarea } from '../../../components/ui/textarea';
import { cn } from '../../../lib/utils';
import { updateTenant } from '../../../services/tenants';
import type { AdminTenant } from '../../../types/admin';

interface WelcomeVideoSettingsCardProps {
    tenant: AdminTenant;
    onTenantChange: (tenant: AdminTenant) => void;
}

interface WelcomeVideoFormState {
    enabled: boolean;
    url: string;
    title: string;
    description: string;
}

const normalizeOptionalText = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

const getFormState = (tenant: AdminTenant): WelcomeVideoFormState => ({
    enabled: Boolean(tenant.welcome_video_enabled),
    url: tenant.welcome_video_url || '',
    title: tenant.welcome_video_title || '',
    description: tenant.welcome_video_description || '',
});

export const WelcomeVideoSettingsCard = ({ tenant, onTenantChange }: WelcomeVideoSettingsCardProps) => {
    const [form, setForm] = useState<WelcomeVideoFormState>(() => getFormState(tenant));
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        setForm(getFormState(tenant));
    }, [tenant]);

    const payload = {
        welcome_video_enabled: form.enabled,
        welcome_video_url: normalizeOptionalText(form.url),
        welcome_video_title: normalizeOptionalText(form.title),
        welcome_video_description: normalizeOptionalText(form.description),
    };

    const hasChanges =
        payload.welcome_video_enabled !== Boolean(tenant.welcome_video_enabled) ||
        payload.welcome_video_url !== normalizeOptionalText(tenant.welcome_video_url) ||
        payload.welcome_video_title !== normalizeOptionalText(tenant.welcome_video_title) ||
        payload.welcome_video_description !== normalizeOptionalText(tenant.welcome_video_description);

    const isMissingEnabledUrl = form.enabled && !payload.welcome_video_url;

    const updateField = <Field extends keyof WelcomeVideoFormState>(
        field: Field,
        value: WelcomeVideoFormState[Field]
    ) => {
        setForm((current) => ({ ...current, [field]: value }));
        setIsSaved(false);
        setErrorMessage(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!hasChanges || isMissingEnabledUrl) return;

        setIsSaving(true);
        setErrorMessage(null);
        try {
            const updatedTenant = await updateTenant(tenant.id, payload);
            onTenantChange({ ...tenant, ...payload, ...updatedTenant });
            setIsSaved(true);
            window.setTimeout(() => setIsSaved(false), 3000);
        } catch (err) {
            console.error('Failed to save welcome video:', err);
            setErrorMessage('Не удалось сохранить видео. Попробуйте еще раз.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-sky-500/10 p-2 text-sky-600">
                        <Video size={20} />
                    </div>
                    <CardTitle className="text-lg">Приветственное видео</CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                    Покажите ученикам короткое личное обращение на главной странице.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-muted/20 p-4">
                        <div className="min-w-0 space-y-1">
                            <Label htmlFor="welcome-video-enabled" className="text-sm font-semibold">
                                Показывать ученикам
                            </Label>
                            <p className="text-xs leading-5 text-muted-foreground">
                                Видео появится вверху главной ученика, если ссылка заполнена.
                            </p>
                        </div>
                        <Switch
                            id="welcome-video-enabled"
                            checked={form.enabled}
                            onCheckedChange={(checked) => updateField('enabled', checked)}
                            aria-label="Показывать приветственное видео"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="welcome-video-url" className="px-1 text-xs font-medium text-muted-foreground">
                            Ссылка на видео
                        </Label>
                        <Input
                            id="welcome-video-url"
                            type="url"
                            value={form.url}
                            onChange={(event) => updateField('url', event.target.value)}
                            placeholder="https://youtu.be/..."
                            className="h-11 rounded-lg border border-border bg-muted/30 focus-visible:ring-primary/20"
                        />
                        <p className="px-1 text-xs leading-5 text-muted-foreground">
                            Поддерживаются прямые видеофайлы, YouTube, Vimeo и Loom. Для других ссылок будет кнопка открытия.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="welcome-video-title" className="px-1 text-xs font-medium text-muted-foreground">
                            Заголовок
                        </Label>
                        <Input
                            id="welcome-video-title"
                            value={form.title}
                            onChange={(event) => updateField('title', event.target.value)}
                            placeholder="Добро пожаловать в школу"
                            className="h-11 rounded-lg border border-border bg-muted/30 focus-visible:ring-primary/20"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="welcome-video-description" className="px-1 text-xs font-medium text-muted-foreground">
                            Короткое описание
                        </Label>
                        <Textarea
                            id="welcome-video-description"
                            value={form.description}
                            onChange={(event) => updateField('description', event.target.value)}
                            placeholder="Пара слов от владельца школы перед началом обучения."
                            className="min-h-[96px] resize-y bg-muted/30 focus-visible:ring-primary/20"
                        />
                    </div>

                    {(isMissingEnabledUrl || errorMessage) && (
                        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                            {errorMessage || 'Добавьте ссылку, чтобы включить видео для учеников.'}
                        </p>
                    )}

                    <div className="flex justify-center pt-2">
                        <Button
                            type="submit"
                            disabled={isSaving || !hasChanges || isMissingEnabledUrl}
                            className={cn(
                                "h-12 rounded-lg px-10 text-sm font-bold shadow-sm transition-all active:scale-[0.99]",
                                isSaved
                                    ? "bg-success text-white hover:bg-success/90"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                        >
                            {isSaving ? (
                                <Loader2 className="mr-2 animate-spin" size={20} />
                            ) : isSaved ? (
                                <CheckCircle2 size={20} className="mr-2 animate-in zoom-in duration-300" />
                            ) : (
                                <Save size={20} className="mr-2" />
                            )}
                            {isSaved ? 'Сохранено' : 'Сохранить'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};
