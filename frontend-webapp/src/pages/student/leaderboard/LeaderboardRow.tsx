import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { cn } from '../../../lib/utils';
import type { LeaderboardSummaryItem, LeaderboardSummaryKey } from '../../../types/leaderboard';
import {
    formatXp,
    getDisplayName,
    getInitials,
    getLeaderboardXp,
} from './leaderboardDisplay';

interface LeaderboardRowProps {
    item: LeaderboardSummaryItem;
    periodKey: LeaderboardSummaryKey;
}

const getRankClassName = (rank?: number | null) => {
    if (rank === 1) return 'border-vip/30 bg-vip/10 text-vip';
    if (rank === 2) return 'border-border bg-muted text-foreground';
    if (rank === 3) return 'border-vip/20 bg-vip/5 text-vip';
    return 'border-border/70 bg-muted/55 text-muted-foreground';
};

export const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ item, periodKey }) => {
    const displayName = getDisplayName(item);
    const xp = getLeaderboardXp(periodKey, item);

    return (
        <div
            role="listitem"
            aria-current={item.is_me ? 'true' : undefined}
            className={cn(
                'flex min-w-0 items-center gap-3 rounded-lg border px-3 py-3 transition-colors duration-150',
                item.is_me
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-transparent bg-transparent hover:border-border/70 hover:bg-muted/35'
            )}
        >
            <span
                className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-semibold',
                    getRankClassName(item.rank)
                )}
            >
                {item.rank ?? '-'}
            </span>

            <Avatar className="h-10 w-10 rounded-lg border border-border/70">
                <AvatarImage src={item.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(item)}
                </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-5">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">Уровень {item.level || 1}</p>
            </div>

            <div className="min-w-[4.75rem] text-right">
                <p className="truncate font-mono text-sm font-semibold">{formatXp(xp)}</p>
                <p className="text-[11px] text-muted-foreground">{periodKey === 'all' ? 'всего' : 'период'}</p>
            </div>
        </div>
    );
};
