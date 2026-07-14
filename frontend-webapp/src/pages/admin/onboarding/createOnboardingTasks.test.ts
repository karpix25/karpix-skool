import { describe, expect, it } from 'vitest';

import { createOnboardingTasks } from './createOnboardingTasks';

describe('createOnboardingTasks', () => {
    it('keeps dependent steps locked before a course is published', () => {
        const tasks = createOnboardingTasks({
            hasSchoolProfile: false,
            hasServingSubscription: false,
            hasTelegramGroup: false,
            coursesCount: 0,
            publishedCourseId: null,
            studentsCount: 0,
            hasStudentPreview: false,
            isCompleted: false,
        });

        expect(tasks.find((task) => task.id === 'telegram_group')?.state).toBe('available');
        expect(tasks.find((task) => task.id === 'published_lesson')?.state).toBe('locked');
        expect(tasks.find((task) => task.id === 'student_preview')?.path).toBeUndefined();
        expect(tasks.find((task) => task.id === 'student')?.state).toBe('locked');
    });

    it('provides a real student preview route for a published course', () => {
        const tasks = createOnboardingTasks({
            hasSchoolProfile: true,
            hasServingSubscription: true,
            hasTelegramGroup: true,
            coursesCount: 1,
            publishedCourseId: 'course-1',
            studentsCount: 0,
            hasStudentPreview: false,
            isCompleted: false,
        });

        expect(tasks.find((task) => task.id === 'published_lesson')?.state).toBe('completed');
        expect(tasks.find((task) => task.id === 'student_preview')).toMatchObject({
            state: 'guidance',
            path: '/course/course-1',
            required: true,
        });
        expect(tasks.find((task) => task.id === 'student')).toMatchObject({
            state: 'available',
            path: '/courses',
        });
    });

    it('derives completion only from server-observable school state', () => {
        const tasks = createOnboardingTasks({
            hasSchoolProfile: true,
            hasServingSubscription: true,
            hasTelegramGroup: true,
            coursesCount: 2,
            publishedCourseId: 'course-1',
            studentsCount: 1,
            hasStudentPreview: true,
            isCompleted: false,
        });

        expect(tasks.filter((task) => task.required).every((task) => task.state === 'completed')).toBe(true);
    });

    it('does not allow completion until the student preview is confirmed by the server', () => {
        const tasks = createOnboardingTasks({
            hasSchoolProfile: true,
            hasServingSubscription: true,
            hasTelegramGroup: true,
            coursesCount: 1,
            publishedCourseId: 'course-1',
            studentsCount: 1,
            hasStudentPreview: false,
            isCompleted: false,
        });

        expect(tasks.find((task) => task.id === 'student_preview')).toMatchObject({
            state: 'guidance',
            required: true,
        });
        expect(tasks.filter((task) => task.required).every((task) => task.state === 'completed')).toBe(false);
    });

    it('requires both a server-ready profile and a serving subscription', () => {
        const tasks = createOnboardingTasks({
            hasSchoolProfile: false,
            hasServingSubscription: false,
            hasTelegramGroup: true,
            coursesCount: 1,
            publishedCourseId: 'course-1',
            studentsCount: 1,
            hasStudentPreview: true,
            isCompleted: false,
        });

        expect(tasks.find((task) => task.id === 'school_profile')).toMatchObject({ state: 'available', required: true, path: '/settings' });
        expect(tasks.find((task) => task.id === 'subscription')).toMatchObject({ state: 'available', required: true, path: '/settings' });
        expect(tasks.filter((task) => task.required).every((task) => task.state === 'completed')).toBe(false);
    });
});
