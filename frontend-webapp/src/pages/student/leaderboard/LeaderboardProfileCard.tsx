import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import type { LeaderboardSummaryUser } from '../../../types/leaderboard';
import { cn } from '../../../lib/utils';
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
    const levelTitle = `Уровень ${currentLevel} - ${levelName || 'Новичок'}`;

    return (
        <section className="flex min-w-0 flex-col justify-center p-5 sm:p-6 lg:items-center lg:px-8 lg:py-8 lg:text-center">
            <div className="flex min-w-0 items-center gap-5 lg:flex-col lg:gap-5">
                <div className="relative shrink-0">
                    <Avatar className="h-24 w-24 rounded-2xl border border-border/70 lg:h-52 lg:w-52 lg:rounded-full lg:border-[10px] lg:border-muted">
                        <AvatarImage src={currentUser?.avatar_url || undefined} alt={displayName} />
                        <AvatarFallback className="rounded-2xl bg-primary/10 text-2xl font-semibold text-primary lg:rounded-full lg:text-5xl">
                            {getInitials(currentUser)}
                        </AvatarFallback>
                    </Avatar>
                    <span
                        className={cn(
                            'absolute -bottom-2 -right-2 flex h-12 w-12 items-center justify-center rounded-full border-4 border-card bg-primary font-mono text-xl font-semibold text-primary-foreground shadow-sm',
                            'lg:bottom-1 lg:right-1 lg:h-16 lg:w-16 lg:border-[5px] lg:text-3xl',
                        )}
                    >
                        {currentLevel}
                    </span>
                </div>

                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-[2rem] font-semibold leading-[1.08] tracking-normal lg:max-w-[18rem] lg:text-4xl">
                        {displayName}
                    </h1>
                    <p className="mt-2 truncate text-[19px] font-semibold leading-6 text-primary lg:max-w-[18rem] lg:text-xl">
                        {levelTitle}
                    </p>
                </div>
            </div>

            <div className="mt-5 flex min-w-0 items-center justify-center gap-1.5 text-[20px] leading-6 text-muted-foreground lg:mt-4">
                <p className="min-w-0 truncate">
                    {hasNextLevel ? (
                        <>
                            <span className="font-mono font-semibold text-primary">{formatNumber(xpToNextLevel)}</span>
                            {' '}XP до уровня {nextLevel}
                        </>
                    ) : (
                        'Максимальный уровень'
                    )}
                </p>
                <LevelRulesDialog />
            </div>
        </section>
    );
};
