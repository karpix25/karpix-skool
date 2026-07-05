import type { WebAppLevelMilestone } from '../../types/levels';

export const MAX_LEVEL = 9;

export const DEFAULT_LEVEL_THRESHOLDS: Record<number, number> = {
    1: 0,
    2: 20,
    3: 100,
    4: 400,
    5: 1200,
    6: 4000,
    7: 10000,
    8: 25000,
    9: 60000,
};

export const thresholdsFromMilestones = (
    milestones?: WebAppLevelMilestone[],
) => {
    if (!milestones?.length) return DEFAULT_LEVEL_THRESHOLDS;

    return milestones.reduce<Record<number, number>>((acc, milestone) => {
        acc[milestone.level] = milestone.xp_threshold;
        return acc;
    }, { ...DEFAULT_LEVEL_THRESHOLDS });
};

export const getNextLevel = (level: number) => Math.min(level + 1, MAX_LEVEL);

export const getLevelThreshold = (
    thresholds: Record<number, number>,
    level: number,
) => thresholds[level] ?? DEFAULT_LEVEL_THRESHOLDS[level] ?? 0;

export const milestonesFromThresholds = (
    thresholds: Record<number, number>,
): WebAppLevelMilestone[] => Object.entries(thresholds)
    .map(([level, xpThreshold]) => ({
        level: Number(level),
        xp_threshold: xpThreshold,
        unlocks: [],
    }))
    .sort((a, b) => a.level - b.level);

export const getLevelProgress = (
    xp: number,
    level: number,
    thresholds: Record<number, number>,
) => {
    const currentLevel = Math.max(1, Math.min(level || 1, MAX_LEVEL));
    const currentXp = Math.max(0, xp || 0);
    const nextLevel = getNextLevel(currentLevel);
    const currentThreshold = getLevelThreshold(thresholds, currentLevel);
    const nextThreshold = getLevelThreshold(thresholds, nextLevel);
    const isMaxLevel = currentLevel >= MAX_LEVEL;

    if (isMaxLevel) {
        return {
            isMaxLevel,
            nextLevel,
            currentThreshold,
            nextThreshold,
            xpToNextLevel: 0,
            progressPercent: 100,
        };
    }

    const xpInLevel = Math.max(0, currentXp - currentThreshold);
    const xpNeededForLevel = Math.max(1, nextThreshold - currentThreshold);
    const xpToNextLevel = Math.max(0, nextThreshold - currentXp);

    return {
        isMaxLevel,
        nextLevel,
        currentThreshold,
        nextThreshold,
        xpToNextLevel,
        progressPercent: Math.min(100, (xpInLevel / xpNeededForLevel) * 100),
    };
};
