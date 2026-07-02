import React from 'react';
import { ChevronRight, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Button } from '../../../components/ui/button';
import type { WebAppUser, TenantMembership } from '../../../types/auth';
import type { LeaderboardData } from '../../../types/leaderboard';

interface WeeklyLeaderboardPreviewProps {
    leaderboard: LeaderboardData | null;
    membership: TenantMembership | null;
    user: WebAppUser | null;
    onOpenLeaderboard: () => void;
}

export const WeeklyLeaderboardPreview: React.FC<WeeklyLeaderboardPreviewProps> = ({
    leaderboard,
    membership,
    user,
    onOpenLeaderboard,
}) => {
    const topStudent = leaderboard?.top_three?.find((member) => member.rank === 1);
    const userRank = leaderboard?.user_rank?.rank || membership?.rank || '?';
    const currentXp = leaderboard?.user_rank?.xp ?? membership?.xp ?? 0;

    return (
        <section data-tour="student-ranking" className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Рейтинг недели</p>
                    <h2 className="text-lg font-bold tracking-tight">Недельный рейтинг</h2>
                </div>
                <Button variant="ghost" size="sm" className="rounded-xl px-3" onClick={onOpenLeaderboard}>
                    Все
                    <ChevronRight size={16} />
                </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
                {topStudent ? (
                    <div className="flex items-center gap-3 border-b border-border/70 p-4">
                        <span className="w-7 text-center text-sm font-black text-yellow-500">1</span>
                        <Avatar className="h-10 w-10 rounded-xl">
                            <AvatarImage src={topStudent.avatar_url} />
                            <AvatarFallback className="bg-yellow-500/10 text-yellow-600 font-bold">
                                {topStudent.username?.[0] || '1'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{topStudent.username}</p>
                            <p className="text-xs text-muted-foreground">Лидер недели</p>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">{topStudent.xp.toLocaleString()} XP</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 border-b border-border/70 p-4 text-muted-foreground">
                        <span className="w-7 text-center text-sm font-black">1</span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40">
                            <Trophy size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold">Лидер пока не определён</p>
                            <p className="text-xs">Завершайте уроки и набирайте XP</p>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-3 bg-primary/5 p-4">
                    <span className="w-7 text-center text-sm font-black text-primary">{userRank}</span>
                    <Avatar className="h-10 w-10 rounded-xl">
                        <AvatarImage src={user?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {user?.username?.[0] || 'Я'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-primary">{user?.username || 'Вы'}</p>
                        <p className="text-xs text-muted-foreground">Ваше место</p>
                    </div>
                    <span className="text-xs font-bold text-primary">{currentXp.toLocaleString()} XP</span>
                </div>
            </div>
        </section>
    );
};
