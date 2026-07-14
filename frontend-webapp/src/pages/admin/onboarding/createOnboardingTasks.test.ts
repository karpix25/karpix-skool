import { describe, expect, it } from 'vitest';

import { createOnboardingTasks } from './createOnboardingTasks';

describe('createOnboardingTasks', () => {
    it('keeps dependent steps locked before a course is published', () => {
        const tasks = createOnboardingTasks({
            hasTelegramGroup: false,
            coursesCount: 0,
            publishedCourseId: null,
            studentsCount: 0,
        });

        expect(tasks.find((task) => task.id === 'telegram_group')?.state).toBe('available');
        expect(tasks.find((task) => task.id === 'published_lesson')?.state).toBe('locked');
        expect(tasks.find((task) => task.id === 'student_preview')?.path).toBeUndefined();
        expect(tasks.find((task) => task.id === 'student')?.state).toBe('locked');
    });

    it('provides a real student preview route for a published course', () => {
        const tasks = createOnboardingTasks({
            hasTelegramGroup: true,
            coursesCount: 1,
            publishedCourseId: 'course-1',
            studentsCount: 0,
        });

        expect(tasks.find((task) => task.id === 'published_lesson')?.state).toBe('completed');
        expect(tasks.find((task) => task.id === 'student_preview')).toMatchObject({
            state: 'guidance',
            path: '/course/course-1',
            required: false,
        });
        expect(tasks.find((task) => task.id === 'student')).toMatchObject({
            state: 'available',
            path: '/courses',
        });
    });

    it('derives completion only from server-observable school state', () => {
        const tasks = createOnboardingTasks({
            hasTelegramGroup: true,
            coursesCount: 2,
            publishedCourseId: 'course-1',
            studentsCount: 1,
        });

        expect(tasks.filter((task) => task.required).every((task) => task.state === 'completed')).toBe(true);
    });
});
