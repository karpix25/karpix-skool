import { useCallback, useEffect, useRef, useState } from 'react';

import { getApiErrorMessage } from '../../../services/apiError';
import { fetchCourseStructureGenerationJob, startCourseStructureGeneration } from './courseStructureGenerationApi';
import { isActiveCourseStructureGenerationStatus } from './courseStructureGenerationStatus';
import type { CourseStructureGenerationState, StartCourseStructureGenerationInput } from './courseStructureGenerationTypes';

const initialState: CourseStructureGenerationState = {
    id: '',
    status: 'idle',
};

interface UseCourseStructureGenerationJobOptions {
    onCompleted: () => void | Promise<void>;
}

export const useCourseStructureGenerationJob = ({ onCompleted }: UseCourseStructureGenerationJobOptions) => {
    const [state, setState] = useState<CourseStructureGenerationState>(initialState);
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
            const job = await fetchCourseStructureGenerationJob(jobId);
            setState(job);

            if (job.status === 'completed') {
                markCompleted(job.id || jobId);
                return;
            }

            if (isActiveCourseStructureGenerationStatus(job.status)) {
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

    const start = useCallback(async (courseId: string, input: StartCourseStructureGenerationInput) => {
        clearPollTimer();
        setState({
	            id: '',
	            status: 'starting',
	            message: 'Отправляем источник в Open Notebook',
	            error: null,
        });

        try {
            const job = await startCourseStructureGeneration(courseId, input);
            setState(job);

            if (job.status === 'completed') {
                markCompleted(job.id);
                return job;
            }

            if (job.id && isActiveCourseStructureGenerationStatus(job.status)) {
                pollTimerRef.current = window.setTimeout(() => {
                    void pollJob(job.id);
                }, 1500);
            }
            return job;
        } catch (error) {
            setState({
                id: '',
                status: 'failed',
                error: getApiErrorMessage(error, 'Не удалось запустить генерацию структуры'),
            });
            return null;
        }
    }, [clearPollTimer, markCompleted, pollJob]);

    const watch = useCallback((jobId: string) => {
        if (!jobId) return;
        void pollJob(jobId);
    }, [pollJob]);

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
        watch,
        checkStatus,
        reset,
    };
};
