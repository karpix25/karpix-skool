import { useEffect, useState } from 'react';

import api from '../../../api/client';
import { useAuth } from '../../../context/AuthContext';
import { getApiErrorMessage } from '../../../services/apiError';
import type { LessonCompletionResponse, LessonDetailData } from '../../../types/course';

interface LessonLoadState {
    lessonId?: string | null;
    data: LessonDetailData | null;
    error: string | null;
    status: 'idle' | 'loading' | 'loaded' | 'error';
}

interface LessonCompletionState {
    lessonId: string | null;
    error: string | null;
    result: LessonCompletionResponse | null;
}

interface UseActiveLessonDataOptions {
    onCompleted?: (response: LessonCompletionResponse) => void;
}

export const useActiveLessonData = (
    lessonId: string | null,
    options: UseActiveLessonDataOptions = {},
) => {
    const { refreshProfile } = useAuth();
    const [loadState, setLoadState] = useState<LessonLoadState>({
        lessonId: null,
        data: null,
        error: null,
        status: 'idle',
    });
    const [isCompleting, setIsCompleting] = useState(false);
    const [completionState, setCompletionState] = useState<LessonCompletionState>({
        lessonId: null,
        error: null,
        result: null,
    });

    useEffect(() => {
        if (!lessonId) return undefined;

        let isMounted = true;

        api.get<LessonDetailData>(`/webapp/lessons/${lessonId}`)
            .then((res) => {
                if (isMounted) {
                    setLoadState({ lessonId, data: res.data, error: null, status: 'loaded' });
                }
            })
            .catch((err) => {
                console.error(err);
                if (isMounted) {
                    setLoadState({
                        lessonId,
                        data: null,
                        error: getApiErrorMessage(err, 'Не удалось открыть урок. Попробуйте выбрать другой урок.'),
                        status: 'error',
                    });
                }
            });

        return () => {
            isMounted = false;
        };
    }, [lessonId]);

    const completeLesson = async () => {
        if (!lessonId) return;

        setIsCompleting(true);
        setCompletionState({ lessonId, error: null, result: null });
        try {
            const response = await api.post<LessonCompletionResponse>(`/webapp/lessons/${lessonId}/complete`);
            setLoadState((previous) => previous.lessonId === lessonId && previous.data
                ? { ...previous, data: { ...previous.data, is_completed: true } }
                : previous);
            setCompletionState({
                lessonId,
                error: null,
                result: response.data.xp_granted > 0 ? response.data : null,
            });
            options.onCompleted?.(response.data);
            await refreshProfile();
        } catch (err) {
            console.error(err);
            setCompletionState({
                lessonId,
                error: getApiErrorMessage(err, 'Не удалось завершить урок. Попробуйте еще раз.'),
                result: null,
            });
        } finally {
            setIsCompleting(false);
        }
    };

    const isCurrentLesson = loadState.lessonId === lessonId;
    const isCurrentCompletion = completionState.lessonId === lessonId;

    return {
        data: isCurrentLesson ? loadState.data : null,
        error: isCurrentLesson ? loadState.error : null,
        isLoading: Boolean(lessonId) && (loadState.status === 'loading' || !isCurrentLesson),
        isCompleting,
        completeError: isCurrentCompletion ? completionState.error : null,
        completionResult: isCurrentCompletion ? completionState.result : null,
        completeLesson,
    };
};
