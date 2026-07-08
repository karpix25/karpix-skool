import type { CourseDetailData, CourseLessonSummary, CourseModule } from '../../../types/course';

export interface FlatCourseLesson {
    lesson: CourseLessonSummary;
    module: CourseModule;
    lessonId: string;
    moduleId: string;
    moduleTitle: string;
    moduleIndex: number;
    lessonIndex: number;
    locked: boolean;
    completed: boolean;
    lockReason: string | null;
}

export interface ResolveActiveLessonIdOptions {
    data: CourseDetailData | CourseModule[] | null | undefined;
    lessonIdFromQuery?: string | null;
    moduleIdFromQuery?: string | null;
}

export interface AdjacentLessonIds {
    previousLessonId: string | null;
    nextLessonId: string | null;
}

type CourseLessonSource = CourseDetailData | CourseModule[] | null | undefined;

const getCourseModules = (source: CourseLessonSource): CourseModule[] => {
    if (!source) return [];
    return Array.isArray(source) ? source : source.modules;
};

const normalizeQueryId = (id: string | null | undefined): string | null => {
    const normalized = id?.trim();
    return normalized ? normalized : null;
};

const findFirstAvailable = (lessons: FlatCourseLesson[]): FlatCourseLesson | undefined => {
    return lessons.find((lesson) => !lesson.locked);
};

const findFirstUncompletedAvailable = (lessons: FlatCourseLesson[]): FlatCourseLesson | undefined => {
    return lessons.find((lesson) => !lesson.locked && !lesson.completed);
};

export const flattenCourseLessons = (source: CourseLessonSource): FlatCourseLesson[] => {
    return getCourseModules(source).flatMap((module, moduleIndex) =>
        module.lessons.map((lesson, lessonIndex) => {
            const locked = Boolean(module.is_locked || lesson.is_locked);

            return {
                lesson,
                module,
                lessonId: lesson.id,
                moduleId: module.id,
                moduleTitle: module.title,
                moduleIndex,
                lessonIndex,
                locked,
                completed: Boolean(lesson.is_completed),
                lockReason: lesson.lock_reason || module.lock_reason || null,
            };
        }),
    );
};

export const resolveActiveLessonId = ({
    data,
    lessonIdFromQuery,
    moduleIdFromQuery,
}: ResolveActiveLessonIdOptions): string | null => {
    const flatLessons = flattenCourseLessons(data);
    const requestedLessonId = normalizeQueryId(lessonIdFromQuery);
    const requestedModuleId = normalizeQueryId(moduleIdFromQuery);

    if (requestedLessonId) {
        const requestedLesson = flatLessons.find(
            (lesson) => lesson.lessonId === requestedLessonId && !lesson.locked,
        );
        if (requestedLesson) return requestedLesson.lessonId;
    }

    if (requestedModuleId) {
        const moduleLessons = flatLessons.filter((lesson) => lesson.moduleId === requestedModuleId);
        const firstUncompletedInModule = findFirstUncompletedAvailable(moduleLessons);
        if (firstUncompletedInModule) return firstUncompletedInModule.lessonId;

        const firstAvailableInModule = findFirstAvailable(moduleLessons);
        if (firstAvailableInModule) return firstAvailableInModule.lessonId;
    }

    const firstUncompletedInCourse = findFirstUncompletedAvailable(flatLessons);
    if (firstUncompletedInCourse) return firstUncompletedInCourse.lessonId;

    return findFirstAvailable(flatLessons)?.lessonId ?? null;
};

export const getAdjacentLessonIds = (
    flatLessons: FlatCourseLesson[],
    activeLessonId: string | null | undefined,
): AdjacentLessonIds => {
    const normalizedActiveLessonId = normalizeQueryId(activeLessonId);
    const activeIndex = normalizedActiveLessonId
        ? flatLessons.findIndex((lesson) => lesson.lessonId === normalizedActiveLessonId)
        : -1;

    if (activeIndex === -1) {
        return { previousLessonId: null, nextLessonId: null };
    }

    const previousLesson = flatLessons
        .slice(0, activeIndex)
        .reverse()
        .find((lesson) => !lesson.locked);
    const nextLesson = flatLessons.slice(activeIndex + 1).find((lesson) => !lesson.locked);

    return {
        previousLessonId: previousLesson?.lessonId ?? null,
        nextLessonId: nextLesson?.lessonId ?? null,
    };
};

export const findActiveModuleId = (
    flatLessons: FlatCourseLesson[],
    activeLessonId: string | null | undefined,
): string | null => {
    const normalizedActiveLessonId = normalizeQueryId(activeLessonId);
    if (!normalizedActiveLessonId) return null;

    return flatLessons.find((lesson) => lesson.lessonId === normalizedActiveLessonId)?.moduleId ?? null;
};
