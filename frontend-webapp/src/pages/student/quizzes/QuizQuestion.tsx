import React from 'react';
import { Check, Circle } from 'lucide-react';

import { Textarea } from '../../../components/ui/textarea';
import { cn } from '../../../lib/utils';
import type { LessonQuizQuestion, QuizAnswerDraft } from './quizTypes';

interface QuizQuestionProps {
    answer: QuizAnswerDraft;
    disabled?: boolean;
    index: number;
    onChange: (answer: QuizAnswerDraft) => void;
    question: LessonQuizQuestion;
}

const getQuestionHint = (question: LessonQuizQuestion) => {
    if (question.question_type === 'multiple_choice') return 'Можно выбрать несколько вариантов';
    if (question.question_type === 'short_text') return 'Введите короткий ответ';
    return 'Выберите один вариант';
};

export const QuizQuestion: React.FC<QuizQuestionProps> = ({
    answer,
    disabled = false,
    index,
    onChange,
    question,
}) => {
    const sortedOptions = [...question.options].sort((first, second) => first.order_index - second.order_index);

    const toggleOption = (optionId: string) => {
        if (disabled) return;

        if (question.question_type === 'single_choice') {
            onChange({ ...answer, selectedOptionIds: [optionId] });
            return;
        }

        const isSelected = answer.selectedOptionIds.includes(optionId);
        onChange({
            ...answer,
            selectedOptionIds: isSelected
                ? answer.selectedOptionIds.filter((id) => id !== optionId)
                : [...answer.selectedOptionIds, optionId],
        });
    };

    return (
        <fieldset className="space-y-4 rounded-xl border border-border/80 bg-background p-4">
            <legend className="sr-only">{question.text}</legend>
            <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Вопрос {index + 1}
                </p>
                <h3 className="text-base font-semibold leading-snug text-foreground">{question.text}</h3>
                <p className="text-sm text-muted-foreground">{getQuestionHint(question)}</p>
            </div>

            {question.question_type === 'short_text' ? (
                <Textarea
                    disabled={disabled}
                    value={answer.textAnswer}
                    onChange={(event) => onChange({ ...answer, textAnswer: event.target.value })}
                    placeholder="Ваш ответ"
                    aria-label={`Ответ на вопрос ${index + 1}`}
                />
            ) : (
                <div className="space-y-2">
                    {sortedOptions.map((option) => {
                        const isSelected = answer.selectedOptionIds.includes(option.id);
                        const role = question.question_type === 'multiple_choice' ? 'checkbox' : 'radio';

                        return (
                            <button
                                key={option.id}
                                type="button"
                                role={role}
                                aria-checked={isSelected}
                                disabled={disabled}
                                onClick={() => toggleOption(option.id)}
                                className={cn(
                                    'flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm font-medium transition',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                                    isSelected
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border bg-card text-foreground hover:border-primary/50',
                                    disabled && 'cursor-not-allowed opacity-70',
                                )}
                            >
                                <span
                                    className={cn(
                                        'grid h-5 w-5 shrink-0 place-items-center rounded-full border',
                                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                                    )}
                                    aria-hidden="true"
                                >
                                    {isSelected ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2 opacity-0" />}
                                </span>
                                <span>{option.text}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </fieldset>
    );
};
