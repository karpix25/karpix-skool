import api from '../api/client';
import type { LeaderboardSummary, LeaderboardSummaryParams } from '../types/leaderboard';

export const fetchLeaderboardSummary = async (
    params: LeaderboardSummaryParams = {},
): Promise<LeaderboardSummary> => {
    const response = await api.get<LeaderboardSummary>('/webapp/leaderboard/summary', { params });
    return response.data;
};
