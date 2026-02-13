import React, { useEffect, useState } from 'react';
import { Trophy, Loader2 } from 'lucide-react';
import api from '../../api/client';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { cn } from '../../lib/utils';

interface LeaderboardData {
    top_three: any[];
    others: any[];
    user_rank: any;
}

export const LeaderboardView: React.FC = () => {
    const [period, setPeriod] = useState<'all' | 'month' | 'week'>('all');
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        api.get(`/webapp/leaderboard?period=${period}`)
            .then(res => setData(res.data))
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, [period]);

    if (isLoading && !data) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    const PodiumItem = ({ member, rank }: { member: any, rank: number }) => {
        if (!member) return <div className="flex-1 opacity-0" />;

        const isFirst = rank === 1;
        const sizeClasses = isFirst ? "h-24 w-24 border-4" : "h-16 w-16 border-2";
        const ringClasses = isFirst ? "ring-4 ring-primary/20" : "";
        const badgeColor = isFirst ? "bg-primary" : rank === 2 ? "bg-slate-400" : "bg-amber-600";

        return (
            <div className={cn(
                "flex flex-col items-center gap-2 flex-1 animate-in slide-in-from-bottom-4 duration-500 delay-100",
                isFirst ? "order-2 -mt-4" : rank === 2 ? "order-1" : "order-3"
            )}>
                <div className="relative">
                    <div className={cn("rounded-full overflow-hidden border-background relative", sizeClasses, ringClasses)}>
                        <Avatar className="h-full w-full">
                            <AvatarImage src={member.avatar_url} />
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
                    <p className="text-[10px] font-bold text-primary">{(member.xp / 1000).toFixed(1)}k XP</p>
                </div>
                <div className={cn("w-full bg-primary/10 rounded-t-xl mt-2", isFirst ? "h-24" : rank === 2 ? "h-16" : "h-12")} />
            </div>
        );
    };

    return (
        <section className="space-y-8 pb-20 animate-in fade-in duration-500">
            {/* Tabs */}
            <div className="flex bg-muted/30 p-1 rounded-2xl border border-border/50">
                {(['all', 'month', 'week'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setPeriod(t)}
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
            <div className="flex items-end justify-between px-4 pt-10 pb-4 min-h-[250px] bg-gradient-to-b from-primary/5 to-transparent rounded-[40px]">
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

            {/* User Bar */}
            {data?.user_rank && (
                <div className="fixed bottom-24 left-5 right-5 z-40 animate-in slide-in-from-bottom-10 duration-500">
                    <div className="bg-primary text-primary-foreground p-5 rounded-[32px] shadow-2xl shadow-primary/40 flex items-center justify-between border-2 border-white/10">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 rounded-2xl border-2 border-white/20">
                                <AvatarImage src={data.user_rank.avatar_url} />
                                <AvatarFallback className="bg-white/10 text-white font-bold">{data.user_rank.username?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h4 className="font-black text-sm">Вы <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-white/20 rounded-md">LVL {data.user_rank.level}</span></h4>
                                <p className="text-[10px] font-medium opacity-80 mt-1">Осталось 420 XP до ранга #{data.user_rank.rank - 1}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 text-center pr-2">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Ранг</p>
                                <p className="text-xl font-black italic mt-0.5">#{data.user_rank.rank}</p>
                            </div>
                            <div className="w-[1px] h-10 bg-white/10" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Всего</p>
                                <p className="text-xl font-black mt-0.5">{data.user_rank.xp.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
