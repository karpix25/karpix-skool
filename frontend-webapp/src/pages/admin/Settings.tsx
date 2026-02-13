import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import {
    Globe,
    ShieldCheck,
    CreditCard,
    RefreshCw,
    Bot,
    Copy,
    CheckCircle2,
    Calendar,
    Save,
    Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

export const Settings: React.FC = () => {
    const [tenant, setTenant] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [schoolName, setSchoolName] = useState('');
    const [copied, setCopied] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/tenants');
            if (res.data && res.data.length > 0) {
                const school = res.data[0];
                setTenant(school);
                setSchoolName(school.name);
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
            await api.patch(`/tenants/${tenant.id}`, { name: schoolName });
            setTenant({ ...tenant, name: schoolName });
        } catch (err) {
            console.error('Update failed:', err);
        } finally {
            setIsSaving(false);
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

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                                    <Button
                                        type="submit"
                                        disabled={isSaving || schoolName === tenant.name}
                                        className="rounded-xl h-11 px-6 font-bold"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    </Button>
                                </div>
                            </div>
                        </form>
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
                        <CardDescription className="text-xs">Свяжите вашего бота с группами в Telegram.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Setup Code */}
                        <div className="p-4 bg-muted/30 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60">Код подключения</p>
                                <code className="text-lg font-mono font-black text-primary">{tenant.setup_code}</code>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl hover:bg-primary/5 hover:text-primary"
                                onClick={() => copyToClipboard(`/setup ${tenant.setup_code}`)}
                            >
                                {copied ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
                            </Button>
                        </div>

                        {/* Connection Status */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 border rounded-2xl flex items-center justify-between bg-background/50">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck size={18} className={cn(tenant.telegram_group_id ? "text-green-500" : "text-muted-foreground")} />
                                    <span className="text-xs font-bold">Обычная группа</span>
                                </div>
                                <Badge variant={tenant.telegram_group_id ? "default" : "secondary"} className="text-[9px] uppercase tracking-widest bg-green-500/10 text-green-500 border-none">
                                    {tenant.telegram_group_id ? "Связано" : "Нет"}
                                </Badge>
                            </div>
                            <div className="p-4 border rounded-2xl flex items-center justify-between bg-background/50">
                                <div className="flex items-center gap-3">
                                    <RefreshCw size={18} className={cn(tenant.telegram_group_id_vip ? "text-indigo-500" : "text-muted-foreground")} />
                                    <span className="text-xs font-bold">VIP группа</span>
                                </div>
                                <Badge variant={tenant.telegram_group_id_vip ? "default" : "secondary"} className="text-[9px] uppercase tracking-widest bg-indigo-500/10 text-indigo-500 border-none">
                                    {tenant.telegram_group_id_vip ? "Связано" : "Нет"}
                                </Badge>
                            </div>
                        </div>

                        {/* Admin Sync */}
                        <div className="pt-2">
                            <Button
                                onClick={handleSync}
                                disabled={isSyncing || !tenant.telegram_group_id}
                                variant="outline"
                                className="w-full rounded-2xl h-12 gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all font-bold"
                            >
                                <RefreshCw size={18} className={cn(isSyncing && "animate-spin")} />
                                Синхронизировать админов
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Subscription */}
                <Card className="border-none shadow-sm bg-card overflow-hidden">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                                <CreditCard size={20} />
                            </div>
                            <CardTitle className="text-lg">Подписка и план</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="text-green-500" />
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-foreground">Статус доступа</p>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                                        {tenant.subscription_status === 'active' ? 'Активен' : 'Истёк'}
                                    </p>
                                </div>
                            </div>
                            <Badge className="bg-green-500 hover:bg-green-600 border-none font-black text-[9px] uppercase tracking-widest h-6">
                                PRO PLAN
                            </Badge>
                        </div>

                        {tenant.expires_at && (
                            <div className="flex items-center gap-3 p-4 border rounded-2xl border-dashed">
                                <Calendar className="text-muted-foreground" size={18} />
                                <p className="text-xs font-bold text-muted-foreground">
                                    Истекает: <span className="text-foreground">{new Date(tenant.expires_at).toLocaleDateString('ru-RU')}</span>
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
