/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, ExternalLink, Image, Loader2, Palette, Save } from 'lucide-react';

import api from '../../../api/client';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { cn } from '../../../lib/utils';
import { getApiErrorMessage } from '../../../services/apiError';
import type { AdminTenant } from '../../../types/admin';

interface SchoolBrandingCardProps {
    tenant: AdminTenant;
    onTenantChange: (tenant: AdminTenant) => void;
}

interface BrandingForm {
    logoUrl: string;
    accentColor: string;
    supportUrl: string;
}

type BrandingField = keyof BrandingForm;
type BrandingErrors = Partial<Record<BrandingField, string>>;

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const normalizeOptionalText = (value: string | null | undefined) => value?.trim() || null;

const normalizeAccentColor = (value: string | null | undefined) => {
    const normalized = normalizeOptionalText(value);
    return normalized ? normalized.toUpperCase() : null;
};

const getForm = (tenant: AdminTenant): BrandingForm => ({
    logoUrl: tenant.logo_url || '',
    accentColor: tenant.accent_color || '',
    supportUrl: tenant.support_url || '',
});

const validateHttpsUrl = (value: string, label: string) => {
    const normalized = value.trim();
    if (!normalized) return null;

    try {
        const parsed = new URL(normalized);
        if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
            return `${label} должна быть публичной HTTPS-ссылкой без логина и пароля.`;
        }
        return null;
    } catch {
        return `${label} должна быть корректной HTTPS-ссылкой.`;
    }
};

const validateField = (field: BrandingField, value: string) => {
    if (field === 'logoUrl') return validateHttpsUrl(value, 'Ссылка на логотип');
    if (field === 'supportUrl') return validateHttpsUrl(value, 'Ссылка поддержки');
    if (value.trim() && !HEX_COLOR_PATTERN.test(value.trim())) {
        return 'Цвет должен быть записан в формате #RRGGBB, например #2563EB.';
    }
    return null;
};

const getErrors = (form: BrandingForm): BrandingErrors => {
    const entries = (Object.keys(form) as BrandingField[])
        .map((field) => [field, validateField(field, form[field])] as const)
        .filter((entry): entry is readonly [BrandingField, string] => Boolean(entry[1]));
    return Object.fromEntries(entries);
};

export const SchoolBrandingCard = ({ tenant, onTenantChange }: SchoolBrandingCardProps) => {
    const [form, setForm] = useState<BrandingForm>(() => getForm(tenant));
    const [touched, setTouched] = useState<Partial<Record<BrandingField, boolean>>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [requestError, setRequestError] = useState<string | null>(null);

    useEffect(() => {
        setForm(getForm(tenant));
        setTouched({});
    }, [tenant]);

    const errors = useMemo(() => getErrors(form), [form]);
    const payload = useMemo(() => ({
        logo_url: normalizeOptionalText(form.logoUrl),
        accent_color: normalizeAccentColor(form.accentColor),
        support_url: normalizeOptionalText(form.supportUrl),
    }), [form]);

    const hasChanges =
        payload.logo_url !== normalizeOptionalText(tenant.logo_url)
        || payload.accent_color !== normalizeAccentColor(tenant.accent_color)
        || payload.support_url !== normalizeOptionalText(tenant.support_url);
    const hasErrors = Object.keys(errors).length > 0;

    const updateField = (field: BrandingField, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
        setIsSaved(false);
        setRequestError(null);
    };

    const handleBlur = (field: BrandingField) => {
        setTouched((current) => ({ ...current, [field]: true }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setTouched({ logoUrl: true, accentColor: true, supportUrl: true });
        if (!hasChanges || hasErrors || isSaving) return;

        setIsSaving(true);
        setRequestError(null);
        try {
            const response = await api.patch<AdminTenant>(`/tenants/${tenant.id}`, payload);
            const updatedTenant = { ...tenant, ...payload, ...response.data };
            onTenantChange(updatedTenant);
            setForm(getForm(updatedTenant));
            setIsSaved(true);
            window.setTimeout(() => setIsSaved(false), 3000);
        } catch (error) {
            console.error('Failed to save school branding:', error);
            setRequestError(getApiErrorMessage(error, 'Не удалось сохранить оформление. Проверьте значения и повторите попытку.'));
        } finally {
            setIsSaving(false);
        }
    };

    const fieldError = (field: BrandingField) => touched[field] ? errors[field] : null;
    const validLogoUrl = !errors.logoUrl ? payload.logo_url : null;
    const validSupportUrl = !errors.supportUrl ? payload.support_url : null;
    const validAccentColor = !errors.accentColor ? payload.accent_color : null;

    return (
        <Card className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <Palette size={20} aria-hidden="true" />
                    </div>
                    <CardTitle className="text-lg">Оформление школы</CardTitle>
                </div>
                <CardDescription className="text-xs leading-5 text-muted-foreground">
                    Логотип, фирменный цвет и ссылка поддержки, которые увидят ученики этой школы.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="school-logo-url" className="px-1 text-xs font-medium text-muted-foreground">Логотип</Label>
                        <Input
                            id="school-logo-url"
                            type="url"
                            inputMode="url"
                            value={form.logoUrl}
                            onChange={(event) => updateField('logoUrl', event.target.value)}
                            onBlur={() => handleBlur('logoUrl')}
                            aria-invalid={Boolean(fieldError('logoUrl'))}
                            aria-describedby="school-logo-help"
                            placeholder="https://example.com/logo.png"
                            className="h-11 rounded-lg border border-border bg-muted/30 focus-visible:ring-primary/20"
                        />
                        <p id="school-logo-help" className={cn('min-h-5 px-1 text-xs leading-5', fieldError('logoUrl') ? 'text-destructive' : 'text-muted-foreground')}>
                            {fieldError('logoUrl') || 'Используйте публичную HTTPS-ссылку на изображение.'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="school-accent-color" className="px-1 text-xs font-medium text-muted-foreground">Фирменный цвет</Label>
                        <Input
                            id="school-accent-color"
                            value={form.accentColor}
                            onChange={(event) => updateField('accentColor', event.target.value)}
                            onBlur={() => handleBlur('accentColor')}
                            aria-invalid={Boolean(fieldError('accentColor'))}
                            aria-describedby="school-accent-help"
                            placeholder="#2563EB"
                            autoCapitalize="characters"
                            className="h-11 rounded-lg border border-border bg-muted/30 font-mono uppercase focus-visible:ring-primary/20"
                        />
                        <p id="school-accent-help" className={cn('min-h-5 px-1 text-xs leading-5', fieldError('accentColor') ? 'text-destructive' : 'text-muted-foreground')}>
                            {fieldError('accentColor') || 'Шесть HEX-символов после знака #.'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="school-support-url" className="px-1 text-xs font-medium text-muted-foreground">Поддержка учеников</Label>
                        <Input
                            id="school-support-url"
                            type="url"
                            inputMode="url"
                            value={form.supportUrl}
                            onChange={(event) => updateField('supportUrl', event.target.value)}
                            onBlur={() => handleBlur('supportUrl')}
                            aria-invalid={Boolean(fieldError('supportUrl'))}
                            aria-describedby="school-support-help"
                            placeholder="https://t.me/your_support"
                            className="h-11 rounded-lg border border-border bg-muted/30 focus-visible:ring-primary/20"
                        />
                        <p id="school-support-help" className={cn('min-h-5 px-1 text-xs leading-5', fieldError('supportUrl') ? 'text-destructive' : 'text-muted-foreground')}>
                            {fieldError('supportUrl') || 'Оставьте поле пустым, если канал поддержки ещё не настроен.'}
                        </p>
                    </div>

                    {(validLogoUrl || validAccentColor || validSupportUrl) && (
                        <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                            <div className="flex min-w-0 items-center gap-3">
                                {validLogoUrl ? (
                                    <img src={validLogoUrl} alt="Предпросмотр логотипа школы" className="h-12 w-12 shrink-0 rounded-lg border border-border bg-card object-contain" />
                                ) : (
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground" aria-hidden="true">
                                        <Image size={20} />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground">Предпросмотр</p>
                                    {validAccentColor && (
                                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                            <span data-testid="branding-accent-preview" className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: validAccentColor }} />
                                            <span>{validAccentColor}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {validSupportUrl && (
                                <a href={validSupportUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                    Проверить поддержку
                                    <ExternalLink className="ml-1.5 h-4 w-4" aria-hidden="true" />
                                </a>
                            )}
                        </div>
                    )}

                    {requestError && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{requestError}</p>}

                    <div className="flex justify-center pt-2">
                        <Button
                            type="submit"
                            disabled={isSaving || isSaved || !hasChanges || hasErrors}
                            className={cn(
                                'h-12 whitespace-nowrap rounded-lg px-10 text-sm font-bold shadow-sm active:translate-y-px',
                                isSaved ? 'bg-success text-primary-foreground hover:bg-success/90' : 'bg-primary text-primary-foreground hover:bg-primary/90',
                            )}
                        >
                            {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : isSaved ? <CheckCircle2 className="mr-2 h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />}
                            {isSaving ? 'Сохраняем…' : isSaved ? 'Сохранено' : 'Сохранить оформление'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};
