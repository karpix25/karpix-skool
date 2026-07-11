import React from 'react';
import { Card } from '../../../components/ui/card';
import type { LeaderboardSummary } from '../../../types/leaderboard';
import { formatUpdatedAt, normalizeLevels } from './leaderboardDisplay';
import { LeaderboardProfileCard } from './LeaderboardProfileCard';
import { LevelDistributionGrid } from './LevelDistributionGrid';

interface LeaderboardHeroProps {
    summary: LeaderboardSummary;
}

export const LeaderboardHero: React.FC<LeaderboardHeroProps> = ({ summary }) => {
    const updatedAt = formatUpdatedAt(summary.last_updated_at || summary.generated_at);
    const currentLevel = normalizeLevels(summary.levels).find(
        (level) => level.level === summary.current_user?.level,
    );

    return (
        <div className="space-y-3">
            <Card className="overflow-hidden rounded-xl border-border/80">
                <div className="grid min-w-0 lg:min-h-[25.5rem] lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
                    <LeaderboardProfileCard
                        currentUser={summary.current_user}
                        levelName={currentLevel?.name}
                    />
                    <div className="min-w-0 border-t border-border/70 lg:border-l lg:border-t-0">
                        <LevelDistributionGrid
                            levels={summary.levels}
                            currentLevel={summary.current_user?.level}
                        />
                    </div>
                </div>
            </Card>
            {updatedAt && (
                <p className="px-1 text-sm italic leading-6 text-muted-foreground">
                    Обновлено {updatedAt}
                </p>
            )}
        </div>
    );
};
