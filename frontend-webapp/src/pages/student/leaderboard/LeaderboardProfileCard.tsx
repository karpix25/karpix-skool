import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Progress } from '../../../components/ui/progress';
import type { LeaderboardSummaryUser } from '../../../types/leaderboard';
import { cn } from '../../../lib/utils';
import {
    clampPercent,
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
    const progress = clampPercent(currentUser?.progress_percent);
    const currentLevel = currentUser?.level ?? 1;
    const nextLevel = currentUser?.next_level;
    const xpToNextLevel = currentUser?.xp_to_next_level ?? 0;
    const hasNextLevel = !!nextLevel && xpToNextLevel > 0;
    const levelTitle = `Уровень ${currentLevel} - ${levelName || 'Новичок'}`;

    return (
        <section className="flex min-w-0 flex-col justify-center p-5 sm:p-6 lg:items-center lg:px-8 lg:py-8 lg:text-center">
            <div className="flex min-w-0 items-center gap-4 lg:flex-col lg:gap-5">
                <div className="relative shrink-0">
                    <Avatar className="h-20 w-20 rounded-2xl border border-border/70 sm:h-24 sm:w-24 lg:h-52 lg:w-52 lg:rounded-full lg:border-[10px] lg:border-muted">
                        <AvatarImage src={currentUser?.avatar_url || undefined} alt={displayName} />
                        <AvatarFallback className="rounded-2xl bg-primary/10 text-lg font-semibold text-primary lg:rounded-full lg:text-5xl">
                            {getInitials(currentUser)}
                        </AvatarFallback>
                    </Avatar>
                    <span
                        className={cn(
                            'absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-card bg-primary font-mono text-lg font-semibold text-primary-foreground shadow-sm',
                            'lg:bottom-1 lg:right-1 lg:h-16 lg:w-16 lg:border-[5px] lg:text-3xl',
                        )}
                    >
                        {currentLevel}
                    </span>
                </div>

                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-2xl font-semibold leading-tight sm:text-3xl lg:max-w-[18rem]">
                        {displayName}
                    </h1>
                    <p className="mt-2 truncate text-sm font-semibold text-primary sm:text-base lg:max-w-[18rem]">
                        {levelTitle}
                    </p>
                </div>
            </div>

            <div className="mt-4 flex min-w-0 items-center justify-center gap-2 text-sm text-muted-foreground">
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

            <Progress
                aria-label="Прогресс до следующего уровня"
                value={progress}
                className="mt-3 h-2 w-full max-w-[18rem] bg-background"
            />
        </section>
    );
};
