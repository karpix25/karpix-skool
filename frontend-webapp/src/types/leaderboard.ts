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
