import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Loader2, Users, GraduationCap, UserPlus, Globe, Sparkles, Plus, Monitor } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { openExternalLink } from '../../lib/externalLinks';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../../components/ui/card';
import { KpiCard } from '../../admin/components/dashboard/KpiCard';
import { ActivityChart } from '../../admin/components/dashboard/ActivityChart';
import { ActivityList } from '../../admin/components/dashboard/ActivityList';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AdminOnboarding } from './AdminOnboarding';
import { GuidedTour, type TourStep } from '../../components/onboarding/GuidedTour';
import type { AdminTenant } from '../../types/admin';

type DashboardWindow = Window & {
    _navigate?: NavigateFunction;
};

interface AnalyticsData {
    kpis: {
        total_students: number;
        total_students_growth: number;
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
    const navigate = useNavigate();
    const { user, isAuthor } = useAuth();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [tenant, setTenant] = useState<AdminTenant | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newSchoolName, setNewSchoolName] = useState('');
    const [filter, setFilter] = useState('Сегодня');

    useEffect(() => {
        (window as DashboardWindow)._navigate = navigate;
    }, [navigate]);

    const fetchData = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    const [showIntro, setShowIntro] = useState(!user?.is_onboarded);

    const adminTourSteps: TourStep[] = [
        {
            selector: 'body',
            title: 'Добро пожаловать!',
            content: 'Это ваша панель управления школой. Давайте быстро пройдемся по основным разделам.',
            position: 'center'
        },
        {
            selector: '[data-tour="admin-nav"]',
            title: 'Навигация',
            content: 'Используйте меню для разделов: Обзор, Контент, Студенты и Настройки.',
            position: 'top'
        }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }


    if (!tenant) {
        if (!isAuthor) {
            return (
                <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto text-muted-foreground/40">
                            <Globe size={32} />
                        </div>
                        <p className="text-[10px] font-black text-muted-foreground">У вас нет активных школ</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {showIntro && (
                    <GuidedTour
                        steps={adminTourSteps}
                        isOpen={showIntro}
                        onComplete={() => setShowIntro(false)}
                    />
                )}

                <Card className="max-w-md w-full border border-border shadow-md rounded-2xl overflow-hidden bg-card relative">
                    <CardContent className="p-8 space-y-8">
                        <div className="flex flex-col items-center gap-6 text-center">
                            <div className="w-16 h-16 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                <Globe size={40} strokeWidth={2.5} />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-semibold text-foreground">Заявка одобрена</h1>
                                <p className="text-muted-foreground text-sm font-medium">Ваша заявка одобрена! Теперь создайте свою первую школу, чтобы начать обучение.</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateSchool} className="space-y-6">
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-bold text-muted-foreground px-1">Название вашей школы</label>
                                <Input
                                    placeholder="Напр: Академия дизайна"
                                    className="h-12 bg-muted/40 border border-border rounded-lg font-medium text-foreground focus-visible:ring-primary/20 transition-all"
                                    value={newSchoolName}
                                    onChange={e => setNewSchoolName(e.target.value)}
                                    disabled={isCreating}
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isCreating || !newSchoolName.trim()}
                                className="w-full h-12 rounded-lg font-bold text-xs gap-3 shadow-sm active:scale-[0.99] transition-all"
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
        <div className="bg-background min-h-dvh font-display pb-24 animate-in fade-in duration-500">
            {/* Header Section */}
            <header data-tour="header" className="px-5 sm:px-6 py-4 flex items-center justify-between border-b border-border/60 bg-background/80 sticky top-0 z-30 backdrop-blur">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-foreground">Обзор</h1>
                    <p className="text-xs text-muted-foreground font-medium">Школа: {tenant?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 rounded-lg hover:bg-muted"
                        title="Открыть в браузере"
                        onClick={async () => {
                            try {
                                const res = await api.post('/auth/request-desktop-login');
                                const { login_url } = res.data;
                                if (WebApp.platform !== 'unknown') {
                                    WebApp.openLink(login_url);
                                } else {
                                    openExternalLink(login_url);
                                }
                            } catch {
                                alert('Не удалось открыть браузер. Ссылка отправлена в ваш Telegram.');
                            }
                        }}
                    >
                        <Monitor size={18} className="text-muted-foreground" />
                    </Button>
                    <Button
                        onClick={() => {
                            // Dispatch a custom event to open the create course modal in Courses.tsx
                            // and navigate there first
                            const navigate = (window as DashboardWindow)._navigate;
                            if (navigate) {
                                navigate('/courses');
                                setTimeout(() => {
                                    window.dispatchEvent(new CustomEvent('open-create-course'));
                                }, 100);
                            } else {
                                window.location.href = '/courses';
                            }
                        }}
                        size="sm"
                        className="h-11 rounded-lg bg-primary px-4 text-xs font-medium text-white shadow-sm hover:bg-primary/90"
                    >
                        <Plus size={16} />
                        Курс
                    </Button>
                    <Avatar className="h-11 w-11 border border-border">
                        <AvatarImage src={user?.avatar_url} />
                        <AvatarFallback>{user?.username?.[0]}</AvatarFallback>
                    </Avatar>
                </div>
            </header>

            {/* Filter Segment */}
            <div className="px-5 sm:px-6 mt-5 mb-5">
                <div className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-muted p-1">
                    {['Сегодня', '7д', '30д', 'Все'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "min-h-11 rounded-md px-2 text-xs font-medium transition-all duration-200",
                                filter === f ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:bg-background/50"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <main className="px-5 sm:px-6 space-y-5">
                {user && !user.is_onboarded && (
                    <AdminOnboarding tenant={tenant} coursesCount={data.kpis.live_courses} />
                )}

                {/* KPI Grid */}
                <div data-tour="kpis" className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <KpiCard
                        icon={<Users className="w-5 h-5" />}
                        label="Всего студентов"
                        value={data.kpis.total_students >= 1000 ? `${(data.kpis.total_students / 1000).toFixed(1)}k` : data.kpis.total_students.toString()}
                        trend={data.kpis.total_students_growth > 0 ? `+${data.kpis.total_students_growth}%` : undefined}
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


                {/* Growth Activity Chart */}
                <ActivityChart data={chartData} />

                {/* Telegram Integration Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tenant?.telegram_group_id && (
                        <div className="bg-card rounded-lg p-5 border border-border shadow-sm space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                                    <Globe className="text-success" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Бесплатная группа</h3>
                                    <p className="text-xs font-medium text-muted-foreground opacity-70">Подключено</p>
                                </div>
                            </div>
                            <div className="rounded-md border border-success/15 bg-success/10 px-3 py-1.5 text-center text-xs font-medium text-success">
                                Активная ссылка
                            </div>
                        </div>
                    )}
                    {tenant?.telegram_group_id_vip && (
                        <div className="bg-card rounded-lg p-5 border border-border shadow-sm space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <Sparkles className="text-amber-600" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">VIP группа</h3>
                                    <p className="text-xs font-medium text-muted-foreground opacity-70">Премиум</p>
                                </div>
                            </div>
                            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-center text-xs font-medium text-amber-700">
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
