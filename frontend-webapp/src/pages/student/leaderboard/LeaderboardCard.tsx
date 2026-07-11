import React from 'react';
import { Trophy } from 'lucide-react';
import { Card } from '../../../components/ui/card';
import type { LeaderboardSummaryBoard, LeaderboardSummaryKey } from '../../../types/leaderboard';
import { formatPeriodRange, getBoardDescription, getBoardTitle } from './leaderboardDisplay';
import { LeaderboardRow } from './LeaderboardRow';

interface LeaderboardCardProps {
    board: LeaderboardSummaryBoard;
    periodKey: LeaderboardSummaryKey;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ board, periodKey }) => {
    const periodRange = formatPeriodRange(board.period);

    return (
        <Card className="flex min-h-[26rem] min-w-0 flex-col overflow-hidden rounded-xl border-border/80">
            <div className="border-b border-border/70 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold">{getBoardTitle(periodKey, board.period)}</h2>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                            {getBoardDescription(periodKey)}
                        </p>
                    </div>
                    {periodRange && (
                        <span className="shrink-0 rounded-md border border-border/70 bg-muted/55 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                            {periodRange}
                        </span>
                    )}
                </div>
            </div>

            {board.items.length > 0 ? (
                <div
                    role="list"
                    aria-label={getBoardTitle(periodKey, board.period)}
                    className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2"
                >
                    {board.items.map((item) => (
                        <LeaderboardRow key={item.user_id} item={item} periodKey={periodKey} />
                    ))}
                </div>
            ) : (
                <div
                    role="status"
                    className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-10 text-center"
                >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-muted/55 text-muted-foreground">
                        <Trophy className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-semibold">Пока нет участников</p>
                    <p className="mt-1 max-w-56 text-xs leading-5 text-muted-foreground">
                        Как только ученики начнут получать XP, список появится здесь.
                    </p>
                </div>
            )}
        </Card>
    );
};
