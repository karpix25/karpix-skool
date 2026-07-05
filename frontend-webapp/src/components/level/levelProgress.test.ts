import { describe, expect, it } from 'vitest';

import {
    DEFAULT_LEVEL_THRESHOLDS,
    getLevelProgress,
    milestonesFromThresholds,
    thresholdsFromMilestones,
} from './levelProgress';

describe('levelProgress', () => {
    it('uses backend ledger thresholds as the frontend fallback', () => {
        expect(DEFAULT_LEVEL_THRESHOLDS).toEqual({
            1: 0,
            2: 20,
            3: 100,
            4: 400,
            5: 1200,
            6: 4000,
            7: 10000,
            8: 25000,
            9: 60000,
        });
    });

    it('calculates progress inside the current level bracket', () => {
        const progress = getLevelProgress(60, 2, DEFAULT_LEVEL_THRESHOLDS);

        expect(progress.nextLevel).toBe(3);
        expect(progress.nextThreshold).toBe(100);
        expect(progress.xpToNextLevel).toBe(40);
        expect(progress.progressPercent).toBe(50);
    });

    it('keeps max level stable even when xp is above the last threshold', () => {
        const progress = getLevelProgress(100000, 9, DEFAULT_LEVEL_THRESHOLDS);

        expect(progress.isMaxLevel).toBe(true);
        expect(progress.nextLevel).toBe(9);
        expect(progress.xpToNextLevel).toBe(0);
        expect(progress.progressPercent).toBe(100);
    });

    it('normalizes API milestones into thresholds and fallback milestones', () => {
        const thresholds = thresholdsFromMilestones([
            { level: 1, xp_threshold: 0, unlocks: [] },
            { level: 2, xp_threshold: 25, unlocks: [] },
        ]);

        expect(thresholds[2]).toBe(25);
        expect(thresholds[3]).toBe(100);
        expect(milestonesFromThresholds(thresholds)[1]).toMatchObject({
            level: 2,
            xp_threshold: 25,
            unlocks: [],
        });
    });
});
