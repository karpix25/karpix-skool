import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface AnalyticsData {
    kpis: {
        total_students: number;
        live_courses: number;
        revenue_mtd: number;
        new_joins_today: number;
    };
    growth_activity: number[];
    recent_activity: Array<{
        type: 'join' | 'progress';
        user_name: string;
        avatar_url?: string;
        timestamp: string;
        detail: string;
        role?: string;
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

    return (
        <div className="bg-background dark:bg-slate-950 min-h-screen font-display pb-24">
            {/* Header Section */}
            <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40 border-b border-border/40">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
                    <p className="text-xs text-muted-foreground">School of Creators</p>
                </div>
                <div className="flex gap-3">
                    <button className="w-10 h-10 rounded-full bg-muted flex items-center justify-center relative hover:bg-muted/80 transition-colors">
                        <span className="material-icons text-slate-600 dark:text-slate-300">notifications</span>
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
                <div className="bg-muted p-1 rounded-lg flex gap-1">
                    {['Today', '7d', '30d', 'All'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                                filter === f ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-background/50"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <main className="px-6">
                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Total Students */}
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-icons text-primary text-lg">group</span>
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">+12%</span>
                        </div>
                        <div className="text-2xl font-bold">{(data.kpis.total_students / 1000).toFixed(1)}k</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Students</div>
                    </div>
                    {/* Active Courses */}
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-icons text-primary text-lg">school</span>
                        </div>
                        <div className="text-2xl font-bold">{data.kpis.live_courses}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Live Courses</div>
                    </div>
                    {/* Monthly Revenue */}
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-icons text-primary text-lg">payments</span>
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">+8%</span>
                        </div>
                        <div className="text-2xl font-bold">${(data.kpis.revenue_mtd / 1000).toFixed(1)}k</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Revenue (MTD)</div>
                    </div>
                    {/* New Joins Today */}
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="material-icons text-primary text-lg">person_add</span>
                        </div>
                        <div className="text-2xl font-bold">{data.kpis.new_joins_today}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">New Joins</div>
                    </div>
                </div>

                {/* Growth Activity Chart */}
                <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mb-6">
                    <div className="p-4 flex items-center justify-between border-b border-border">
                        <h3 className="font-semibold text-sm">Growth Activity</h3>
                        <span className="text-[10px] text-muted-foreground uppercase">Last 24 Hours</span>
                    </div>
                    <div className="p-4">
                        <div className="h-32 w-full flex items-end gap-1 relative">
                            {data.growth_activity.map((val, i) => {
                                const max = Math.max(...data.growth_activity, 1);
                                const height = (val / max) * 100;
                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex-1 rounded-t-sm transition-all duration-500 hover:opacity-100",
                                            i === data.growth_activity.length - 1 ? "bg-primary" : "bg-primary/20",
                                        )}
                                        style={{ height: `${Math.max(height, 5)}%` }}
                                        title={`${val} joins`}
                                    />
                                );
                            })}
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-medium">
                            <span>12 AM</span>
                            <span>6 AM</span>
                            <span>12 PM</span>
                            <span>6 PM</span>
                            <span>NOW</span>
                        </div>
                    </div>
                </section>

                {/* Recent Activity List */}
                <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="p-4 flex items-center justify-between border-b border-border">
                        <h3 className="font-semibold text-sm">Recent Activity</h3>
                        <button className="text-[10px] text-primary font-bold uppercase">See All</button>
                    </div>
                    <div className="divide-y divide-border">
                        {data.recent_activity.map((activity, idx) => (
                            <div key={idx} className="p-4 flex gap-3 items-center hover:bg-muted/50 transition-colors">
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={activity.avatar_url} />
                                    <AvatarFallback>{activity.user_name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="text-xs font-medium">
                                        <span className="font-bold">{activity.user_name}</span> {activity.detail}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: ru })} • {activity.role || 'Member'}
                                    </div>
                                </div>
                                {activity.type === 'join' ? (
                                    <div className="w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/40"></div>
                                ) : (
                                    <span className="material-icons text-amber-500 text-sm">star</span>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};
