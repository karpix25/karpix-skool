import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { InlineAlert } from '../../../components/ui/inline-alert';
import type { LessonCompletionResponse } from '../../../types/course';
import { LessonQuizLauncher } from './LessonQuizLauncher';
import { LessonQuizModal } from './LessonQuizModal';
import {
    buildInitialAnswers,
    buildPayloadAnswers,
    emptyAnswer,
    hasAnswer,
    hasUsedFinalAttempt,
} from './quizAnswerHelpers';
import type { LessonQuizAttemptResult, QuizAnswerDraft, QuizAnswerDrafts } from './quizTypes';
import { useLessonQuiz } from './useLessonQuiz';

interface LessonQuizProps {
    isLessonCompleted?: boolean;
    lessonId: string;
    onLessonCompleted?: (completion: LessonCompletionResponse) => void;
}

export const LessonQuiz: React.FC<LessonQuizProps> = ({
    isLessonCompleted = false,
    lessonId,
    onLessonCompleted,
}) => {
    const [answers, setAnswers] = useState<QuizAnswerDrafts>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleAttemptCompleted = (result: LessonQuizAttemptResult) => {
        if (result.completion_result) {
            onLessonCompleted?.(result.completion_result);
        }
    };

    const {
        attemptResult,
        error,
        isLoading,
        isSubmitting,
        latestAttempt,
        quiz,
        submitAttempt,
        submitError,
    } = useLessonQuiz(lessonId, { onAttemptCompleted: handleAttemptCompleted });

    const sortedQuestions = useMemo(
        () => quiz ? [...quiz.questions].sort((first, second) => first.order_index - second.order_index) : [],
        [quiz],
    );

    React.useEffect(() => {
        if (quiz) {
            setAnswers(buildInitialAnswers(quiz));
            setValidationError(null);
        }
    }, [quiz]);

    if (isLoading) {
        return (
            <section className="rounded-xl border border-border/80 bg-card p-4">
                <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загружаем тест урока
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <InlineAlert
                variant="error"
                title="Тест не загрузился"
                description={error}
            />
        );
    }

    if (!quiz) return null;

    const unansweredCount = sortedQuestions.filter((question) => (
        !hasAnswer(answers[question.id] || emptyAnswer, question.question_type)
    )).length;
    const canSubmit = unansweredCount === 0 && !isSubmitting;
    const finalAttemptUsed = hasUsedFinalAttempt(quiz, attemptResult, latestAttempt);

    const updateAnswer = (questionId: string, answer: QuizAnswerDraft) => {
        setAnswers((current) => ({ ...current, [questionId]: answer }));
        setValidationError(null);
    };

    const openQuiz = () => {
        if (finalAttemptUsed) return;
        setAnswers(buildInitialAnswers(quiz));
        setValidationError(null);
        setIsModalOpen(true);
    };

    const submit = async () => {
        if (!canSubmit) {
            setValidationError('Ответьте на все вопросы перед отправкой.');
            return;
        }
        setValidationError(null);
        const result = await submitAttempt(buildPayloadAnswers(quiz, answers));
        if (result) {
            setIsModalOpen(false);
            setAnswers(buildInitialAnswers(quiz));
        }
    };

    return (
        <>
            <LessonQuizLauncher
                attemptResult={attemptResult}
                isLessonCompleted={isLessonCompleted}
                latestAttempt={latestAttempt}
                onStart={openQuiz}
                quiz={quiz}
            />
            <LessonQuizModal
                answers={answers}
                canSubmit={canSubmit && !finalAttemptUsed}
                isOpen={isModalOpen}
                isSubmitting={isSubmitting}
                onAnswerChange={updateAnswer}
                onOpenChange={setIsModalOpen}
                onSubmit={submit}
                quiz={quiz}
                sortedQuestions={sortedQuestions}
                submitError={submitError}
                validationError={validationError}
            />
        </>
    );
};
