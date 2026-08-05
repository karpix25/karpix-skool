import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import type { LeaderboardSummaryUser } from '../../../types/leaderboard';
import {
    formatNumber,
    getDisplayName,
    getInitials,
} from './leaderboardDisplay';
import { LevelRulesDialog } from './LevelRulesDialog';

interface LeaderboardProfileCardProps {
    currentUser: LeaderboardSummaryUser | null;
    levelName?: string | null;
}

export const LeaderboardProfileCard: React.FC<LeaderboardProfileCardProps> = ({
    currentUser,
    levelName,
}) => {
    const displayName = getDisplayName(currentUser);
    const currentLevel = currentUser?.level ?? 1;
    const nextLevel = currentUser?.next_level;
    const xpToNextLevel = currentUser?.xp_to_next_level ?? 0;
    const hasNextLevel = !!nextLevel && xpToNextLevel > 0;
    const levelTitle = `Уровень ${currentLevel} · ${levelName || 'Новичок'}`;

    return (
        <section className="flex min-w-0 flex-col justify-center p-4 sm:p-5 lg:px-6 lg:py-7">
            <div className="relative mt-8 min-h-28 rounded-[1.75rem] border border-primary/35 bg-gradient-to-r from-sky-400 via-sky-400 to-sky-500 px-5 py-5 pr-32 text-white shadow-sm lg:mt-10 lg:min-h-32 lg:px-6 lg:py-6 lg:pr-36">
                <Avatar className="absolute -top-9 right-6 h-28 w-28 rounded-full border-[7px] border-card bg-card shadow-md lg:-top-11 lg:right-7 lg:h-32 lg:w-32">
                    <AvatarImage src={currentUser?.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="rounded-full bg-primary/10 text-3xl font-semibold text-primary lg:text-4xl">
                        {getInitials(currentUser)}
                    </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                        <h1 className="min-w-0 truncate text-3xl font-semibold leading-tight tracking-normal">
                            {displayName}
                        </h1>
                        <span className="shrink-0 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold text-white">
                            {levelTitle}
                        </span>
                    </div>
                    <p className="mt-4 text-sm font-semibold leading-5 text-white/85">
                        {hasNextLevel ? `${formatNumber(xpToNextLevel)} XP до уровня ${nextLevel}` : 'Максимальный уровень'}
                    </p>
                </div>

                <div className="absolute bottom-3 right-3 text-white/90">
                    <LevelRulesDialog />
                </div>
            </div>
        </section>
    );
};
