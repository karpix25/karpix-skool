import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import {
    Globe,
    RefreshCw,
    Bot,
    Copy,
    CheckCircle2,
    Save,
    Loader2,
    ShieldCheck,
    Trophy
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';
import { createTenantSetupToken, type SetupTokenScope } from '../../services/setupTokens';
import type { AdminTenant } from '../../types/admin';

export const Settings: React.FC = () => {
    const [tenant, setTenant] = useState<AdminTenant | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [creatingTokenType, setCreatingTokenType] = useState<'regular' | 'vip' | null>(null);
    const [manualSetupCommand, setManualSetupCommand] = useState<{ type: 'regular' | 'vip'; command: string } | null>(null);
    const [schoolName, setSchoolName] = useState('');
    const [vipGroupLink, setVipGroupLink] = useState('');
    const [copiedRegular, setCopiedRegular] = useState(false);
    const [copiedVip, setCopiedVip] = useState(false);
    const [syncResult, setSyncResult] = useState<{ total: number, promoted: string[] } | null>(null);

    // Level Names State
    const [levelNames, setLevelNames] = useState<Record<string, string>>({});
    const [isSavingLevels, setIsSavingLevels] = useState(false);
    const [isSavedLevels, setIsSavedLevels] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/tenants');
            if (res.data && res.data.length > 0) {
                const school = res.data[0];
                setTenant(school);
                setSchoolName(school.name);
                setVipGroupLink(school.vip_group_link || '');
                // Initialize level names, defaulting to empty strings if not set
                const currentLevels = school.level_names || {};
                setLevelNames(currentLevels);
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUpdateName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant || !schoolName.trim()) return;

        const isNameSame = schoolName === tenant.name;
        const isLinkSame = vipGroupLink === (tenant.vip_group_link || '');

        if (isNameSame && isLinkSame) return;

        setIsSaving(true);
        try {
            await api.patch(`/tenants/${tenant.id}`, {
                name: schoolName,
                vip_group_link: vipGroupLink
            });
            setTenant({ ...tenant, name: schoolName, vip_group_link: vipGroupLink });
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
        } catch (err) {
            console.error('Update failed:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveLevelNames = async () => {
        if (!tenant) return;
        setIsSavingLevels(true);
        try {
            await api.patch(`/tenants/${tenant.id}`, { level_names: levelNames });
            setTenant({ ...tenant, level_names: levelNames });
            setIsSavedLevels(true);
            setTimeout(() => setIsSavedLevels(false), 3000);
        } catch (err) {
            console.error('Failed to save level names:', err);
        } finally {
            setIsSavingLevels(false);
        }
    };

    const handleSync = async () => {
        if (!tenant) return;
        setIsSyncing(true);
        setSyncResult(null);
        try {
            const res = await api.post(`/tenants/${tenant.id}/sync`);
            if (res.data) {
                setSyncResult({
                    total: res.data.total_admins,
                    promoted: res.data.promoted
                });
            }
        } catch (err) {
            console.error('Sync failed:', err);
        } finally {
            setIsSyncing(false);
        }
    };

    const copySetupCommand = async (scope: SetupTokenScope, type: 'regular' | 'vip') => {
        if (!tenant) return;
        setCreatingTokenType(type);
        try {
            const issue = await createTenantSetupToken(tenant.id, scope);
            try {
                if (!navigator.clipboard?.writeText) {
                    throw new Error('Clipboard API is unavailable');
                }
                await navigator.clipboard.writeText(issue.setup_command);
                setManualSetupCommand(null);
                if (type === 'regular') {
                    setCopiedRegular(true);
                    setTimeout(() => setCopiedRegular(false), 2000);
                } else {
                    setCopiedVip(true);
                    setTimeout(() => setCopiedVip(false), 2000);
                }
            } catch (copyErr) {
                console.error('Clipboard copy failed:', copyErr);
                setManualSetupCommand({ type, command: issue.setup_command });
            }
        } catch (err) {
            console.error('Failed to create setup token:', err);
        } finally {
            setCreatingTokenType(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (!tenant) return (
        <div className="p-10 text-center">
            <p className="text-muted-foreground">Школа не найдена.</p>
        </div>
    );

    return (
        <div className="p-5 sm:p-6 md:p-10 space-y-8 max-w-4xl mx-auto pb-32 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Настройки</h1>
                <p className="text-muted-foreground text-sm mt-1">Конфигурация школы и интеграций</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* School Profile */}
                <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Globe size={20} />
                            </div>
                            <CardTitle className="text-lg">Профиль школы</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateName} className="space-y-4">
                            <div className="space-y-2">
                                <label className="px-1 text-xs font-medium text-muted-foreground">Название школы</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={schoolName}
                                        onChange={(e) => setSchoolName(e.target.value)}
                                        className="bg-muted/30 border border-border rounded-lg h-11 focus-visible:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="px-1 text-xs font-medium text-muted-foreground">Ссылка на оплату / VIP группу</label>
                                <Input
                                    value={vipGroupLink}
                                    onChange={(e) => setVipGroupLink(e.target.value)}
                                    placeholder="https://t.me/..."
                                    className="bg-muted/30 border border-border rounded-lg h-11 focus-visible:ring-primary/20"
                                />
                                <p className="px-1 text-xs leading-5 text-muted-foreground">Эта ссылка будет показана ученикам при попытке открыть VIP курс.</p>
                            </div>

                            <div className="pt-6 flex justify-center">
                                <Button
                                    type="submit"
                                    disabled={isSaving || (schoolName === tenant.name && vipGroupLink === (tenant.vip_group_link || ''))}
                                    className={cn(
                                        "rounded-lg h-12 px-10 font-bold text-sm transition-all shadow-sm active:scale-[0.99]",
                                        isSaved
                                            ? "bg-success hover:bg-success/90 text-white"
                                            : "bg-primary hover:bg-primary/90 text-primary-foreground"
                                    )}
                                >
                                    {isSaving ? (
                                        <Loader2 className="animate-spin mr-2" size={20} />
                                    ) : isSaved ? (
                                        <CheckCircle2 size={20} className="mr-2 animate-in zoom-in duration-300" />
                                    ) : (
                                        <Save size={20} className="mr-2" />
                                    )}
                                    {isSaved ? "Сохранено" : "Сохранить"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Level Names Settings */}
                <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
                                <Trophy size={20} />
                            </div>
                            <CardTitle className="text-lg">Названия уровней</CardTitle>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground">
                            Настройте уникальные названия для каждого уровня в вашей школе.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Array.from({ length: 9 }, (_, i) => i + 1).map((level) => {
                                    const defaultName = level <= 2 ? "Новичок" : level <= 4 ? "Ученик" : level <= 6 ? "Подмастерье" : level <= 8 ? "Эксперт" : "Грандмастер";
                                    return (
                                        <div key={level} className="space-y-1">
                                            <label className="text-[10px] font-bold text-muted-foreground px-1">
                                                Уровень {level}
                                            </label>
                                            <Input
                                                placeholder={defaultName}
                                                value={levelNames[String(level)] || ''}
                                                onChange={(e) => setLevelNames({ ...levelNames, [String(level)]: e.target.value })}
                                                className="bg-muted/30 border border-border rounded-lg h-11 focus-visible:ring-primary/20"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="pt-6 flex justify-center">
                            <Button
                                onClick={handleSaveLevelNames}
                                disabled={isSavingLevels}
                                className={cn(
                                    "rounded-lg h-12 px-10 font-bold text-sm transition-all shadow-sm active:scale-[0.99]",
                                    isSavedLevels
                                        ? "bg-success hover:bg-success/90 text-white"
                                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                                )}
                            >
                                {isSavingLevels ? (
                                    <Loader2 className="animate-spin mr-2" size={20} />
                                ) : isSavedLevels ? (
                                    <CheckCircle2 size={20} className="mr-2 animate-in zoom-in duration-300" />
                                ) : (
                                    <Save size={20} className="mr-2" />
                                )}
                                {isSavedLevels ? "Сохранено" : "Сохранить"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Telegram Integration */}
                <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Bot size={20} />
                            </div>
                            <CardTitle className="text-lg">Интеграция с Telegram</CardTitle>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground">Свяжите вашего бота с группами в Telegram через коды активации.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">

                        {/* Status Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/60">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck size={18} className={tenant.telegram_group_id ? "text-success" : "text-muted-foreground opacity-40"} />
                                    <span className="text-xs font-semibold">Обычная группа</span>
                                </div>
                                <Badge className={cn(
                                    "px-2 py-0.5 text-[11px] font-medium border-none",
                                    tenant.telegram_group_id ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                                )}>
                                    {tenant.telegram_group_id ? "СВЯЗАНА" : "НЕТ"}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/60">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck size={18} className={tenant.telegram_group_id_vip ? "text-amber-600" : "text-muted-foreground opacity-40"} />
                                    <span className="text-xs font-semibold">VIP группа</span>
                                </div>
                                <Badge className={cn(
                                    "px-2 py-0.5 text-[11px] font-medium border-none",
                                    tenant.telegram_group_id_vip ? "bg-amber-500/10 text-amber-700" : "bg-destructive/10 text-destructive"
                                )}>
                                    {tenant.telegram_group_id_vip ? "СВЯЗАНА" : "НЕТ"}
                                </Badge>
                            </div>
                        </div>

                        {/* Setup Commands */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Regular Setup Block */}
                            <div className="p-5 bg-muted/30 rounded-lg space-y-4 border border-border/60">
                                <p className="px-1 text-xs font-medium text-muted-foreground">Команда для обычной группы</p>
                                <div>
                                    <code className="text-[11px] font-mono font-black text-primary break-all block p-3 bg-background/50 rounded-lg border border-primary/10">
                                        /setup •••••••
                                    </code>
                                    <p className="mt-2 px-1 text-[11px] leading-5 text-muted-foreground">
                                        Одноразовая команда создаётся при копировании и действует 7 дней.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="h-11 w-full rounded-lg border-primary/10 text-xs font-semibold shadow-sm hover:bg-primary/5"
                                    disabled={creatingTokenType !== null}
                                    onClick={() => copySetupCommand('free_group_link', 'regular')}
                                >
                                    {creatingTokenType === 'regular' ? (
                                        <Loader2 className="animate-spin" size={14} />
                                    ) : copiedRegular ? (
                                        <CheckCircle2 size={14} className="text-success" />
                                    ) : (
                                        <Copy size={14} />
                                    )}
                                    Создать и скопировать
                                </Button>
                                {manualSetupCommand?.type === 'regular' && (
                                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                                        <p className="mb-2 text-[11px] font-medium leading-5 text-primary">
                                            Автокопирование недоступно. Скопируйте созданную команду вручную:
                                        </p>
                                        <code className="block break-all rounded-md bg-background/70 p-2 text-[11px] font-bold text-primary">
                                            {manualSetupCommand.command}
                                        </code>
                                    </div>
                                )}
                            </div>

                            {/* VIP Setup Block */}
                            <div className="p-5 bg-muted/30 rounded-lg space-y-4 border border-border/60">
                                <p className="px-1 text-xs font-medium text-muted-foreground">Команда для VIP группы</p>
                                <div>
                                    <code className="text-[11px] font-mono font-black text-amber-700 break-all block p-3 bg-background/50 rounded-lg border border-amber-500/10">
                                        /setup ••••••• vip
                                    </code>
                                    <p className="mt-2 px-1 text-[11px] leading-5 text-muted-foreground">
                                        Новый выпуск отзывает предыдущую неиспользованную VIP-команду.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="h-11 w-full rounded-lg border-amber-500/20 text-xs font-semibold text-amber-700 shadow-sm hover:bg-amber-500/5"
                                    disabled={creatingTokenType !== null}
                                    onClick={() => copySetupCommand('vip_group_link', 'vip')}
                                >
                                    {creatingTokenType === 'vip' ? (
                                        <Loader2 className="animate-spin" size={14} />
                                    ) : copiedVip ? (
                                        <CheckCircle2 size={14} className="text-success" />
                                    ) : (
                                        <Copy size={14} />
                                    )}
                                    Создать и скопировать
                                </Button>
                                {manualSetupCommand?.type === 'vip' && (
                                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                                        <p className="mb-2 text-[11px] font-medium leading-5 text-amber-700">
                                            Автокопирование недоступно. Скопируйте созданную команду вручную:
                                        </p>
                                        <code className="block break-all rounded-md bg-background/70 p-2 text-[11px] font-bold text-amber-700">
                                            {manualSetupCommand.command}
                                        </code>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Admin Sync */}
                        <div className="pt-4">
                            <Button
                                onClick={handleSync}
                                disabled={isSyncing || (!tenant.telegram_group_id && !tenant.telegram_group_id_vip)}
                                variant="outline"
                                className="w-full rounded-lg h-12 gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all font-bold shadow-sm"
                            >
                                <RefreshCw size={18} className={cn(isSyncing && "animate-spin")} />
                                Синхронизировать администраторов
                            </Button>

                            {syncResult && (
                                <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 size={16} className="text-success" />
                                        <p className="text-xs font-bold">Синхронизация завершена</p>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground italic mb-2">
                                        Всего найдено администраторов в Telegram: <span className="text-foreground font-bold">{syncResult.total}</span>
                                    </p>
                                    {syncResult.promoted.length > 0 ? (
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">Новые админы ({syncResult.promoted.length}):</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {syncResult.promoted.map((name, i) => (
                                                    <span key={i} className="rounded-md border border-success/20 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                                                        @{name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">Все администраторы уже были синхронизированы.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Advanced - Danger Zone */}
                <div className="pt-8 opacity-70 transition-opacity hover:opacity-100">
                    <p className="text-[10px] font-black text-destructive px-4 mb-4">Опасная зона</p>
                    <Card className="border border-dashed border-destructive/25 bg-card rounded-lg">
                        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h4 className="font-bold text-sm text-foreground">Сбросить настройки школы</h4>
                                <p className="text-[10px] text-muted-foreground mt-1">Это действие удалит текущие привязки к Telegram. Будьте осторожны.</p>
                            </div>
                            <Button variant="destructive" className="h-11 rounded-lg px-6 text-[10px] font-bold opacity-50 cursor-not-allowed">
                                Сбросить
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div >
    );
};

// Simplified Badge component placeholder
const Badge: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
        {children}
    </div>
);
