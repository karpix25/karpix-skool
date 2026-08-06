import { describe, expect, it } from 'vitest';

import type { StudentCourse } from '../../../types/course';
import { defaultCatalogFilters, filterStudentCourses, groupCoursesByCategory } from './catalogFilters';

const courses: StudentCourse[] = [
    { id: '1', title: 'ChatGPT для работы', category: 'AI', tags: ['ChatGPT'], content_type: 'guide', is_unlocked: true, progress_percent: 20, created_at: '2026-02-01' },
    { id: '2', title: 'Claude prompt', category: 'AI', tags: ['Claude'], content_type: 'prompt', is_unlocked: false, progress_percent: 0, created_at: '2026-03-01' },
    { id: '3', title: 'Основы', category: 'База', tags: [], content_type: 'course', is_unlocked: true, progress_percent: 100, created_at: '2026-01-01' },
];

describe('catalog filters', () => {
    it('combines search, type, tag, and access filters', () => {
        const result = filterStudentCourses(courses, {
            ...defaultCatalogFilters,
            query: 'chat',
            contentType: 'guide',
            tag: 'ChatGPT',
            access: 'in-progress',
        });

        expect(result.map((course) => course.id)).toEqual(['1']);
    });

    it('keeps newest ordering and groups horizontal sections by category', () => {
        expect(filterStudentCourses(courses, defaultCatalogFilters).map((course) => course.id)).toEqual(['2', '1', '3']);
        expect(groupCoursesByCategory(courses).map(([category]) => category)).toEqual(['AI', 'База']);
    });
});
