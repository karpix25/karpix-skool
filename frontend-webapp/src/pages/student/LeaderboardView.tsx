import React, { useEffect, useState } from 'react';
import { Trophy, Loader2 } from 'lucide-react';
import api from '../../api/client';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../services/apiError';
import type { LeaderboardData, LeaderboardMember, LeaderboardParams, LeaderboardPeriod } from '../../types/leaderboard';

interface PodiumItemProps {
    member?: LeaderboardMember;
    rank: 1 | 2 | 3;
}

const formatXp = (xp: number) => xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : xp.toLocaleString();

const PodiumItem: React.FC<PodiumItemProps> = ({ member, rank }) => {
    if (!member) return null;

    const isFirst = rank === 1;
    const sizeClasses = isFirst ? "h-20 w-20 border-2" : "h-16 w-16 border";
    const ringClasses = isFirst ? "ring-2 ring-primary/20" : "";
    const badgeColor = isFirst ? "bg-primary" : rank === 2 ? "bg-slate-500" : "bg-amber-600";
    const maxWidth = isFirst ? "max-w-[120px]" : "max-w-[100px]";
    const orderClass = isFirst ? "order-2 -mt-4" : rank === 2 ? "order-1" : "order-3";

    return (
        <div className={cn(
            "flex-1 flex flex-col items-center gap-2 animate-in slide-in-from-bottom-4 duration-500 delay-100",
            maxWidth,
            orderClass
        )}>
            <div className="relative">
                <div className={cn("relative overflow-hidden rounded-full border-background", sizeClasses, ringClasses)}>
                    <Avatar className="h-full w-full">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">{member.username?.[0]}</AvatarFallback>
                    </Avatar>
                </div>
                <div className={cn(
                    "absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-md border-2 border-background px-2 py-0.5 text-[10px] font-semibold text-white",
                    badgeColor
                )}>
                    {rank}
                </div>
                {isFirst && <Trophy size={16} className="absolute -top-6 left-1/2 -translate-x-1/2 text-primary" />}
            </div>
            <div className="text-center mt-2">
                <p className="max-w-[90px] truncate text-xs font-semibold">{member.username}</p>
                <p className="text-[10px] font-semibold text-primary">{formatXp(member.xp)} XP</p>
            </div>
            <div className={cn("mt-2 w-full rounded-t-lg bg-primary/10", isFirst ? "h-20" : rank === 2 ? "h-14" : "h-10")} />
        </div>
    );
};

export const LeaderboardView: React.FC = () => {
    const [period, setPeriod] = useState<LeaderboardPeriod>('all');
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const { activeTenantId } = useAuth();

    useEffect(() => {
        const params: LeaderboardParams = { period };
        if (activeTenantId) params.tenant_id = activeTenantId;

        api.get<LeaderboardData>('/webapp/leaderboard', { params })
            .then(res => setData(res.data))
            .catch((err: unknown) => {
                console.error(err);
                setMessage(getApiErrorMessage(err, 'Не удалось загрузить рейтинг'));
            })
            .finally(() => setIsLoading(false));
    }, [period, activeTenantId]);


    if (isLoading && !data) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-primary" size={32} /></div>;
    return (
        <section className="space-y-6 overflow-x-clip pb-20 animate-in fade-in duration-500">
            {message && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                    {message}
                </div>
            )}

            {/* Tabs */}
            <div className="flex rounded-xl border border-border/70 bg-card p-1">
                {(['all', 'month', 'week'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => {
                            setMessage(null);
                            setPeriod(t);
                        }}
                        className={cn(
                            "min-h-10 flex-1 rounded-lg py-2.5 text-xs font-semibold transition-colors",
                            period === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                    >
                        {t === 'all' ? 'Все время' : t === 'month' ? 'Месяц' : 'Неделя'}
                    </button>
                ))}
            </div>

            {/* Podium */}
            <div className="flex min-h-[220px] items-end justify-center gap-2 rounded-xl border border-border/70 bg-card px-4 pb-4 pt-8">
                <PodiumItem member={data?.top_three.find(m => m.rank === 2)} rank={2} />
                <PodiumItem member={data?.top_three.find(m => m.rank === 1)} rank={1} />
                <PodiumItem member={data?.top_three.find(m => m.rank === 3)} rank={3} />
            </div>

            {/* List */}
            <div className="space-y-3 px-1">
                {data?.others.map((m) => (
                    <div
                        key={m.user_id}
                        className={cn(
                            "flex items-center gap-3 rounded-xl border border-border/70 p-3 transition-colors min-[380px]:gap-4 min-[380px]:p-4",
                            m.is_me ? "border-primary/20 bg-primary/5" : "bg-card hover:bg-muted/30"
                        )}
                    >
                        <span className="w-6 text-center text-xs font-semibold text-muted-foreground">{m.rank}</span>
                        <div className="relative">
                            <Avatar className="h-10 w-10 rounded-lg border border-border/50">
                                <AvatarImage src={m.avatar_url} />
                                <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{m.username?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="truncate text-sm font-semibold">{m.username}</h4>
                            <p className="truncate text-[10px] font-medium text-muted-foreground">
                                Ученик {m.level} уровня
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-semibold">{m.xp.toLocaleString()}</span>
                            <span className="block text-[9px] font-semibold text-muted-foreground">XP</span>
                        </div>
                    </div>
                ))}
            </div>

        </section>
    );
};
