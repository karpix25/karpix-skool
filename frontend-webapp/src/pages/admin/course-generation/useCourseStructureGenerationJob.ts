import { useCallback, useEffect, useRef, useState } from 'react';

import { getApiErrorMessage } from '../../../services/apiError';
import {
    fetchCourseStructureGenerationJob,
    fetchLatestCourseStructureGenerationJob,
    resumeCourseStructureGenerationJob,
    startCourseStructureGeneration,
} from './courseStructureGenerationApi';
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
    const [isResuming, setIsResuming] = useState(false);
    const pollTimerRef = useRef<number | null>(null);
    const completedJobIdsRef = useRef<Set<string>>(new Set());
    const readyCountsRef = useRef<Map<string, number>>(new Map());

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

    const refreshWhenReadyCountIncreases = useCallback((job: CourseStructureGenerationState) => {
        if (!job.id || typeof job.ready_lesson_count !== 'number') return false;
        const previousReady = readyCountsRef.current.get(job.id) || 0;
        readyCountsRef.current.set(job.id, job.ready_lesson_count);
        if (job.ready_lesson_count <= previousReady) return false;
        void onCompleted();
        return true;
    }, [onCompleted]);

    const finishJob = useCallback((jobId: string, contentRefreshed: boolean) => {
        if (contentRefreshed) {
            completedJobIdsRef.current.add(jobId);
            return;
        }
        markCompleted(jobId);
    }, [markCompleted]);

    const pollJob = useCallback(async (jobId: string) => {
        clearPollTimer();
        try {
            const job = await fetchCourseStructureGenerationJob(jobId);
            setState(job);
            const contentRefreshed = refreshWhenReadyCountIncreases(job);

            if (job.status === 'completed') {
                finishJob(job.id || jobId, contentRefreshed);
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
    }, [clearPollTimer, finishJob, refreshWhenReadyCountIncreases]);

    const start = useCallback(async (courseId: string, input: StartCourseStructureGenerationInput) => {
        clearPollTimer();
        setState({
            id: '',
            status: 'starting',
            message: 'Отправляем материалы в обработку',
            error: null,
        });

        try {
            const job = await startCourseStructureGeneration(courseId, input);
            setState(job);
            const contentRefreshed = refreshWhenReadyCountIncreases(job);

            if (job.status === 'completed') {
                finishJob(job.id, contentRefreshed);
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
    }, [clearPollTimer, finishJob, pollJob, refreshWhenReadyCountIncreases]);

    const watch = useCallback((jobId: string) => {
        if (!jobId) return;
        void pollJob(jobId);
    }, [pollJob]);

    const loadLatest = useCallback(async (courseId: string) => {
        if (!courseId) return;
        clearPollTimer();
        try {
            const job = await fetchLatestCourseStructureGenerationJob(courseId);
            if (!job) return;
            setState(job);
            const contentRefreshed = refreshWhenReadyCountIncreases(job);
            if (job.status === 'completed') {
                finishJob(job.id, contentRefreshed);
                return;
            }
            if (job.id && isActiveCourseStructureGenerationStatus(job.status)) {
                pollTimerRef.current = window.setTimeout(() => {
                    void pollJob(job.id);
                }, 1500);
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                status: 'failed',
                error: getApiErrorMessage(error, 'Не удалось загрузить статус генерации'),
            }));
        }
    }, [clearPollTimer, finishJob, pollJob, refreshWhenReadyCountIncreases]);

    const resume = useCallback(async (jobId: string, includeSourceGaps = false) => {
        if (!jobId || isResuming) return null;
        clearPollTimer();
        setIsResuming(true);
        setState(prev => ({ ...prev, error: null, message: 'Продолжаем генерацию проблемных уроков' }));

        try {
            const job = await resumeCourseStructureGenerationJob(jobId, includeSourceGaps);
            setState(job);
            const contentRefreshed = refreshWhenReadyCountIncreases(job);
            if (job.status === 'completed') {
                finishJob(job.id || jobId, contentRefreshed);
                return job;
            }
            if (job.id && isActiveCourseStructureGenerationStatus(job.status)) {
                pollTimerRef.current = window.setTimeout(() => {
                    void pollJob(job.id);
                }, 1500);
            }
            return job;
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: getApiErrorMessage(error, 'Не удалось продолжить генерацию'),
            }));
            return null;
        } finally {
            setIsResuming(false);
        }
    }, [clearPollTimer, finishJob, isResuming, pollJob, refreshWhenReadyCountIncreases]);

    const checkStatus = useCallback(() => {
        if (!state.id) return;
        void pollJob(state.id);
    }, [pollJob, state.id]);

    const reset = useCallback(() => {
        clearPollTimer();
        setIsResuming(false);
        setState(initialState);
    }, [clearPollTimer]);

    useEffect(() => clearPollTimer, [clearPollTimer]);

    return {
        state,
        start,
        watch,
        loadLatest,
        checkStatus,
        resume,
        isResuming,
        reset,
    };
};
