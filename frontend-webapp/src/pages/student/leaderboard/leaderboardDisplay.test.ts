import { describe, expect, it } from 'vitest';
import type { LeaderboardSummaryItem } from '../../../types/leaderboard';
import { getLeaderboardXp, normalizeLevels } from './leaderboardDisplay';

describe('leaderboardDisplay', () => {
    it('normalizes all nine levels and falls back to local display names', () => {
        const levels = normalizeLevels([
            {
                level: 1,
                name: null,
                xp_threshold: 0,
                member_count: 2,
                member_percent: 50,
            },
            {
                level: 3,
                name: 'AI Builder',
                xp_threshold: 20,
                member_count: 1,
                member_percent: 25,
            },
        ]);

        expect(levels).toHaveLength(9);
        expect(levels[0]).toMatchObject({
            level: 1,
            name: 'Новичок',
            xp_threshold: 0,
            member_count: 2,
            member_percent: 50,
        });
        expect(levels[2]).toMatchObject({
            level: 3,
            name: 'AI Builder',
            xp_threshold: 20,
            member_count: 1,
            member_percent: 25,
        });
        expect(levels[8]).toMatchObject({
            level: 9,
            name: 'Грандмастер',
            xp_threshold: 0,
            member_count: 0,
            member_percent: 0,
        });
    });

    it('uses period XP for rolling boards and total XP for all time', () => {
        const item = {
            xp_total: 120,
            xp_period: 15,
        } as Pick<LeaderboardSummaryItem, 'xp_period' | 'xp_total'>;

        expect(getLeaderboardXp('week', item)).toBe(15);
        expect(getLeaderboardXp('month', item)).toBe(15);
        expect(getLeaderboardXp('all', item)).toBe(120);
    });

    it('treats missing rolling XP as zero instead of leaking all-time totals', () => {
        const item = {
            xp_total: 120,
            xp_period: null,
        } as Pick<LeaderboardSummaryItem, 'xp_period' | 'xp_total'>;

        expect(getLeaderboardXp('week', item)).toBe(0);
        expect(getLeaderboardXp('month', item)).toBe(0);
    });
});
