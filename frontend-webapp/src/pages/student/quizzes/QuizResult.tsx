import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

import { Progress } from '../../../components/ui/progress';
import { cn } from '../../../lib/utils';
import type { LessonQuizAttemptResult, LessonQuizData } from './quizTypes';

interface QuizResultProps {
    result: LessonQuizAttemptResult;
    quiz: LessonQuizData;
}

const isQuestionCorrect = (result: { is_correct?: boolean; correct?: boolean }) => (
    result.is_correct ?? result.correct ?? false
);

export const QuizResult: React.FC<QuizResultProps> = ({ result, quiz }) => {
    const questionById = new Map(quiz.questions.map((question) => [question.id, question]));
    const results = result.question_results || [];

    return (
        <section
            role="status"
            aria-live="polite"
            className={cn(
                'space-y-4 rounded-xl border p-4',
                result.passed ? 'border-success/25 bg-success/10' : 'border-destructive/25 bg-destructive/10',
            )}
        >
            <div className="flex items-start gap-3">
                {result.passed ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                )}
                <div className="min-w-0 flex-1 space-y-2">
                    <div>
                        <h3 className="text-base font-semibold">
                            {result.passed ? 'Тест сдан' : 'Нужно попробовать еще раз'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {result.correct_count} из {result.total_questions} правильных ответов
                        </p>
                    </div>
                    <div className="space-y-1.5">
                        <Progress value={result.score_percent} />
                        <p className="text-xs font-semibold text-muted-foreground">
                            Результат {Math.round(result.score_percent)}%, проходной балл {quiz.passing_score_percent}%
                        </p>
                    </div>
                </div>
            </div>

            {results.length > 0 && (
                <div className="space-y-2">
                    {results.map((questionResult) => {
                        const question = questionById.get(questionResult.question_id);
                        const correct = isQuestionCorrect(questionResult);

                        return (
                            <article
                                key={questionResult.question_id}
                                className="rounded-lg border border-border/70 bg-card px-3 py-2 text-sm"
                            >
                                <div className="flex items-start gap-2">
                                    {correct ? (
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                                    ) : (
                                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-medium text-foreground">
                                            {question?.text || 'Вопрос'}
                                        </p>
                                        {questionResult.explanation && (
                                            <p className="mt-1 text-muted-foreground">{questionResult.explanation}</p>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
};
