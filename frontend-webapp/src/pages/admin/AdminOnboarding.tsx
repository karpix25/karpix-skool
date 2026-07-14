/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
import React, { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import api from '../../api/client';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { InlineAlert } from '../../components/ui/inline-alert';
import { useAuth } from '../../context/AuthContext';
import { createOnboardingTasks } from './onboarding/createOnboardingTasks';
import { OnboardingSupportNote } from './onboarding/OnboardingSupportNote';
import { OnboardingTaskList } from './onboarding/OnboardingTaskList';
import { useOnboardingProgress } from './onboarding/useOnboardingProgress';

interface AdminOnboardingTenant {
    id?: string | null;
    telegram_group_id?: string | number | null;
    telegram_group_id_vip?: string | number | null;
}

interface AdminOnboardingProps {
    tenant: AdminOnboardingTenant | null;
    coursesCount?: number;
}

export const AdminOnboarding: React.FC<AdminOnboardingProps> = ({ tenant, coursesCount = 0 }) => {
    const navigate = useNavigate();
    const { refreshProfile } = useAuth();
    const { snapshot, isLoading, error, refresh } = useOnboardingProgress(tenant?.id || null, coursesCount);
    const [isCompleting, setIsCompleting] = useState(false);
    const [completionError, setCompletionError] = useState<string | null>(null);

    const tasks = useMemo(() => createOnboardingTasks({
        ...snapshot,
        hasTelegramGroup: Boolean(tenant?.telegram_group_id || tenant?.telegram_group_id_vip),
    }), [snapshot, tenant?.telegram_group_id, tenant?.telegram_group_id_vip]);

    const requiredTasks = tasks.filter((task) => task.required);
    const completedCount = requiredTasks.filter((task) => task.state === 'completed').length;
    const isReadyToFinish = completedCount === requiredTasks.length;
    const progress = requiredTasks.length > 0 ? (completedCount / requiredTasks.length) * 100 : 0;

    const handleFinishOnboarding = async () => {
        if (!isReadyToFinish || isCompleting) return;

        setIsCompleting(true);
        setCompletionError(null);
        try {
            await api.post('/webapp/onboarding/complete');
            await refreshProfile();
        } catch (requestError) {
            console.error('Failed to complete onboarding:', requestError);
            setCompletionError('Не удалось завершить запуск. Обновите прогресс и попробуйте ещё раз.');
        } finally {
            setIsCompleting(false);
        }
    };

    return (
        <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-muted/30 p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                            <h2 className="min-w-0 text-xl font-semibold text-foreground">Запуск вашей школы</h2>
                        </div>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                            Подключите Telegram, опубликуйте первый урок и проверьте путь ученика перед приглашением.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 rounded-lg border border-border bg-card px-4 py-3" aria-live="polite">
                        <div className="relative flex h-12 w-12 items-center justify-center" aria-hidden="true">
                            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-muted/30" />
                                <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="transparent"
                                    strokeDasharray={126}
                                    strokeDashoffset={126 - (126 * progress) / 100}
                                    className="text-primary transition-[stroke-dashoffset] duration-300"
                                />
                            </svg>
                            <span className="absolute text-[10px] font-semibold">{Math.round(progress)}%</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-medium text-muted-foreground">Обязательные шаги</p>
                            <p className="mt-0.5 text-sm font-semibold">{completedCount} из {requiredTasks.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            <CardContent className="space-y-4 p-5 sm:p-6">
                {error && (
                    <div className="space-y-2">
                        <InlineAlert
                            variant="error"
                            title="Прогресс не обновлён"
                            description={error}
                        />
                        <div className="flex justify-end">
                            <Button type="button" variant="outline" size="sm" onClick={() => void refresh()} disabled={isLoading}>
                                <RefreshCw className={isLoading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
                                Повторить
                            </Button>
                        </div>
                    </div>
                )}
                {completionError && (
                    <InlineAlert variant="error" title="Запуск не завершён" description={completionError} />
                )}

                <OnboardingTaskList tasks={tasks} onOpenTask={navigate} />

                {isReadyToFinish && (
                    <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground">Школа готова к запуску</p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    Первый ученик уже присоединился. Завершите настройку, чтобы убрать этот чек-лист.
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            onClick={() => void handleFinishOnboarding()}
                            disabled={isCompleting}
                            className="mt-4 h-11 w-full whitespace-nowrap rounded-lg font-semibold"
                        >
                            {isCompleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isCompleting ? 'Завершаем…' : 'Завершить настройку'}
                        </Button>
                    </div>
                )}

                <OnboardingSupportNote />
            </CardContent>
        </Card>
    );
};
