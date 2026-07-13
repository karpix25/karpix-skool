import React from 'react';

interface QuizStepProgressProps {
    currentStep: number;
    totalSteps: number;
}

export const QuizStepProgress: React.FC<QuizStepProgressProps> = ({ currentStep, totalSteps }) => {
    const progressPercent = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
                <span>Вопрос {currentStep} из {totalSteps}</span>
                <span>{Math.round(progressPercent)}%</span>
            </div>
            <div
                role="progressbar"
                aria-label="Прогресс теста"
                aria-valuemin={0}
                aria-valuemax={totalSteps}
                aria-valuenow={currentStep}
                className="h-2 overflow-hidden rounded-full bg-muted"
            >
                <div
                    className="h-full rounded-full bg-primary transition-[width] duration-200"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
    );
};
