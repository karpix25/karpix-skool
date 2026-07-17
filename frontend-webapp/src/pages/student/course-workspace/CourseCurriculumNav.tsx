import React from 'react';
import { ChevronRight, Gem, Lock } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import type { CourseModule } from '../../../types/course';
import { CourseLessonStatusIcon } from '../components/CourseLessonStatusIcon';
import { ModuleProgressSummary } from '../components/ModuleProgressSummary';

interface CourseCurriculumNavProps {
    modules: CourseModule[];
    activeLessonId: string | null;
    activeModuleId: string | null;
    onSelectLesson: (lessonId: string) => void;
    onOpenVipAccess?: () => void;
    className?: string;
}

export const CourseCurriculumNav: React.FC<CourseCurriculumNavProps> = ({
    modules,
    activeLessonId,
    activeModuleId,
    onSelectLesson,
    onOpenVipAccess,
    className,
}) => (
    <nav className={cn('space-y-5', className)} aria-label="Содержание курса">
        {modules.map((module) => {
            const moduleIsActive = activeModuleId === module.id;

            return (
                <section
                    key={module.id}
                    className={cn(
                        'scroll-mt-24 space-y-3 rounded-xl border border-transparent p-1 transition-colors duration-150',
                        moduleIsActive && 'border-primary/20 bg-primary/5',
                    )}
                >
                    <ModuleProgressSummary module={module} className="px-1" />

                    {module.lessons.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                            В этой главе пока нет опубликованных уроков.
                        </p>
                    ) : (
                        <div className="grid gap-2">
                            {module.lessons.map((lesson) => {
                                const isLessonLocked = Boolean(module.is_locked || lesson.is_locked);
                                const isActive = activeLessonId === lesson.id;
                                const lockReason = lesson.lock_reason || module.lock_reason;

                                return (
                                    <button
                                        key={lesson.id}
                                        type="button"
                                        disabled={isLessonLocked}
                                        aria-current={isActive ? 'page' : undefined}
                                        aria-label={
                                            isLessonLocked
                                                ? `${lesson.title}. ${lockReason || 'Урок заблокирован'}`
                                                : `Открыть урок ${lesson.title}`
                                        }
                                        className={cn(
                                            'w-full rounded-xl border bg-card text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                            isActive
                                                ? 'border-primary/35 bg-primary/10 shadow-sm dark:shadow-none'
                                                : 'border-border/70',
                                            isLessonLocked
                                                ? 'cursor-not-allowed opacity-70'
                                                : 'hover:bg-muted/35 active:scale-[0.99]',
                                        )}
                                        onClick={() => onSelectLesson(lesson.id)}
                                    >
                                        <span className="flex min-h-16 items-center gap-3 p-3">
                                            <CourseLessonStatusIcon lesson={lesson} isLocked={isLessonLocked} />
                                            <span className="min-w-0 flex-1">
                                                <span className="line-clamp-2 break-words text-sm font-semibold leading-5 text-foreground">
                                                    {lesson.title}
                                                </span>
                                                {isLessonLocked && lockReason && (
                                                    <span className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">
                                                        {lockReason}
                                                    </span>
                                                )}
                                            </span>
                                            {!isLessonLocked && (
                                                <ChevronRight
                                                    size={16}
                                                    className={cn('shrink-0 text-muted-foreground/50', isActive && 'text-primary')}
                                                />
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {module.is_locked && module.lock_reason && (
                        <div className="rounded-xl border border-vip/25 bg-vip/10 p-3">
                            <div className="flex items-start gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-vip/15 text-vip">
                                    <Lock size={14} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold leading-5 text-foreground">{module.lock_reason}</p>
                                    {module.lock_reason.includes('VIP') && onOpenVipAccess && (
                                        <Button
                                            type="button"
                                            onClick={onOpenVipAccess}
                                            className="mt-3 h-10 w-full rounded-lg bg-vip text-skool-navy hover:bg-vip/90"
                                        >
                                            <Gem size={16} />
                                            Стать VIP участником
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            );
        })}
    </nav>
);
