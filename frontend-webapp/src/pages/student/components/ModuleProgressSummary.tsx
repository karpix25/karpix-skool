import React from 'react';
import { CheckCircle2, FolderOpen } from 'lucide-react';

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
    const StatusIcon = isComplete ? CheckCircle2 : FolderOpen;

    return (
        <div
            className={cn(
                'space-y-2 rounded-xl border border-border/70 bg-card/80 p-3',
                isComplete && 'border-green-500/25 bg-green-500/5',
                className,
            )}
        >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                <span
                    className={cn(
                        'inline-flex min-w-0 items-center gap-2 text-muted-foreground',
                        isComplete && 'text-green-600',
                    )}
                >
                    <span
                        className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary',
                            isComplete && 'bg-green-500/10 text-green-600',
                        )}
                        aria-hidden="true"
                    >
                        <StatusIcon size={14} />
                    </span>
                    <span>{isComplete ? 'Папка завершена' : 'Прогресс папки'}</span>
                </span>
                <span className={cn('text-right text-primary', isComplete && 'text-green-600')}>
                    {progress.counterLabel} · {progress.progressPercent}%
                </span>
            </div>

            <Progress
                aria-label={`Прогресс папки ${module.title}`}
                value={progress.progressPercent}
                className="h-2"
                indicatorClassName={cn(isComplete && 'bg-green-500')}
            />
        </div>
    );
};
