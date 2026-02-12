import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Loader2, Users, GraduationCap, CreditCard, UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { KpiCard } from '../../admin/components/dashboard/KpiCard';
import { ActivityChart } from '../../admin/components/dashboard/ActivityChart';
import { ActivityList } from '../../admin/components/dashboard/ActivityList';

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
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('Today');

    useEffect(() => {
        setIsLoading(true);
        api.get('/analytics')
            .then(res => setData(res.data))
            .catch(err => console.error('Failed to fetch analytics:', err))
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (!data) return null;

    // Map growth_activity to ChartDataPoint format
    const chartData = data.growth_activity.map((val, i) => {
        const hoursAgo = 23 - i;
        const date = new Date();
        date.setHours(date.getHours() - hoursAgo);
        const timeStr = date.getHours() === new Date().getHours() ? 'NOW' :
            `${date.getHours() % 12 || 12} ${date.getHours() >= 12 ? 'PM' : 'AM'}`;
        return { time: timeStr, value: val };
    });

    return (
        <div className="bg-background min-h-screen font-display pb-24 animate-in fade-in duration-500">
            {/* Header Section */}
            <header className="px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
                    <p className="text-xs text-muted-foreground">School of Creators</p>
                </div>
                <div className="flex gap-3">
                    <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center relative hover:bg-secondary/80 transition-transform active:scale-95">
                        <span className="material-icons text-muted-foreground">notifications</span>
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></span>
                    </button>
                    <Avatar className="w-10 h-10 border border-border">
                        <AvatarImage src={user?.avatar_url} />
                        <AvatarFallback>{user?.username?.[0]}</AvatarFallback>
                    </Avatar>
                </div>
            </header>

            {/* Filter Segment */}
            <div className="px-6 mt-6 mb-6">
                <div className="bg-muted p-1 rounded-lg flex gap-1 shadow-inner">
                    {['Today', '7d', '30d', 'All'].map((f) => (
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
                        label="Total Students"
                        value={`${(data.kpis.total_students / 1000).toFixed(1)}k`}
                        trend="+12%"
                    />
                    <KpiCard
                        icon={<GraduationCap className="w-5 h-5" />}
                        label="Live Courses"
                        value={data.kpis.live_courses.toString()}
                    />
                    <KpiCard
                        icon={<CreditCard className="w-5 h-5" />}
                        label="Revenue (MTD)"
                        value={`$${(data.kpis.revenue_mtd / 1000).toFixed(1)}k`}
                        trend="+8%"
                    />
                    <KpiCard
                        icon={<UserPlus className="w-5 h-5" />}
                        label="New Joins"
                        value={data.kpis.new_joins_today.toString()}
                    />
                </div>

                {/* Growth Activity Chart */}
                <ActivityChart data={chartData} />

                {/* Recent Activity List */}
                <ActivityList activities={data.recent_activity} />
            </main>
        </div>
    );
};
