import { describe, expect, it } from 'vitest';

import type { CourseLessonSummary, CourseModule } from '../../../types/course';
import { getSidebarModuleState, isVipLockReason } from './courseSidebarState';

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

describe('course sidebar state', () => {
    it('marks active modules and active lessons', () => {
        const state = getSidebarModuleState(
            module('module-1', [lesson('lesson-1'), lesson('lesson-2')]),
            'lesson-2',
            'module-1',
        );

        expect(state.isActive).toBe(true);
        expect(state.lessons.map((item) => item.isActive)).toEqual([false, true]);
    });

    it('propagates module locks to all lessons', () => {
        const state = getSidebarModuleState(
            module('module-1', [lesson('lesson-1')], {
                is_locked: true,
                lock_reason: 'Только для VIP',
            }),
            null,
            null,
        );

        expect(state.isLocked).toBe(true);
        expect(state.isVipLocked).toBe(true);
        expect(state.lockLabel).toBe('VIP');
        expect(state.lessons[0]).toMatchObject({
            isLocked: true,
            lockReason: 'Только для VIP',
        });
    });

    it('detects empty modules and hides progress completion state', () => {
        const state = getSidebarModuleState(module('empty', []), null, null);

        expect(state.isEmpty).toBe(true);
        expect(state.progress.counterLabel).toBe('0 уроков');
        expect(state.progress.progressPercent).toBe(0);
    });

    it('detects VIP lock copy case-insensitively', () => {
        expect(isVipLockReason('только для vip')).toBe(true);
        expect(isVipLockReason('Только для участников')).toBe(false);
        expect(isVipLockReason(null)).toBe(false);
    });
});
