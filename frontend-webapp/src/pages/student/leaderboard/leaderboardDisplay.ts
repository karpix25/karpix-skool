import type {
    LeaderboardLevel,
    LeaderboardSummaryItem,
    LeaderboardSummaryKey,
    LeaderboardSummaryPeriod,
    LeaderboardSummaryUser,
} from '../../../types/leaderboard';

export const leaderboardBoardOrder: LeaderboardSummaryKey[] = ['week', 'month', 'all'];

const numberFormatter = new Intl.NumberFormat('ru-RU');
const compactFormatter = new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1,
});
const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
});
const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
});

const defaultLevelNames: Record<number, string> = {
    1: 'Новичок',
    2: 'Новичок',
    3: 'Ученик',
    4: 'Ученик',
    5: 'Подмастерье',
    6: 'Подмастерье',
    7: 'Эксперт',
    8: 'Эксперт',
    9: 'Грандмастер',
};

const boardTitles: Record<LeaderboardSummaryKey, string> = {
    week: '7 дней',
    month: '30 дней',
    all: 'Все время',
};

const boardDescriptions: Record<LeaderboardSummaryKey, string> = {
    week: 'XP за последние 7 дней',
    month: 'XP за последние 30 дней',
    all: 'Общий XP за все время',
};

export const formatNumber = (value?: number | null) => numberFormatter.format(value ?? 0);

export const formatCompactNumber = (value?: number | null) => compactFormatter.format(value ?? 0);

export const formatXp = (value?: number | null) => `${formatNumber(value)} XP`;

export const formatRank = (rank?: number | null) => (rank ? `#${rank}` : '—');

export const clampPercent = (value?: number | null) => Math.max(0, Math.min(100, value ?? 0));

export const getBoardTitle = (
    key: LeaderboardSummaryKey,
    period?: LeaderboardSummaryPeriod,
) => period?.label?.trim() || boardTitles[key];

export const getBoardDescription = (key: LeaderboardSummaryKey) => boardDescriptions[key];

export const getLeaderboardXp = (
    key: LeaderboardSummaryKey,
    item: Pick<LeaderboardSummaryItem, 'xp_period' | 'xp_total'>,
) => (key === 'all' ? item.xp_total : item.xp_period ?? 0);

export const getDisplayName = (
    person?: Pick<LeaderboardSummaryItem, 'username'> | Pick<LeaderboardSummaryUser, 'username'> | null,
) => {
    const name = person?.username?.trim();
    return name || 'Ученик Karpix';
};

export const getInitials = (
    person?: Pick<LeaderboardSummaryItem, 'username'> | Pick<LeaderboardSummaryUser, 'username'> | null,
) => {
    const displayName = getDisplayName(person);
    const parts = displayName.split(/\s+/).filter(Boolean);

    if (parts.length > 1) {
        return parts.slice(0, 2).map((part) => Array.from(part)[0]).join('').toUpperCase();
    }

    return (Array.from(displayName)[0] || 'К').toUpperCase();
};

export const normalizeLevels = (levels: LeaderboardLevel[]) => {
    const levelsByNumber = new Map(levels.map((level) => [level.level, level]));

    return Array.from({ length: 9 }, (_, index) => {
        const levelNumber = index + 1;
        const level = levelsByNumber.get(levelNumber);

        return {
            level: levelNumber,
            name: level?.name?.trim() || defaultLevelNames[levelNumber] || `Уровень ${levelNumber}`,
            xp_threshold: level?.xp_threshold ?? 0,
            member_count: level?.member_count ?? 0,
            member_percent: level?.member_percent ?? 0,
        };
    });
};

export const formatPeriodRange = (period?: LeaderboardSummaryPeriod) => {
    if (!period?.starts_at || !period.ends_at) return null;

    const start = new Date(period.starts_at);
    const end = new Date(period.ends_at);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

    return `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`;
};

export const formatUpdatedAt = (value?: string | null) => {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return dateTimeFormatter.format(date);
};
