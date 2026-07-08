import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CourseLessonSummary, CourseModule } from '../../../types/course';
import { CourseDesktopSidebar } from './CourseDesktopSidebar';

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

const renderSidebar = (
    modules: CourseModule[],
    overrides: Partial<ComponentProps<typeof CourseDesktopSidebar>> = {},
) => {
    const onSelectLesson = vi.fn();
    const onOpenVipAccess = vi.fn();

    render(
        <CourseDesktopSidebar
            modules={modules}
            activeLessonId="lesson-active"
            activeModuleId="module-active"
            onSelectLesson={onSelectLesson}
            onOpenVipAccess={onOpenVipAccess}
            {...overrides}
        />,
    );

    return { onOpenVipAccess, onSelectLesson };
};

describe('CourseDesktopSidebar', () => {
    it('marks the active lesson as current', () => {
        renderSidebar([
            module('module-active', [lesson('lesson-active', { title: 'Текущий урок' })]),
        ]);

        expect(screen.getByRole('button', { name: /Открыть урок Текущий урок/ })).toHaveAttribute(
            'aria-current',
            'page',
        );
        expect(screen.getByText('Сейчас открыт')).toBeInTheDocument();
    });

    it('opens available lessons', () => {
        const { onSelectLesson } = renderSidebar([
            module('module-1', [lesson('lesson-1', { title: 'Открытый урок' })]),
        ]);

        fireEvent.click(screen.getByRole('button', { name: /Открыть урок Открытый урок/ }));

        expect(onSelectLesson).toHaveBeenCalledWith('lesson-1');
    });

    it('keeps locked lessons disabled', () => {
        const { onSelectLesson } = renderSidebar([
            module('module-1', [lesson('lesson-1', { is_locked: true, lock_reason: 'Закрыто' })]),
        ]);

        const button = screen.getByRole('button', { name: /Lesson lesson-1. Закрыто/ });
        expect(button).toBeDisabled();

        fireEvent.click(button);
        expect(onSelectLesson).not.toHaveBeenCalled();
    });

    it('renders compact empty module state', () => {
        renderSidebar([module('module-empty', [], { title: 'Пустая глава' })]);

        expect(screen.getByText('Пустая глава')).toBeInTheDocument();
        expect(screen.getByText('Нет опубликованных уроков.')).toBeInTheDocument();
    });

    it('calls VIP access action for VIP locked modules', () => {
        const { onOpenVipAccess } = renderSidebar([
            module('module-vip', [], { is_locked: true, lock_reason: 'Только для VIP' }),
        ]);

        fireEvent.click(screen.getByRole('button', { name: /Получить доступ/ }));

        expect(onOpenVipAccess).toHaveBeenCalledTimes(1);
    });
});
