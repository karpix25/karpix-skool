import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../../../components/ui/dialog';
import { QuizQuestion } from './QuizQuestion';
import { emptyAnswer } from './quizAnswerHelpers';
import type {
    LessonQuizData,
    QuizAnswerDraft,
    QuizAnswerDrafts,
} from './quizTypes';

interface LessonQuizModalProps {
    answers: QuizAnswerDrafts;
    canSubmit: boolean;
    isOpen: boolean;
    isSubmitting: boolean;
    onAnswerChange: (questionId: string, answer: QuizAnswerDraft) => void;
    onOpenChange: (open: boolean) => void;
    onSubmit: () => void;
    quiz: LessonQuizData;
    sortedQuestions: LessonQuizData['questions'];
    submitError: string | null;
    validationError: string | null;
}

export const LessonQuizModal: React.FC<LessonQuizModalProps> = ({
    answers,
    canSubmit,
    isOpen,
    isSubmitting,
    onAnswerChange,
    onOpenChange,
    onSubmit,
    quiz,
    sortedQuestions,
    submitError,
    validationError,
}) => (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl gap-5">
            <DialogHeader>
                <DialogTitle>Тест по уроку</DialogTitle>
                <DialogDescription>
                    Ответьте на вопросы и завершите тест. Проходной балл {quiz.passing_score_percent}%.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
                {sortedQuestions.map((question, index) => (
                    <QuizQuestion
                        key={question.id}
                        answer={answers[question.id] || emptyAnswer}
                        disabled={isSubmitting}
                        index={index}
                        onChange={(answer) => onAnswerChange(question.id, answer)}
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
                disabled={!canSubmit || isSubmitting}
                onClick={onSubmit}
            >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Завершить тест'}
            </Button>
        </DialogContent>
    </Dialog>
);
