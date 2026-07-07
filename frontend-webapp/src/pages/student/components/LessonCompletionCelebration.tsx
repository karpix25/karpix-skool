import React from 'react';
import { CheckCircle2, Sparkles, Trophy } from 'lucide-react';

import { Progress } from '../../../components/ui/progress';
import { cn } from '../../../lib/utils';
import type { LessonCompletionResponse, LessonCountProgress } from '../../../types/course';
import { getLessonProgressDisplay } from './lessonProgressDisplay';

interface LessonCompletionCelebrationProps {
    result: LessonCompletionResponse;
    className?: string;
}

interface CompletionProgressRowProps {
    label: string;
    progress: LessonCountProgress;
}

const CompletionProgressRow: React.FC<CompletionProgressRowProps> = ({ label, progress }) => {
    const display = getLessonProgressDisplay(progress);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-muted-foreground">
                <span className="truncate">{label}</span>
                <span className={cn(display.isComplete ? 'text-green-600' : 'text-primary')}>
                    {display.counterLabel} · {display.progressPercent}%
                </span>
            </div>
            <Progress
                aria-label={`Прогресс: ${label}`}
                value={display.progressPercent}
                className="h-2 bg-background/70"
                indicatorClassName={cn(display.isComplete && 'bg-green-500')}
            />
        </div>
    );
};

export const LessonCompletionCelebration: React.FC<LessonCompletionCelebrationProps> = ({ result, className }) => (
    <aside
        role="status"
        aria-live="polite"
        className={cn(
            'relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm',
            'animate-in fade-in slide-in-from-bottom-3 zoom-in-95 duration-500 motion-reduce:animate-none',
            className,
        )}
    >
        <span
            className="pointer-events-none absolute right-5 top-5 h-9 w-9 rounded-full bg-primary/15 animate-in fade-in zoom-in duration-700 motion-reduce:animate-none"
            aria-hidden="true"
        />

        <div className="relative space-y-4">
            <div className="flex items-start gap-3">
                <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-600"
                    aria-hidden="true"
                >
                    <CheckCircle2 size={22} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">Урок засчитан</p>
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
                            <Sparkles size={12} />
                            +{result.xp_granted} XP
                        </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Сейчас у вас {result.new_xp.toLocaleString('ru-RU')} XP · уровень {result.new_level}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <CompletionProgressRow label={result.module_progress.title} progress={result.module_progress} />
                <CompletionProgressRow label="Весь курс" progress={result.course_progress} />
            </div>

            {getLessonProgressDisplay(result.module_progress).isComplete && (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-700">
                    <Trophy size={14} />
                    Папка завершена
                </div>
            )}
        </div>
    </aside>
);
