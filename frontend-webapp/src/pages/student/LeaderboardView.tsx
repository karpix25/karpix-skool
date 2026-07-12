import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LeaderboardCard } from './leaderboard/LeaderboardCard';
import { LeaderboardEmptyState } from './leaderboard/LeaderboardEmptyState';
import { LeaderboardHero } from './leaderboard/LeaderboardHero';
import { leaderboardBoardOrder } from './leaderboard/leaderboardDisplay';
import { useLeaderboardSummary } from './leaderboard/useLeaderboardSummary';
import { StudentAccountPanel } from './components/StudentAccountPanel';

export const LeaderboardView: React.FC = () => {
    const { activeTenantId } = useAuth();
    const { summary, isLoading, error } = useLeaderboardSummary(activeTenantId);
    const location = useLocation();

    useEffect(() => {
        if (location.hash !== '#account' || isLoading) return;

        const frameId = window.requestAnimationFrame(() => {
            document.getElementById('account')?.scrollIntoView({ block: 'start' });
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [isLoading, location.hash, summary]);

    if (isLoading && !summary) {
        return (
            <div
                role="status"
                aria-live="polite"
                className="flex min-h-[50vh] w-full items-center justify-center text-primary"
            >
                <Loader2 className="animate-spin" size={32} />
                <span className="sr-only">Загружаем рейтинг</span>
            </div>
        );
    }

    if (error) {
        return (
            <section className="mx-auto w-full max-w-[1085px] overflow-x-clip pb-20">
                <LeaderboardEmptyState
                    variant="error"
                    title="Прогресс временно недоступен"
                    description={`${error}. Попробуйте обновить экран чуть позже.`}
                />
            </section>
        );
    }

    if (!summary) {
        return (
            <section className="mx-auto w-full max-w-[1085px] overflow-x-clip pb-20">
                <LeaderboardEmptyState
                    title="Прогресс пока пустой"
                    description="Когда ученики начнут получать XP, здесь появятся уровни и три рейтинга школы."
                />
            </section>
        );
    }

    return (
        <section className="mx-auto w-full max-w-[1085px] space-y-4 overflow-x-clip pb-20 animate-in fade-in duration-300">
            <LeaderboardHero summary={summary} />

            <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
                {leaderboardBoardOrder.map((periodKey) => (
                    <LeaderboardCard
                        key={periodKey}
                        periodKey={periodKey}
                        board={summary.leaderboards[periodKey]}
                    />
                ))}
            </div>

            <StudentAccountPanel />
        </section>
    );
};
