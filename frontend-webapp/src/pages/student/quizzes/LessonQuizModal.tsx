import React from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../../../components/ui/dialog';
import { QuizQuestion } from './QuizQuestion';
import { QuizStepProgress } from './QuizStepProgress';
import { emptyAnswer, hasAnswer } from './quizAnswerHelpers';
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
}) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);

    React.useEffect(() => {
        if (isOpen) setCurrentQuestionIndex(0);
    }, [isOpen, quiz.id]);

    const currentQuestion = sortedQuestions[currentQuestionIndex];
    const currentAnswer = currentQuestion ? answers[currentQuestion.id] || emptyAnswer : emptyAnswer;
    const isCurrentAnswerComplete = currentQuestion
        ? hasAnswer(currentAnswer, currentQuestion.question_type)
        : false;
    const isLastQuestion = currentQuestionIndex === sortedQuestions.length - 1;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl gap-5">
                <DialogHeader>
                    <DialogTitle>Тест по уроку</DialogTitle>
                    <DialogDescription>
                        Отвечайте по одному вопросу. Проходной балл {quiz.passing_score_percent}%.
                    </DialogDescription>
                </DialogHeader>

                <QuizStepProgress
                    currentStep={currentQuestionIndex + 1}
                    totalSteps={sortedQuestions.length}
                />

                {currentQuestion && (
                    <QuizQuestion
                        key={currentQuestion.id}
                        answer={currentAnswer}
                        disabled={isSubmitting}
                        index={currentQuestionIndex}
                        onChange={(answer) => onAnswerChange(currentQuestion.id, answer)}
                        question={currentQuestion}
                    />
                )}

                {(validationError || submitError) && (
                    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{validationError || submitError}</span>
                    </div>
                )}

                <div className="grid grid-cols-[auto_1fr] gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        className="h-12 rounded-lg px-4 text-sm font-semibold"
                        disabled={currentQuestionIndex === 0 || isSubmitting}
                        onClick={() => setCurrentQuestionIndex((index) => Math.max(0, index - 1))}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Назад
                    </Button>
                    {isLastQuestion ? (
                        <Button
                            type="button"
                            className="h-12 rounded-lg text-sm font-semibold"
                            disabled={!canSubmit || isSubmitting}
                            onClick={onSubmit}
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Завершить тест'}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            className="h-12 rounded-lg text-sm font-semibold"
                            disabled={!isCurrentAnswerComplete || isSubmitting}
                            onClick={() => setCurrentQuestionIndex((index) => (
                                Math.min(sortedQuestions.length - 1, index + 1)
                            ))}
                        >
                            Следующий вопрос
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
