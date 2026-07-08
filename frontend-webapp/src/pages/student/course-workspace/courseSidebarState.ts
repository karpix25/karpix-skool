import type { CourseLessonSummary, CourseModule } from '../../../types/course';
import type { LessonProgressDisplay } from '../components/lessonProgressDisplay';
import { getModuleLessonProgressDisplay } from '../components/lessonProgressDisplay';

export interface CourseSidebarLessonState {
    isActive: boolean;
    isCompleted: boolean;
    isLocked: boolean;
    lesson: CourseLessonSummary;
    lockReason: string | null;
}

export interface CourseSidebarModuleState {
    isActive: boolean;
    isComplete: boolean;
    isEmpty: boolean;
    isLocked: boolean;
    isVipLocked: boolean;
    lessons: CourseSidebarLessonState[];
    lockLabel: string | null;
    lockReason: string | null;
    module: CourseModule;
    progress: LessonProgressDisplay;
}

export const isVipLockReason = (lockReason: string | null | undefined): boolean => (
    Boolean(lockReason?.toLowerCase().includes('vip'))
);

export const getModuleLockLabel = (module: CourseModule): string | null => {
    if (!module.is_locked) return null;
    return isVipLockReason(module.lock_reason) ? 'VIP' : 'Закрыто';
};

export const getSidebarModuleState = (
    module: CourseModule,
    activeLessonId: string | null,
    activeModuleId: string | null,
): CourseSidebarModuleState => {
    const progress = getModuleLessonProgressDisplay(module);
    const lockLabel = getModuleLockLabel(module);
    const lockReason = module.lock_reason || null;

    return {
        isActive: activeModuleId === module.id,
        isComplete: progress.isComplete,
        isEmpty: module.lessons.length === 0,
        isLocked: Boolean(module.is_locked),
        isVipLocked: lockLabel === 'VIP',
        lessons: module.lessons.map((lesson) => {
            const isLocked = Boolean(module.is_locked || lesson.is_locked);

            return {
                isActive: activeLessonId === lesson.id,
                isCompleted: Boolean(lesson.is_completed),
                isLocked,
                lesson,
                lockReason: lesson.lock_reason || lockReason,
            };
        }),
        lockLabel,
        lockReason,
        module,
        progress,
    };
};
