import React from 'react';
import { AlertCircle, CheckCircle, ChevronRight, Loader2 } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import type { LessonCompletionResponse } from '../../../types/course';
import { LessonCompletionCelebration } from './LessonCompletionCelebration';

interface LessonActionBarProps {
    className?: string;
    completionResult: LessonCompletionResponse | null;
    completeError: string | null;
    isCompleted: boolean;
    isCompleting: boolean;
    nextLessonId?: string | null;
    onComplete: () => void;
    onNext: () => void;
    position?: 'fixed' | 'static';
}

export const LessonActionBar: React.FC<LessonActionBarProps> = ({
    className,
    completionResult,
    completeError,
    isCompleted,
    isCompleting,
    nextLessonId,
    onComplete,
    onNext,
    position = 'fixed',
}) => (
    <div
        className={cn(
            'max-h-[45dvh] overflow-y-auto border-t bg-card/95 px-3 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] backdrop-blur',
            position === 'fixed' && 'fixed bottom-0 left-0 right-0 z-50',
            className,
        )}
    >
        <div className="max-w-3xl mx-auto space-y-3">
            {completionResult && (
                <LessonCompletionCelebration result={completionResult} />
            )}

            {completeError && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{completeError}</span>
                </div>
            )}

            <div className="flex flex-col gap-3 min-[380px]:flex-row min-[380px]:gap-4">
                <Button
                    size="lg"
                    className="h-12 flex-1 rounded-lg text-sm font-semibold whitespace-nowrap"
                    disabled={isCompleted || isCompleting}
                    onClick={onComplete}
                    variant={isCompleted ? 'secondary' : 'default'}
                >
                    {isCompleting ? <Loader2 className="animate-spin h-4 w-4" /> :
                        isCompleted ? (
                            <div className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-success" />
                                <span>Урок пройден</span>
                            </div>
                        ) : 'Завершить урок'}
                </Button>

                {nextLessonId && (
                    <Button
                        size="lg"
                        variant="outline"
                        className="h-12 flex-1 rounded-lg text-sm font-semibold whitespace-nowrap"
                        onClick={onNext}
                    >
                        Следующий урок <ChevronRight size={14} className="ml-2" />
                    </Button>
                )}
            </div>
        </div>
    </div>
);
