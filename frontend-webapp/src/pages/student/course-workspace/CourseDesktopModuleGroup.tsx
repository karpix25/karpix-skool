import { CheckCircle2, ChevronRight, Gem, Lock } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Progress } from '../../../components/ui/progress';
import { cn } from '../../../lib/utils';
import type { CourseModule } from '../../../types/course';
import { CourseLessonStatusIcon } from '../components/CourseLessonStatusIcon';
import { getSidebarModuleState, type CourseSidebarLessonState } from './courseSidebarState';

interface CourseDesktopModuleGroupProps {
    activeLessonId: string | null;
    activeModuleId: string | null;
    module: CourseModule;
    onOpenVipAccess?: () => void;
    onSelectLesson: (lessonId: string) => void;
}

interface CourseDesktopLessonItemProps {
    item: CourseSidebarLessonState;
    onSelectLesson: (lessonId: string) => void;
}

const CourseDesktopLessonItem = ({ item, onSelectLesson }: CourseDesktopLessonItemProps) => {
    const { isActive, isLocked, lesson, lockReason } = item;

    return (
        <button
            type="button"
            disabled={isLocked}
            aria-current={isActive ? 'page' : undefined}
            aria-label={
                isLocked
                    ? `${lesson.title}. ${lockReason || 'Урок заблокирован'}`
                    : `Открыть урок ${lesson.title}`
            }
            className={cn(
                'relative w-full overflow-hidden rounded-xl border bg-background text-left transition-[background-color,border-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive ? 'border-primary/45 bg-primary/10 shadow-sm' : 'border-border/70',
                isLocked ? 'cursor-not-allowed opacity-70' : 'hover:bg-muted/35 active:scale-[0.99]',
            )}
            onClick={() => onSelectLesson(lesson.id)}
        >
            {isActive && (
                <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" aria-hidden="true" />
            )}
            <span className="flex min-h-14 items-center gap-3 py-2 pl-3 pr-2">
                <CourseLessonStatusIcon lesson={lesson} isLocked={isLocked} />
                <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 break-words text-sm font-semibold leading-5 text-foreground">
                        {lesson.title}
                    </span>
                    {isActive && !isLocked && (
                        <span className="mt-1 inline-flex rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary">
                            Сейчас открыт
                        </span>
                    )}
                    {isLocked && lockReason && (
                        <span className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">
                            {lockReason}
                        </span>
                    )}
                </span>
                {!isLocked && (
                    <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground/50', isActive && 'text-primary')} />
                )}
            </span>
        </button>
    );
};

export const CourseDesktopModuleGroup = ({
    activeLessonId,
    activeModuleId,
    module,
    onOpenVipAccess,
    onSelectLesson,
}: CourseDesktopModuleGroupProps) => {
    const state = getSidebarModuleState(module, activeLessonId, activeModuleId);
    const shouldShowProgress = !state.isEmpty;

    return (
        <section
            className={cn(
                'scroll-mt-24 rounded-xl border border-border/70 bg-card p-3 transition-colors duration-150',
                state.isActive && 'border-primary/25 bg-primary/5',
            )}
        >
            <div className="space-y-2">
                <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                        <h3 className="min-w-0 flex-1 break-words text-base font-semibold leading-tight text-foreground">
                            {module.title}
                        </h3>
                        {state.isLocked && <Lock className="h-3.5 w-3.5 shrink-0 text-vip" aria-label="Глава заблокирована" />}
                        {state.isComplete && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-label="Глава завершена" />}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
                        <span>{state.progress.counterLabel}</span>
                        {shouldShowProgress && <span aria-hidden="true">·</span>}
                        {shouldShowProgress && (
                            <span className={cn(state.isComplete && 'text-green-600')}>
                                {state.progress.progressPercent}%
                            </span>
                        )}
                        {state.lockLabel && (
                            <span
                                className={cn(
                                    'inline-flex h-5 items-center rounded-md border px-1.5 text-[11px] font-semibold',
                                    state.isVipLocked
                                        ? 'border-vip/25 bg-vip/10 text-vip'
                                        : 'border-border bg-muted text-muted-foreground',
                                )}
                            >
                                {state.lockLabel}
                            </span>
                        )}
                    </div>
                </div>

                {shouldShowProgress && (
                    <Progress
                        aria-label={`Прогресс главы ${module.title}`}
                        value={state.progress.progressPercent}
                        className="h-1.5 bg-muted/70"
                        indicatorClassName={cn(state.isComplete && 'bg-green-500')}
                    />
                )}
            </div>

            {state.isEmpty ? (
                <p className="mt-3 rounded-lg bg-muted/25 px-3 py-2 text-xs font-medium leading-5 text-muted-foreground">
                    Нет опубликованных уроков.
                </p>
            ) : (
                <div className="mt-3 grid gap-2">
                    {state.lessons.map((item) => (
                        <CourseDesktopLessonItem
                            key={item.lesson.id}
                            item={item}
                            onSelectLesson={onSelectLesson}
                        />
                    ))}
                </div>
            )}

            {state.isLocked && state.lockReason && (
                <div
                    className={cn(
                        'mt-3 rounded-lg border p-3',
                        state.isVipLocked ? 'border-vip/25 bg-vip/10' : 'border-border/70 bg-muted/25',
                    )}
                >
                    <div className="flex items-center gap-3">
                        <Lock className={cn('h-4 w-4 shrink-0', state.isVipLocked ? 'text-vip' : 'text-muted-foreground')} />
                        <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-xs font-semibold leading-5 text-foreground">{state.lockReason}</p>
                            {state.isVipLocked && onOpenVipAccess && (
                                <Button
                                    type="button"
                                    onClick={onOpenVipAccess}
                                    variant="outline"
                                    className="mt-2 h-9 rounded-lg border-vip/30 bg-card px-3 text-xs font-semibold text-vip hover:bg-vip/10"
                                >
                                    <Gem className="h-3.5 w-3.5" />
                                    Получить доступ
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
