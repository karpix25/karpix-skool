import React, { useMemo, useState } from 'react';
import { AlertCircle, ClipboardCheck, Loader2 } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { InlineAlert } from '../../../components/ui/inline-alert';
import type { LessonCompletionResponse } from '../../../types/course';
import { QuizQuestion } from './QuizQuestion';
import { QuizResult } from './QuizResult';
import type {
    LessonQuizAnswer,
    LessonQuizAttemptResult,
    LessonQuizData,
    QuizAnswerDraft,
    QuizAnswerDrafts,
} from './quizTypes';
import { useLessonQuiz } from './useLessonQuiz';

interface LessonQuizProps {
    isLessonCompleted?: boolean;
    lessonId: string;
    onLessonCompleted?: (completion: LessonCompletionResponse) => void;
}

const emptyAnswer: QuizAnswerDraft = { selectedOptionIds: [], textAnswer: '' };

const buildInitialAnswers = (quiz: LessonQuizData): QuizAnswerDrafts => (
    Object.fromEntries(quiz.questions.map((question) => [question.id, emptyAnswer]))
);

const hasAnswer = (answer: QuizAnswerDraft, questionType: string) => {
    if (questionType === 'short_text') return answer.textAnswer.trim().length > 0;
    return answer.selectedOptionIds.length > 0;
};

const buildPayloadAnswers = (quiz: LessonQuizData, answers: QuizAnswerDrafts): LessonQuizAnswer[] => (
    quiz.questions.map((question) => {
        const answer = answers[question.id] || emptyAnswer;
        if (question.question_type === 'short_text') {
            return { question_id: question.id, text_answer: answer.textAnswer.trim() };
        }
        return { question_id: question.id, selected_option_ids: answer.selectedOptionIds };
    })
);

export const LessonQuiz: React.FC<LessonQuizProps> = ({
    isLessonCompleted = false,
    lessonId,
    onLessonCompleted,
}) => {
    const [answers, setAnswers] = useState<QuizAnswerDrafts>({});
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
    const hasUsedFinalAttempt = !quiz.allow_retries && Boolean(attemptResult || latestAttempt);
    const shouldDisableForm = isSubmitting || hasUsedFinalAttempt;

    const updateAnswer = (questionId: string, answer: QuizAnswerDraft) => {
        setAnswers((current) => ({ ...current, [questionId]: answer }));
        setValidationError(null);
    };

    const submit = async () => {
        if (!canSubmit) {
            setValidationError('Ответьте на все вопросы перед отправкой.');
            return;
        }
        setValidationError(null);
        await submitAttempt(buildPayloadAnswers(quiz, answers));
    };

    return (
        <section className="space-y-5 rounded-2xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] min-[380px]:p-5">
            <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold leading-tight">Тест по уроку</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {quiz.is_required ? 'Обязательный тест' : 'Практика для самопроверки'} · проходной балл {quiz.passing_score_percent}%
                    </p>
                    {latestAttempt && (
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                            Последняя попытка: {Math.round(latestAttempt.score_percent)}% · {latestAttempt.passed ? 'сдано' : 'не сдано'}
                        </p>
                    )}
                    {isLessonCompleted && (
                        <p className="mt-1 text-xs font-semibold text-success">Урок уже отмечен пройденным</p>
                    )}
                </div>
            </div>

            {attemptResult && <QuizResult result={attemptResult} quiz={quiz} />}

            <div className="space-y-4">
                {sortedQuestions.map((question, index) => (
                    <QuizQuestion
                        key={question.id}
                        answer={answers[question.id] || emptyAnswer}
                        disabled={shouldDisableForm}
                        index={index}
                        onChange={(answer) => updateAnswer(question.id, answer)}
                        question={question}
                    />
                ))}
            </div>

            {(validationError || submitError) && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{validationError || submitError}</span>
                </div>
            )}

            <Button
                type="button"
                className="h-12 w-full rounded-lg text-sm font-semibold"
                disabled={shouldDisableForm || !canSubmit}
                onClick={submit}
            >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : hasUsedFinalAttempt ? 'Попытка использована' : 'Отправить ответы'}
            </Button>
        </section>
    );
};
