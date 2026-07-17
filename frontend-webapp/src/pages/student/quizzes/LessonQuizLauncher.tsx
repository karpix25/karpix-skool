import React from 'react';
import { ClipboardCheck } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { QuizResult } from './QuizResult';
import { getQuizStartLabel, hasUsedFinalAttempt, isQuizAttemptPassed } from './quizAnswerHelpers';
import type {
    LessonQuizAttemptResult,
    LessonQuizAttemptSummary,
    LessonQuizData,
} from './quizTypes';

interface LessonQuizLauncherProps {
    attemptResult: LessonQuizAttemptResult | null;
    isLessonCompleted: boolean;
    latestAttempt: LessonQuizAttemptSummary | null;
    onStart: () => void;
    quiz: LessonQuizData;
}

export const LessonQuizLauncher: React.FC<LessonQuizLauncherProps> = ({
    attemptResult,
    isLessonCompleted,
    latestAttempt,
    onStart,
    quiz,
}) => {
    const isFinalAttemptUsed = hasUsedFinalAttempt(quiz, attemptResult, latestAttempt);
    const latestPassed = latestAttempt ? isQuizAttemptPassed(quiz, latestAttempt) : null;

    return (
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none min-[380px]:p-5">
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
                        <p
                            className={cn(
                                'mt-1 text-xs font-semibold',
                                latestPassed ? 'text-success' : 'text-muted-foreground',
                            )}
                        >
                            Последняя попытка: {Math.round(latestAttempt.score_percent)}% · {latestPassed ? 'сдано' : 'не сдано'}
                        </p>
                    )}
                    {isLessonCompleted && (
                        <p className="mt-1 text-xs font-semibold text-success">Урок уже отмечен пройденным</p>
                    )}
                </div>
            </div>

            {attemptResult && <QuizResult result={attemptResult} quiz={quiz} />}

            <Button
                type="button"
                className="h-12 w-full rounded-lg text-sm font-semibold"
                disabled={isFinalAttemptUsed}
                onClick={onStart}
            >
                {getQuizStartLabel(quiz, attemptResult, latestAttempt)}
            </Button>
        </section>
    );
};
