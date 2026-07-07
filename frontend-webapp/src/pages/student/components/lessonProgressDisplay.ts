import type { CourseModule, LessonCountProgress } from '../../../types/course';

export interface LessonProgressDisplay {
    totalLessons: number;
    completedLessons: number;
    progressPercent: number;
    isComplete: boolean;
    counterLabel: string;
}

const readSafeNumber = (value: number | null | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeCount = (value: number | null | undefined): number => (
    Math.max(0, Math.round(readSafeNumber(value, 0)))
);

export const clampLessonProgressPercent = (value: number | null | undefined): number => {
    const parsed = readSafeNumber(value, 0);
    return Math.min(100, Math.max(0, Math.round(parsed)));
};

const getLessonWord = (count: number): string => {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) return 'урок';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'урока';

    return 'уроков';
};

export const formatLessonCounter = (completedLessons: number, totalLessons: number): string => (
    totalLessons > 0 ? `${completedLessons}/${totalLessons} ${getLessonWord(totalLessons)}` : '0 уроков'
);

export const getLessonProgressDisplay = (progress: Partial<LessonCountProgress>): LessonProgressDisplay => {
    const totalLessons = normalizeCount(progress.total_lessons);
    const completedLessons = Math.min(totalLessons, normalizeCount(progress.completed_lessons));
    const derivedPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    const progressPercent = totalLessons > 0
        ? clampLessonProgressPercent(progress.progress_percent ?? derivedPercent)
        : 0;

    return {
        totalLessons,
        completedLessons,
        progressPercent,
        isComplete: totalLessons > 0 && (completedLessons >= totalLessons || progressPercent >= 100),
        counterLabel: formatLessonCounter(completedLessons, totalLessons),
    };
};

export const getModuleLessonProgressDisplay = (module: CourseModule): LessonProgressDisplay => {
    const totalLessons = module.total_lessons ?? module.lessons.length;
    const completedLessons = module.completed_lessons
        ?? module.lessons.filter((lesson) => lesson.is_completed).length;

    return getLessonProgressDisplay({
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        progress_percent: module.progress_percent,
    });
};
