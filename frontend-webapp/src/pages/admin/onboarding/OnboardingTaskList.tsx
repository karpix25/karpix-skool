import React from 'react';
import { ArrowRight, CheckCircle2, LockKeyhole } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import type { OnboardingTask } from './types';

interface OnboardingTaskListProps {
    tasks: OnboardingTask[];
    onOpenTask: (task: OnboardingTask) => void;
}

const getStateLabel = (task: OnboardingTask) => {
    if (task.state === 'completed') return 'Готово';
    if (task.state === 'locked') return 'Сначала выполните предыдущий шаг';
    if (task.state === 'guidance') return 'Проверка перед запуском';
    return null;
};

export const OnboardingTaskList: React.FC<OnboardingTaskListProps> = ({ tasks, onOpenTask }) => (
    <div className="grid gap-3">
        {tasks.map((task) => {
            const isCompleted = task.state === 'completed';
            const isLocked = task.state === 'locked';
            const stateLabel = getStateLabel(task);

            return (
                <article
                    key={task.id}
                    className={cn(
                        'grid min-w-0 gap-4 rounded-xl border p-4 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:items-center',
                        isCompleted && 'border-success/20 bg-success/5',
                        isLocked && 'border-border bg-muted/20 text-muted-foreground',
                        !isCompleted && !isLocked && 'border-border bg-card',
                    )}
                >
                    <div
                        className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-lg',
                            isCompleted ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary',
                            isLocked && 'bg-muted text-muted-foreground',
                        )}
                        aria-hidden="true"
                    >
                        {isCompleted ? <CheckCircle2 size={22} /> : isLocked ? <LockKeyhole size={20} /> : <task.icon size={21} />}
                    </div>

                    <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <h3 className="min-w-0 text-sm font-semibold text-foreground">{task.title}</h3>
                            {task.state === 'guidance' && (
                                <span className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    Проверка
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{task.description}</p>
                        {stateLabel && (
                            <p className={cn('mt-1 text-[11px] font-medium', isCompleted ? 'text-success' : 'text-muted-foreground')}>
                                {stateLabel}
                            </p>
                        )}
                    </div>

                    {task.path && task.actionLabel && !isCompleted && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenTask(task)}
                            className="h-11 w-full whitespace-nowrap rounded-lg px-3 text-xs sm:w-auto"
                        >
                            {task.actionLabel}
                            <ArrowRight size={14} className="ml-1.5" />
                        </Button>
                    )}
                </article>
            );
        })}
    </div>
);
