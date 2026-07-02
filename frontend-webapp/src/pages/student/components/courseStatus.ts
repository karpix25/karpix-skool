import type { StudentCourse } from '../../../types/course';

export type CourseAccessState = 'open' | 'vip' | 'locked';

export const getCourseProgress = (course: StudentCourse): number => {
    const progress = Number(course.progress_percent || 0);
    if (!Number.isFinite(progress)) return 0;
    return Math.min(100, Math.max(0, Math.round(progress)));
};

export const isCourseLocked = (course: StudentCourse): boolean => course.is_unlocked === false;

export const getCourseAccessState = (course: StudentCourse): CourseAccessState => {
    if (isCourseLocked(course)) return 'locked';
    return course.is_vip ? 'vip' : 'open';
};

export const getCourseAccessLabel = (course: StudentCourse): string => {
    const access = getCourseAccessState(course);
    if (access === 'locked') return 'Заблокирован';
    if (access === 'vip') return 'VIP';
    return 'Открыт';
};

export const getCourseActionLabel = (course: StudentCourse): string => {
    const progress = getCourseProgress(course);
    if (progress >= 100) return 'Повторить';
    if (progress > 0) return 'Продолжить';
    return 'Начать';
};
