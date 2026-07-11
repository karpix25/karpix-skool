import { useEffect, useReducer } from 'react';
import { getApiErrorMessage } from '../../../services/apiError';
import { fetchLeaderboardSummary } from '../../../services/leaderboard';
import type { LeaderboardSummary } from '../../../types/leaderboard';

interface UseLeaderboardSummaryResult {
    summary: LeaderboardSummary | null;
    isLoading: boolean;
    error: string | null;
}

type LeaderboardSummaryState = UseLeaderboardSummaryResult;

type LeaderboardSummaryAction =
    | { type: 'loading' }
    | { type: 'success'; summary: LeaderboardSummary }
    | { type: 'error'; error: string };

const initialState: LeaderboardSummaryState = {
    summary: null,
    isLoading: true,
    error: null,
};

const leaderboardSummaryReducer = (
    state: LeaderboardSummaryState,
    action: LeaderboardSummaryAction,
): LeaderboardSummaryState => {
    switch (action.type) {
        case 'loading':
            return { ...state, isLoading: true, error: null };
        case 'success':
            return { summary: action.summary, isLoading: false, error: null };
        case 'error':
            return { summary: null, isLoading: false, error: action.error };
        default:
            return state;
    }
};

export const useLeaderboardSummary = (
    tenantId?: string | null,
): UseLeaderboardSummaryResult => {
    const [state, dispatch] = useReducer(leaderboardSummaryReducer, initialState);

    useEffect(() => {
        let isCancelled = false;

        dispatch({ type: 'loading' });

        fetchLeaderboardSummary(tenantId ? { tenant_id: tenantId } : {})
            .then((nextSummary) => {
                if (!isCancelled) {
                    dispatch({ type: 'success', summary: nextSummary });
                }
            })
            .catch((err: unknown) => {
                console.error('Leaderboard summary failed:', err);
                if (!isCancelled) {
                    dispatch({
                        type: 'error',
                        error: getApiErrorMessage(err, 'Не удалось загрузить рейтинг'),
                    });
                }
            })

        return () => {
            isCancelled = true;
        };
    }, [tenantId]);

    return state;
};
