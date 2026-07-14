import { describe, expect, it } from 'vitest';

import type { AdminModule } from '../../../types/admin';
import { buildLessonOrderItems, findLessonContainerId, moveLesson } from './lessonOrdering';

const modules: AdminModule[] = [
    {
        id: 'module-1',
        title: 'Первый модуль',
        lessons: [
            { id: 'lesson-1', title: 'Первый', is_published: true, module_id: 'module-1' },
            { id: 'lesson-2', title: 'Второй', is_published: true, module_id: 'module-1' },
        ],
    },
    {
        id: 'module-2',
        title: 'Второй модуль',
        lessons: [
            { id: 'lesson-3', title: 'Третий', is_published: true, module_id: 'module-2' },
        ],
    },
];

describe('lessonOrdering', () => {
    it('resolves the parent module for both modules and lesson cards', () => {
        expect(findLessonContainerId(modules, 'module-2')).toBe('module-2');
        expect(findLessonContainerId(modules, 'lesson-3')).toBe('module-2');
    });

    it('reorders lessons without mutating the original module', () => {
        const reordered = moveLesson(modules, 'lesson-1', 'module-1', 'module-1', 'lesson-2');

        expect(reordered[0].lessons.map((lesson) => lesson.id)).toEqual(['lesson-2', 'lesson-1']);
        expect(modules[0].lessons.map((lesson) => lesson.id)).toEqual(['lesson-1', 'lesson-2']);
    });

    it('moves a lesson between modules and builds one atomic payload', () => {
        const reordered = moveLesson(modules, 'lesson-1', 'module-1', 'module-2', 'lesson-3');

        expect(reordered[0].lessons.map((lesson) => lesson.id)).toEqual(['lesson-2']);
        expect(reordered[1].lessons.map((lesson) => lesson.id)).toEqual(['lesson-1', 'lesson-3']);
        expect(buildLessonOrderItems(reordered, ['module-1', 'module-2'])).toEqual([
            { id: 'lesson-2', module_id: 'module-1', order_index: 0 },
            { id: 'lesson-1', module_id: 'module-2', order_index: 0 },
            { id: 'lesson-3', module_id: 'module-2', order_index: 1 },
        ]);
    });
});
