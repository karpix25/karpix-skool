import React, { useEffect, useState } from 'react';
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

export const Settings: React.FC = () => {
    const [tenant, setTenant] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [schoolName, setSchoolName] = useState('');
    const [vipGroupLink, setVipGroupLink] = useState('');
    const [copiedRegular, setCopiedRegular] = useState(false);
    const [copiedVip, setCopiedVip] = useState(false);

    // Level Names State
    const [levelNames, setLevelNames] = useState<Record<string, string>>({});
    const [isSavingLevels, setIsSavingLevels] = useState(false);

    const fetchData = async () => {
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
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpdateName = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schoolName.trim() || schoolName === tenant.name) return;

        setIsSaving(true);
        try {
            await api.patch(`/tenants/${tenant.id}`, {
                name: schoolName,
                vip_group_link: vipGroupLink
            });
            setTenant({ ...tenant, name: schoolName, vip_group_link: vipGroupLink });
        } catch (err) {
            console.error('Update failed:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveLevelNames = async () => {
        setIsSavingLevels(true);
        try {
            await api.patch(`/tenants/${tenant.id}`, { level_names: levelNames });
            setTenant({ ...tenant, level_names: levelNames });
        } catch (err) {
            console.error('Failed to save level names:', err);
        } finally {
            setIsSavingLevels(false);
        }
    };

    const handleSync = async () => {
        if (!tenant) return;
        setIsSyncing(true);
        try {
            await api.post(`/tenants/${tenant.id}/sync`);
        } catch (err) {
            console.error('Sync failed:', err);
        } finally {
            setIsSyncing(false);
        }
    };

    const copyToClipboard = (text: string, type: 'regular' | 'vip') => {
        navigator.clipboard.writeText(text);
        if (type === 'regular') {
            setCopiedRegular(true);
            setTimeout(() => setCopiedRegular(false), 2000);
        } else {
            setCopiedVip(true);
            setTimeout(() => setCopiedVip(false), 2000);
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
        <div className="p-6 md:p-10 space-y-10 max-w-4xl mx-auto pb-32 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Настройки</h1>
                <p className="text-muted-foreground text-sm mt-1 italic">Управление конфигурацией вашей школы.</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* School Profile */}
                <Card className="border-none shadow-sm bg-card overflow-hidden">
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
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1 opacity-60">Название школы</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={schoolName}
                                        onChange={(e) => setSchoolName(e.target.value)}
                                        className="bg-muted/30 border-none rounded-xl h-11 focus-visible:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1 opacity-60">Ссылка на оплату / VIP группу</label>
                                <Input
                                    value={vipGroupLink}
                                    onChange={(e) => setVipGroupLink(e.target.value)}
                                    placeholder="https://t.me/..."
                                    className="bg-muted/30 border-none rounded-xl h-11 focus-visible:ring-primary/20"
                                />
                                <p className="text-[9px] text-muted-foreground px-1 italic">Эта ссылка будет показана ученикам при попытке открыть VIP курс.</p>
                            </div>

                            <div className="pt-2 flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={isSaving || (schoolName === tenant.name && vipGroupLink === (tenant.vip_group_link || ''))}
                                    className="rounded-xl h-11 px-8 font-bold"
                                >
                                    {isSaving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
                                    Сохранить профиль
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Level Names Settings */}
                <Card className="border-none shadow-sm bg-card overflow-hidden">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
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
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1 opacity-60">
                                                Уровень {level}
                                            </label>
                                            <Input
                                                placeholder={defaultName}
                                                value={levelNames[String(level)] || ''}
                                                onChange={(e) => setLevelNames({ ...levelNames, [String(level)]: e.target.value })}
                                                className="bg-muted/30 border-none rounded-xl h-11 focus-visible:ring-primary/20"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="pt-2 flex justify-end">
                                <Button
                                    onClick={handleSaveLevelNames}
                                    disabled={isSavingLevels}
                                    className="rounded-xl h-11 px-6 font-bold"
                                >
                                    {isSavingLevels ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
                                    Сохранить названия
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Telegram Integration */}
                <Card className="border-none shadow-sm bg-card overflow-hidden">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                                <Bot size={20} />
                            </div>
                            <CardTitle className="text-lg">Интеграция с Telegram</CardTitle>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground">Свяжите вашего бота с группами в Telegram через коды активации.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">

                        {/* Status Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border/10">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck size={18} className={tenant.telegram_group_id ? "text-green-500" : "text-muted-foreground opacity-40"} />
                                    <span className="text-[11px] font-bold uppercase tracking-widest">Обычная группа</span>
                                </div>
                                <Badge className={cn(
                                    "px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter border-none",
                                    tenant.telegram_group_id ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                )}>
                                    {tenant.telegram_group_id ? "СВЯЗАНА" : "НЕТ"}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border/10">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck size={18} className={tenant.telegram_group_id_vip ? "text-indigo-500" : "text-muted-foreground opacity-40"} />
                                    <span className="text-[11px] font-bold uppercase tracking-widest">VIP группа</span>
                                </div>
                                <Badge className={cn(
                                    "px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter border-none",
                                    tenant.telegram_group_id_vip ? "bg-indigo-500/10 text-indigo-500" : "bg-red-500/10 text-red-500"
                                )}>
                                    {tenant.telegram_group_id_vip ? "СВЯЗАНА" : "НЕТ"}
                                </Badge>
                            </div>
                        </div>

                        {/* Setup Commands */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Regular Setup Block */}
                            <div className="p-5 bg-muted/30 rounded-[28px] space-y-4 border border-border/20">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1 opacity-60">Код для обычной группы</p>
                                <div>
                                    <code className="text-[11px] font-mono font-black text-primary break-all block p-3 bg-background/50 rounded-xl border border-primary/5">
                                        /setup {tenant.setup_code}
                                    </code>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full rounded-xl h-11 gap-2 text-[10px] uppercase font-bold tracking-widest border-primary/10 hover:bg-primary/5 shadow-sm"
                                    onClick={() => copyToClipboard(`/setup ${tenant.setup_code}`, 'regular')}
                                >
                                    {copiedRegular ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                                    Копировать
                                </Button>
                            </div>

                            {/* VIP Setup Block */}
                            <div className="p-5 bg-muted/30 rounded-[28px] space-y-4 border border-border/20">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1 opacity-60">Код для VIP группы</p>
                                <div>
                                    <code className="text-[11px] font-mono font-black text-indigo-500 break-all block p-3 bg-background/50 rounded-xl border border-indigo-500/5">
                                        /setup {tenant.setup_code} vip
                                    </code>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full rounded-xl h-11 gap-2 text-[10px] uppercase font-bold tracking-widest border-indigo-500/10 hover:bg-indigo-500/5 text-indigo-500 shadow-sm"
                                    onClick={() => copyToClipboard(`/setup ${tenant.setup_code} vip`, 'vip')}
                                >
                                    {copiedVip ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                                    Копировать
                                </Button>
                            </div>
                        </div>

                        {/* Admin Sync */}
                        <div className="pt-4">
                            <Button
                                onClick={handleSync}
                                disabled={isSyncing || (!tenant.telegram_group_id && !tenant.telegram_group_id_vip)}
                                variant="outline"
                                className="w-full rounded-2xl h-14 gap-2 border-indigo-500/20 hover:bg-indigo-500/5 hover:text-indigo-600 transition-all font-bold shadow-sm"
                            >
                                <RefreshCw size={18} className={cn(isSyncing && "animate-spin")} />
                                Синхронизировать администраторов
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Advanced - Danger Zone */}
                <div className="pt-8 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] px-4 mb-4">Опасная зона</p>
                    <Card className="border-2 border-dashed border-red-500/20 bg-transparent">
                        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h4 className="font-bold text-sm text-foreground">Сбросить настройки школы</h4>
                                <p className="text-[10px] text-muted-foreground mt-1">Это действие удалит текущие привязки к Telegram. Будьте осторожны.</p>
                            </div>
                            <Button variant="destructive" className="rounded-xl font-bold text-[10px] uppercase tracking-widest px-6 h-10 opacity-50 cursor-not-allowed">
                                Сбросить
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

// Simplified Badge component placeholder
const Badge: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
        {children}
    </div>
);
