import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Loader2, Users, GraduationCap, UserPlus, Globe, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { KpiCard } from '../../admin/components/dashboard/KpiCard';
import { ActivityChart } from '../../admin/components/dashboard/ActivityChart';
import { ActivityList } from '../../admin/components/dashboard/ActivityList';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

interface AnalyticsData {
    kpis: {
        total_students: number;
        live_courses: number;
        revenue_mtd: number;
        new_joins_today: number;
    };
    growth_activity: number[];
    recent_activity: Array<{
        type: 'join' | 'progress' | 'payment' | 'level' | 'completion';
        user_name: string;
        avatar_url?: string;
        timestamp: string;
        detail: string;
        role?: string;
        value?: string;
        isUnread?: boolean;
    }>;
}

export const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [tenant, setTenant] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newSchoolName, setNewSchoolName] = useState('');
    const [filter, setFilter] = useState('Сегодня');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [analyticsRes, tenantsRes] = await Promise.all([
                api.get('/analytics').catch(() => ({ data: null })),
                api.get('/tenants')
            ]);

            setData(analyticsRes.data);
            if (tenantsRes.data && tenantsRes.data.length > 0) {
                setTenant(tenantsRes.data[0]);
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSchoolName.trim()) return;

        setIsCreating(true);
        try {
            await api.post('/tenants', { name: newSchoolName });
            await fetchData(); // Refresh everything
        } catch (err) {
            console.error('Failed to create school:', err);
            alert('Не удалось создать школу. Попробуйте другое название.');
        } finally {
            setIsCreating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Card className="max-w-md w-full border-none shadow-2xl rounded-[40px] overflow-hidden bg-card relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-indigo-600"></div>
                    <CardContent className="p-10 space-y-10">
                        <div className="flex flex-col items-center gap-6 text-center">
                            <div className="w-20 h-20 bg-primary/10 text-primary rounded-[28px] flex items-center justify-center shadow-xl shadow-primary/5">
                                <Globe size={40} strokeWidth={2.5} />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-black text-foreground tracking-tight uppercase italic">Заявка одобрена</h1>
                                <p className="text-muted-foreground text-sm font-medium">Ваша заявка одобрена! Теперь создайте свою первую школу, чтобы начать обучение.</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateSchool} className="space-y-6">
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1 opacity-60">Название вашей школы</label>
                                <Input
                                    placeholder="Напр: Академия дизайна"
                                    className="h-14 bg-muted/50 border-none rounded-2xl font-bold text-foreground focus-visible:ring-primary/20 transition-all"
                                    value={newSchoolName}
                                    onChange={e => setNewSchoolName(e.target.value)}
                                    disabled={isCreating}
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isCreating || !newSchoolName.trim()}
                                className="w-full h-14 rounded-[24px] font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-all"
                            >
                                {isCreating ? <Loader2 className="animate-spin" size={20} /> : "Создать школу"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!data) return null;

    // Map growth_activity to ChartDataPoint format
    const chartData = data.growth_activity.map((val, i) => {
        const hoursAgo = 23 - i;
        const date = new Date();
        date.setHours(date.getHours() - hoursAgo);
        const timeStr = date.getHours() === new Date().getHours() ? 'Сейчас' :
            `${date.getHours() % 12 || 12} ${date.getHours() >= 12 ? 'PM' : 'AM'}`;
        return { time: timeStr, value: val };
    });

    return (
        <div className="bg-background min-h-screen font-display pb-24 animate-in fade-in duration-500">
            {/* Header Section */}
            <header className="px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Аналитика</h1>
                    <p className="text-xs text-muted-foreground">Школа креаторов</p>
                </div>
                <div className="flex gap-3">
                    <Avatar className="w-10 h-10 border border-border">
                        <AvatarImage src={user?.avatar_url} />
                        <AvatarFallback>{user?.username?.[0]}</AvatarFallback>
                    </Avatar>
                </div>
            </header>

            {/* Filter Segment */}
            <div className="px-6 mt-6 mb-6">
                <div className="bg-muted p-1 rounded-lg flex gap-1 shadow-inner">
                    {['Сегодня', '7д', '30д', 'Все'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                                filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <main className="px-6 space-y-6">
                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <KpiCard
                        icon={<Users className="w-5 h-5" />}
                        label="Всего студентов"
                        value={`${(data.kpis.total_students / 1000).toFixed(1)}k`}
                        trend="+12%"
                    />
                    <KpiCard
                        icon={<GraduationCap className="w-5 h-5" />}
                        label="Активные курсы"
                        value={data.kpis.live_courses.toString()}
                    />
                    <KpiCard
                        icon={<UserPlus className="w-5 h-5" />}
                        label="Новые"
                        value={data.kpis.new_joins_today.toString()}
                    />
                </div>

                {/* High-Visibility Telegram Authorization (MUST BE TOP) */}
                <div className="space-y-4">
                    {tenant && !tenant.telegram_group_id && (
                        <Card className="bg-primary border-none shadow-2xl shadow-primary/20 rounded-[32px] overflow-hidden animate-in zoom-in duration-500">
                            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="space-y-2 text-center md:text-left">
                                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter italic">
                                        Привязать группу
                                    </h2>
                                    <p className="text-white/80 text-xs font-bold leading-relaxed max-w-md">
                                        Свяжите бесплатную группу для всех студентов:
                                    </p>
                                </div>

                                <div className="flex flex-col items-center gap-4 bg-black/20 p-6 rounded-[24px] border border-white/10 w-full md:w-auto min-w-[280px]">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Команда активации</span>
                                    <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/20 flex items-center gap-3">
                                        <code className="text-lg font-mono font-black text-white">
                                            /setup {tenant.setup_code}
                                        </code>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {tenant && !tenant.telegram_group_id_vip && (
                        <Card className="bg-indigo-600 border-none shadow-2xl shadow-indigo-500/20 rounded-[32px] overflow-hidden animate-in zoom-in duration-500">
                            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="space-y-2 text-center md:text-left">
                                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter italic">
                                        Привязать VIP группу
                                    </h2>
                                    <p className="text-white/80 text-xs font-bold leading-relaxed max-w-md">
                                        Свяжите платную (VIP) группу для премиум-контента:
                                    </p>
                                </div>

                                <div className="flex flex-col items-center gap-4 bg-black/20 p-6 rounded-[24px] border border-white/10 w-full md:w-auto min-w-[280px]">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Команда активации</span>
                                    <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/20 flex items-center gap-3">
                                        <code className="text-lg font-mono font-black text-white">
                                            /setup {tenant.setup_code} vip
                                        </code>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Growth Activity Chart */}
                <ActivityChart data={chartData} />

                {/* Telegram Integration Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tenant?.telegram_group_id && (
                        <div className="bg-card rounded-[32px] p-6 border border-border/50 shadow-sm space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-success/10 flex items-center justify-center">
                                    <Globe className="text-success" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm tracking-tight">Бесплатная группа</h3>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Подключено</p>
                                </div>
                            </div>
                            <div className="px-3 py-1.5 bg-success/10 text-success rounded-lg text-[9px] font-black uppercase tracking-[0.1em] text-center">
                                Активная ссылка
                            </div>
                        </div>
                    )}
                    {tenant?.telegram_group_id_vip && (
                        <div className="bg-card rounded-[32px] p-6 border border-border/50 shadow-sm space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                                    <Sparkles className="text-indigo-500" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm tracking-tight">VIP группа</h3>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Премиум</p>
                                </div>
                            </div>
                            <div className="px-3 py-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] text-center">
                                VIP активно
                            </div>
                        </div>
                    )}
                </div>

                {/* Recent Activity List */}
                <ActivityList activities={data.recent_activity} />
            </main>
        </div>
    );
};
