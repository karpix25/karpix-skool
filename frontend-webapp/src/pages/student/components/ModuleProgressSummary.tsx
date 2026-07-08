import React from 'react';
import { CheckCircle2, Lock } from 'lucide-react';

import { Progress } from '../../../components/ui/progress';
import { cn } from '../../../lib/utils';
import type { CourseModule } from '../../../types/course';
import { getModuleLessonProgressDisplay } from './lessonProgressDisplay';

interface ModuleProgressSummaryProps {
    module: CourseModule;
    className?: string;
}

export const ModuleProgressSummary: React.FC<ModuleProgressSummaryProps> = ({ module, className }) => {
    const progress = getModuleLessonProgressDisplay(module);
    const isComplete = progress.isComplete;

    return (
        <div
            className={cn(
                'space-y-2 px-1',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                        <h3 className="min-w-0 flex-1 break-words text-lg font-bold leading-tight text-foreground">
                            {module.title}
                        </h3>
                        {module.is_locked && <Lock size={15} className="shrink-0 text-amber-600" aria-label="Глава заблокирована" />}
                        {isComplete && <CheckCircle2 size={16} className="shrink-0 text-green-600" aria-label="Глава завершена" />}
                    </div>
                    <p className={cn('text-xs font-medium text-muted-foreground', isComplete && 'text-green-600')}>
                        {progress.counterLabel}
                    </p>
                </div>

                <span className={cn('shrink-0 text-sm font-semibold text-muted-foreground', isComplete && 'text-green-600')}>
                    {progress.progressPercent}%
                </span>
            </div>

            <Progress
                aria-label={`Прогресс главы ${module.title}`}
                value={progress.progressPercent}
                className="h-1.5 bg-muted/70"
                indicatorClassName={cn(isComplete && 'bg-green-500')}
            />
        </div>
    );
};
