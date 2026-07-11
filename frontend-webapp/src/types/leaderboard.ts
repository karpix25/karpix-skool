export type LeaderboardPeriod = 'all' | 'month' | 'week';

export interface LeaderboardMember {
    rank: number | null;
    user_id: string;
    username: string;
    avatar_url?: string;
    xp: number;
    level: number;
    is_me: boolean;
}

export interface LeaderboardData {
    top_three: LeaderboardMember[];
    others: LeaderboardMember[];
    user_rank: LeaderboardMember | null;
}

export interface LeaderboardParams {
    period: LeaderboardPeriod;
    tenant_id?: string;
}

export type LeaderboardSummaryKey = 'week' | 'month' | 'all';

export interface LeaderboardSummaryParams {
    tenant_id?: string;
}

export interface LeaderboardSummaryUser {
    rank: number | null;
    user_id: string;
    username?: string | null;
    avatar_url?: string | null;
    xp_total: number;
    xp_period?: number | null;
    level: number;
    next_level: number | null;
    xp_to_next_level: number | null;
    progress_percent: number;
    is_me: boolean;
}

export interface LeaderboardLevel {
    level: number;
    name?: string | null;
    xp_threshold: number;
    member_count: number;
    member_percent: number;
}

export interface LeaderboardSummaryPeriod {
    key: LeaderboardSummaryKey;
    label: string;
    starts_at?: string | null;
    ends_at?: string | null;
    mode?: string | null;
}

export interface LeaderboardSummaryItem {
    rank: number | null;
    user_id: string;
    username?: string | null;
    avatar_url?: string | null;
    xp_total: number;
    xp_period?: number | null;
    level: number;
    is_me: boolean;
}

export interface LeaderboardSummaryBoard {
    period: LeaderboardSummaryPeriod;
    items: LeaderboardSummaryItem[];
}

export interface LeaderboardSummaryBoards {
    week: LeaderboardSummaryBoard;
    month: LeaderboardSummaryBoard;
    all: LeaderboardSummaryBoard;
}

export interface LeaderboardSummary {
    generated_at: string;
    last_updated_at?: string | null;
    total_participants: number;
    current_user: LeaderboardSummaryUser | null;
    levels: LeaderboardLevel[];
    leaderboards: LeaderboardSummaryBoards;
}
