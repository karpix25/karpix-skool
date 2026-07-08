import type { ComponentType } from 'react';
import { AlertCircle, CheckCircle2, Circle, Clock3 } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { cn } from '../../../lib/utils';
import {
    createPipelineTimelineSteps,
    getPipelineStatusLabel,
} from './status';
import type {
    CourseGenerationPipelinePhase,
    CourseGenerationPipelineRun,
    CourseGenerationPipelineStatus,
    CourseGenerationTimelineStep,
    CourseGenerationTimelineStepStatus,
} from './types';

interface CourseGenerationPipelineTimelineProps {
    run?: CourseGenerationPipelineRun | null;
    status?: CourseGenerationPipelineStatus;
    failedPhase?: CourseGenerationPipelinePhase;
    steps?: CourseGenerationTimelineStep[];
    className?: string;
}

const stepIcons: Record<CourseGenerationTimelineStepStatus, ComponentType<{ className?: string }>> = {
    pending: Circle,
    active: Clock3,
    completed: CheckCircle2,
    failed: AlertCircle,
    blocked: Circle,
};

const stepIconStyles: Record<CourseGenerationTimelineStepStatus, string> = {
    pending: 'border-border bg-muted text-muted-foreground',
    active: 'border-primary/30 bg-primary/10 text-primary',
    completed: 'border-success/30 bg-success/10 text-success',
    failed: 'border-destructive/30 bg-destructive/10 text-destructive',
    blocked: 'border-border bg-muted/50 text-muted-foreground',
};

export const CourseGenerationPipelineTimeline = ({
    run,
    status,
    failedPhase,
    steps,
    className,
}: CourseGenerationPipelineTimelineProps) => {
    const currentStatus = status || run?.status || 'idle';
    const timelineSteps = steps || run?.timeline || createPipelineTimelineSteps(currentStatus, failedPhase);

    return (
        <section className={cn('rounded-xl border border-border/80 bg-card p-4 sm:p-5', className)}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Пайплайн</h3>
                    <p className="text-xs font-medium text-muted-foreground">
                        {run?.title || 'Генерация курса'}
                    </p>
                </div>
                <Badge variant={currentStatus === 'failed' ? 'destructive' : 'outline'}>
                    {getPipelineStatusLabel(currentStatus)}
                </Badge>
            </div>

            <ol className="grid gap-3 md:grid-cols-6">
                {timelineSteps.map((step) => {
                    const Icon = stepIcons[step.status];
                    return (
                        <li
                            key={step.id}
                            className="min-w-0 rounded-lg border border-border/70 bg-muted/20 p-3"
                        >
                            <div className="mb-2 flex items-center gap-2">
                                <span className={cn(
                                    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                                    stepIconStyles[step.status]
                                )}>
                                    <Icon className="h-4 w-4" />
                                </span>
                                <p className="truncate text-sm font-semibold text-foreground">{step.title}</p>
                            </div>
                            <p className="text-xs font-medium leading-5 text-muted-foreground">
                                {step.description}
                            </p>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
};
