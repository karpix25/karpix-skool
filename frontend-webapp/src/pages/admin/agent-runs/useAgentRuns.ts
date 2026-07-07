import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    approveAgentRun,
    fetchAgentRuns,
    publishAgentRun,
    rejectAgentRun,
    retryAgentRun,
} from './agentRunsApi';
import { getCourseArtifact, getErrorMessage } from './agentRunDisplay';
import type { AgentRun, AgentRunAction, AgentRunsFeedback } from './types';

export const useAgentRuns = () => {
    const [runs, setRuns] = useState<AgentRun[]>([]);
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<AgentRunsFeedback | null>(null);
    const feedbackIdRef = useRef(0);
    const navigate = useNavigate();

    const selectedRun = useMemo(
        () => runs.find((run) => run.id === selectedRunId) || null,
        [runs, selectedRunId]
    );

    const showFeedback = useCallback((next: Omit<AgentRunsFeedback, 'id'>) => {
        feedbackIdRef.current += 1;
        setFeedback({ ...next, id: feedbackIdRef.current });
    }, []);

    const refreshRuns = useCallback(async () => {
        try {
            setLoading(true);
            setRuns(await fetchAgentRuns());
        } catch (error) {
            showFeedback({
                variant: 'error',
                title: 'Не удалось загрузить AI drafts',
                description: getErrorMessage(error, 'Проверьте выбранную школу и попробуйте обновить страницу.'),
            });
        } finally {
            setLoading(false);
        }
    }, [showFeedback]);

    useEffect(() => {
        refreshRuns();
    }, [refreshRuns]);

    const replaceRun = useCallback((nextRun: AgentRun) => {
        setRuns((current) => current.map((run) => run.id === nextRun.id ? nextRun : run));
        setSelectedRunId(nextRun.id);
    }, []);

    const runAction = useCallback(async (run: AgentRun, action: AgentRunAction) => {
        const actionKey = `${run.id}:${action}`;
        if (pendingAction) return;

        try {
            setPendingAction(actionKey);
            if (action === 'approve') {
                replaceRun(await approveAgentRun(run.id));
                showFeedback({ variant: 'success', title: 'Draft одобрен' });
            } else if (action === 'reject') {
                replaceRun(await rejectAgentRun(run.id));
                showFeedback({ variant: 'success', title: 'Draft отклонен' });
            } else if (action === 'publish') {
                const result = await publishAgentRun(run.id, { notify_subscribers: false });
                replaceRun(result.run);
                showFeedback({
                    variant: 'success',
                    title: 'Курс опубликован',
                    description: `${result.published_lessons_count} уроков опубликовано.`,
                });
            } else {
                const retryRun = await retryAgentRun(run.id);
                setRuns((current) => [retryRun, ...current]);
                setSelectedRunId(retryRun.id);
                showFeedback({ variant: 'success', title: 'Новый запуск создан' });
            }
        } catch (error) {
            showFeedback({
                variant: 'error',
                title: 'Действие не выполнено',
                description: getErrorMessage(error, 'Сервер не смог выполнить операцию.'),
            });
        } finally {
            setPendingAction(null);
        }
    }, [pendingAction, replaceRun, showFeedback]);

    const openCourseEditor = useCallback((run: AgentRun) => {
        const courseId = getCourseArtifact(run)?.resource_id;
        if (courseId) navigate(`/courses/${courseId}`);
    }, [navigate]);

    return {
        feedback,
        loading,
        pendingAction,
        runs,
        selectedRun,
        clearFeedback: () => setFeedback(null),
        closeSelectedRun: () => setSelectedRunId(null),
        openCourseEditor,
        refreshRuns,
        runAction,
        selectRun: setSelectedRunId,
    };
};
