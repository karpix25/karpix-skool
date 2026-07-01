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
    const sizeClasses = isFirst ? "h-24 w-24 border-4" : "h-16 w-16 border-2";
    const ringClasses = isFirst ? "ring-4 ring-primary/20" : "";
    const badgeColor = isFirst ? "bg-primary" : rank === 2 ? "bg-slate-400" : "bg-amber-600";
    const maxWidth = isFirst ? "max-w-[120px]" : "max-w-[100px]";
    const orderClass = isFirst ? "order-2 -mt-4" : rank === 2 ? "order-1" : "order-3";

    return (
        <div className={cn(
            "flex-1 flex flex-col items-center gap-2 animate-in slide-in-from-bottom-4 duration-500 delay-100",
            maxWidth,
            orderClass
        )}>
            <div className="relative">
                <div className={cn("rounded-full overflow-hidden border-background relative", sizeClasses, ringClasses)}>
                    <Avatar className="h-full w-full">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">{member.username?.[0]}</AvatarFallback>
                    </Avatar>
                    {isFirst && <div className="absolute inset-0 bg-primary/10 animate-pulse" />}
                </div>
                <div className={cn(
                    "absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-black text-white border-2 border-background",
                    badgeColor
                )}>
                    {rank}
                </div>
                {isFirst && <Trophy size={16} className="absolute -top-6 left-1/2 -translate-x-1/2 text-primary" />}
            </div>
            <div className="text-center mt-2">
                <p className="text-xs font-black truncate max-w-[80px]">{member.username}</p>
                <p className="text-[10px] font-bold text-primary">{formatXp(member.xp)} XP</p>
            </div>
            <div className={cn("w-full bg-primary/10 rounded-t-xl mt-2", isFirst ? "h-24" : rank === 2 ? "h-16" : "h-12")} />
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
        <section className="space-y-8 pb-20 animate-in fade-in duration-500">
            {message && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                    {message}
                </div>
            )}

            {/* Tabs */}
            <div className="flex bg-muted/30 p-1 rounded-2xl border border-border/50">
                {(['all', 'month', 'week'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => {
                            setMessage(null);
                            setPeriod(t);
                        }}
                        className={cn(
                            "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            period === t ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t === 'all' ? 'Все время' : t === 'month' ? 'Месяц' : 'Неделя'}
                    </button>
                ))}
            </div>

            {/* Podium */}
            <div className="flex items-end justify-center gap-2 px-4 pt-10 pb-4 min-h-[250px] bg-gradient-to-b from-primary/5 to-transparent rounded-[40px]">
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
                            "flex items-center gap-4 p-4 rounded-3xl border border-border/50 transition-colors",
                            m.is_me ? "bg-primary/5 border-primary/20" : "bg-card/50 hover:bg-muted/30"
                        )}
                    >
                        <span className="w-6 text-center text-xs font-black italic opacity-40">{m.rank}</span>
                        <div className="relative">
                            <Avatar className="h-10 w-10 rounded-2xl border border-border/50">
                                <AvatarImage src={m.avatar_url} />
                                <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">{m.username?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background shadow-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold truncate">{m.username}</h4>
                            <p className="text-[10px] text-muted-foreground font-medium truncate opacity-60">
                                Ученик {m.level} уровня
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-black">{m.xp.toLocaleString()}</span>
                            <span className="block text-[8px] font-black text-muted-foreground uppercase opacity-40">XP</span>
                        </div>
                    </div>
                ))}
            </div>

        </section>
    );
};
