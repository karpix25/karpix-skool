import { describe, expect, it } from 'vitest';

import type { CourseDetailData, CourseLessonSummary, CourseModule } from '../../../types/course';
import {
    findActiveModuleId,
    flattenCourseLessons,
    getAdjacentLessonIds,
    resolveActiveLessonId,
} from './courseNavigation';

const lesson = (
    id: string,
    overrides: Partial<CourseLessonSummary> = {},
): CourseLessonSummary => ({
    id,
    title: `Lesson ${id}`,
    ...overrides,
});

const module = (
    id: string,
    lessons: CourseLessonSummary[],
    overrides: Partial<CourseModule> = {},
): CourseModule => ({
    id,
    title: `Module ${id}`,
    lessons,
    ...overrides,
});

const courseData = (modules: CourseModule[]): CourseDetailData => ({
    course: {
        id: 'course-1',
        title: 'Course',
    },
    progress_percent: 0,
    modules,
});

describe('course workspace navigation helpers', () => {
    it('uses a valid available lesson query as the active lesson', () => {
        const data = courseData([
            module('module-1', [lesson('lesson-1'), lesson('lesson-2')]),
        ]);

        expect(resolveActiveLessonId({ data, lessonIdFromQuery: 'lesson-2' })).toBe('lesson-2');
    });

    it('ignores a locked lesson query and falls back to the first available uncompleted lesson', () => {
        const data = courseData([
            module('module-1', [
                lesson('lesson-1', { is_locked: true }),
                lesson('lesson-2', { is_completed: true }),
                lesson('lesson-3'),
            ]),
        ]);

        expect(resolveActiveLessonId({ data, lessonIdFromQuery: 'lesson-1' })).toBe('lesson-3');
    });

    it('uses moduleId to select the first available uncompleted lesson in that module', () => {
        const data = courseData([
            module('module-1', [lesson('lesson-1')]),
            module('module-2', [
                lesson('lesson-2', { is_completed: true }),
                lesson('lesson-3'),
                lesson('lesson-4'),
            ]),
        ]);

        expect(resolveActiveLessonId({ data, moduleIdFromQuery: 'module-2' })).toBe('lesson-3');
    });

    it('falls back to the first available lesson when every available lesson is completed', () => {
        const data = courseData([
            module('module-1', [
                lesson('lesson-1', { is_locked: true }),
                lesson('lesson-2', { is_completed: true }),
            ]),
            module('module-2', [lesson('lesson-3', { is_completed: true })]),
        ]);

        expect(resolveActiveLessonId({ data })).toBe('lesson-2');
    });

    it('returns null for empty or missing lesson structures', () => {
        expect(resolveActiveLessonId({ data: null })).toBeNull();
        expect(resolveActiveLessonId({ data: courseData([]) })).toBeNull();
        expect(resolveActiveLessonId({ data: courseData([module('module-1', [])]) })).toBeNull();
    });

    it('marks lessons locked when either the module or lesson is locked', () => {
        const flatLessons = flattenCourseLessons(courseData([
            module('module-1', [lesson('lesson-1')], { is_locked: true }),
            module('module-2', [lesson('lesson-2', { is_locked: true })]),
            module('module-3', [lesson('lesson-3')]),
        ]));

        expect(flatLessons.map((flatLesson) => [flatLesson.lessonId, flatLesson.locked])).toEqual([
            ['lesson-1', true],
            ['lesson-2', true],
            ['lesson-3', false],
        ]);
    });

    it('finds the active module id for a flattened active lesson', () => {
        const flatLessons = flattenCourseLessons(courseData([
            module('module-1', [lesson('lesson-1')]),
            module('module-2', [lesson('lesson-2')]),
        ]));

        expect(findActiveModuleId(flatLessons, 'lesson-2')).toBe('module-2');
        expect(findActiveModuleId(flatLessons, 'missing-lesson')).toBeNull();
    });

    it('returns adjacent lesson ids while skipping locked lessons', () => {
        const flatLessons = flattenCourseLessons(courseData([
            module('module-1', [
                lesson('lesson-1'),
                lesson('lesson-2', { is_locked: true }),
                lesson('lesson-3'),
                lesson('lesson-4', { is_locked: true }),
                lesson('lesson-5'),
            ]),
        ]));

        expect(getAdjacentLessonIds(flatLessons, 'lesson-3')).toEqual({
            previousLessonId: 'lesson-1',
            nextLessonId: 'lesson-5',
        });
    });
});
