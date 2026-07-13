import { useEffect, useState } from 'react';

import { getApiErrorMessage } from '../../../services/apiError';
import { fetchLessonQuiz, submitLessonQuizAttempt } from './quizApi';
import type {
    LessonQuizAnswer,
    LessonQuizAttemptResult,
    LessonQuizAttemptSummary,
    LessonQuizData,
} from './quizTypes';

interface LessonQuizLoadState {
    lessonId: string | null;
    error: string | null;
    latestAttempt: LessonQuizAttemptSummary | null;
    quiz: LessonQuizData | null;
    status: 'idle' | 'loading' | 'loaded' | 'error';
}

interface UseLessonQuizOptions {
    onAttemptCompleted?: (result: LessonQuizAttemptResult) => void;
}

export const useLessonQuiz = (
    lessonId: string | null,
    options: UseLessonQuizOptions = {},
) => {
    const [loadState, setLoadState] = useState<LessonQuizLoadState>({
        lessonId: null,
        error: null,
        latestAttempt: null,
        quiz: null,
        status: 'idle',
    });
    const [attemptResult, setAttemptResult] = useState<LessonQuizAttemptResult | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!lessonId) {
            setLoadState({ lessonId: null, error: null, latestAttempt: null, quiz: null, status: 'idle' });
            return undefined;
        }

        let isMounted = true;
        setLoadState({ lessonId, error: null, latestAttempt: null, quiz: null, status: 'loading' });
        setAttemptResult(null);
        setSubmitError(null);

        fetchLessonQuiz(lessonId)
            .then((data) => {
                if (!isMounted) return;
                setLoadState({
                    lessonId,
                    error: null,
                    latestAttempt: data.latest_attempt || null,
                    quiz: data.quiz,
                    status: 'loaded',
                });
            })
            .catch((err) => {
                console.error(err);
                if (!isMounted) return;
                setLoadState({
                    lessonId,
                    error: getApiErrorMessage(err, 'Не удалось загрузить тест урока.'),
                    latestAttempt: null,
                    quiz: null,
                    status: 'error',
                });
            });

        return () => {
            isMounted = false;
        };
    }, [lessonId]);

    const submitAttempt = async (answers: LessonQuizAnswer[]) => {
        if (!lessonId) return null;

        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const result = await submitLessonQuizAttempt(lessonId, { answers });
            setAttemptResult(result);
            setLoadState((previous) => previous.lessonId === lessonId
                ? {
                    ...previous,
                    latestAttempt: {
                        id: result.attempt_id,
                        score_percent: result.score_percent,
                        passed: result.passed,
                        created_at: new Date().toISOString(),
                    },
                }
                : previous);
            options.onAttemptCompleted?.(result);
            return result;
        } catch (err) {
            console.error(err);
            setSubmitError(getApiErrorMessage(err, 'Не удалось отправить ответы. Попробуйте еще раз.'));
            return null;
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        attemptResult,
        error: loadState.error,
        isLoading: loadState.status === 'loading',
        isSubmitting,
        latestAttempt: loadState.latestAttempt,
        quiz: loadState.quiz,
        submitAttempt,
        submitError,
    };
};
