import { useCallback, useEffect, useRef, useState } from 'react';

import { getApiErrorMessage } from '../../../services/apiError';
import { fetchLessonGenerationJob, startLessonGeneration } from './courseLessonGenerationApi';
import { isActiveLessonGenerationStatus } from './lessonGenerationStatus';
import type { LessonGenerationState, StartLessonGenerationInput } from './lessonGenerationTypes';

const initialState: LessonGenerationState = {
    id: '',
    status: 'idle',
};

interface UseLessonGenerationJobOptions {
    onCompleted: () => void | Promise<void>;
}

export const useLessonGenerationJob = ({ onCompleted }: UseLessonGenerationJobOptions) => {
    const [state, setState] = useState<LessonGenerationState>(initialState);
    const pollTimerRef = useRef<number | null>(null);
    const completedJobIdsRef = useRef<Set<string>>(new Set());

    const clearPollTimer = useCallback(() => {
        if (pollTimerRef.current) {
            window.clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    }, []);

    const markCompleted = useCallback((jobId: string) => {
        if (completedJobIdsRef.current.has(jobId)) return;
        completedJobIdsRef.current.add(jobId);
        void onCompleted();
    }, [onCompleted]);

    const pollJob = useCallback(async (jobId: string) => {
        clearPollTimer();
        try {
            const job = await fetchLessonGenerationJob(jobId);
            setState(job);

            if (job.status === 'completed') {
                markCompleted(job.id || jobId);
                return;
            }

            if (isActiveLessonGenerationStatus(job.status)) {
                pollTimerRef.current = window.setTimeout(() => {
                    void pollJob(job.id || jobId);
                }, 3000);
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                status: 'failed',
                error: getApiErrorMessage(error, 'Не удалось проверить статус генерации'),
            }));
        }
    }, [clearPollTimer, markCompleted]);

    const start = useCallback(async (moduleId: string, input: StartLessonGenerationInput) => {
        clearPollTimer();
        setState({
	            id: '',
	            status: 'starting',
	            message: 'Отправляем источник в Open Notebook',
	            error: null,
        });

        try {
            const job = await startLessonGeneration(moduleId, input);
            setState(job);

            if (job.status === 'completed') {
                markCompleted(job.id);
                return;
            }

            if (job.id && isActiveLessonGenerationStatus(job.status)) {
                pollTimerRef.current = window.setTimeout(() => {
                    void pollJob(job.id);
                }, 1500);
            }
        } catch (error) {
            setState({
                id: '',
                status: 'failed',
                error: getApiErrorMessage(error, 'Не удалось запустить генерацию уроков'),
            });
        }
    }, [clearPollTimer, markCompleted, pollJob]);

    const checkStatus = useCallback(() => {
        if (!state.id) return;
        void pollJob(state.id);
    }, [pollJob, state.id]);

    const reset = useCallback(() => {
        clearPollTimer();
        setState(initialState);
    }, [clearPollTimer]);

    useEffect(() => clearPollTimer, [clearPollTimer]);

    return {
        state,
        start,
        checkStatus,
        reset,
    };
};
