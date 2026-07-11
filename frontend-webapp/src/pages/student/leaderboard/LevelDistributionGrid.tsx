import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { LeaderboardLevel } from '../../../types/leaderboard';
import { formatCompactNumber, formatXp, normalizeLevels } from './leaderboardDisplay';

interface LevelDistributionGridProps {
    levels: LeaderboardLevel[];
    currentLevel?: number | null;
}

export const LevelDistributionGrid: React.FC<LevelDistributionGridProps> = ({
    levels,
    currentLevel,
}) => {
    const normalizedLevels = normalizeLevels(levels);
    const splitIndex = 5;
    const columns = [
        normalizedLevels.slice(0, splitIndex),
        normalizedLevels.slice(splitIndex),
    ];

    return (
        <section className="flex min-h-full min-w-0 items-center p-5 sm:p-6 lg:px-9">
            <div role="list" className="grid w-full min-w-0 gap-5 lg:grid-cols-2 lg:gap-8">
                {columns.map((column, columnIndex) => (
                    <div key={columnIndex} className="min-w-0 space-y-3">
                        {column.map((level) => (
                            <LevelDistributionItem
                                key={level.level}
                                level={level}
                                currentLevel={currentLevel}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </section>
    );
};

interface LevelDistributionItemProps {
    level: ReturnType<typeof normalizeLevels>[number];
    currentLevel?: number | null;
}

const LevelDistributionItem: React.FC<LevelDistributionItemProps> = ({
    level,
    currentLevel,
}) => {
    const unlockedLevel = currentLevel ?? 1;
    const isCurrent = level.level === currentLevel;
    const isUnlocked = level.level <= unlockedLevel;

    return (
        <div role="listitem" className="flex min-w-0 items-center gap-3">
            <span
                className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-base font-semibold',
                    isCurrent && 'bg-vip text-foreground shadow-sm',
                    !isCurrent && isUnlocked && 'bg-primary/10 text-primary',
                    !isUnlocked && 'bg-muted text-muted-foreground',
                )}
            >
                {isUnlocked ? level.level : <Lock className="h-5 w-5" aria-hidden="true" />}
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-baseline gap-2">
                    <p className="truncate text-base font-semibold">
                        Уровень {level.level} - {level.name}
                    </p>
                    {isCurrent && (
                        <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            ваш
                        </span>
                    )}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {formatCompactNumber(level.member_percent)}% учеников · от {formatXp(level.xp_threshold)}
                </p>
            </div>
        </div>
    );
};
