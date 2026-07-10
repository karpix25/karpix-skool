import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CourseGenerationLessonResults } from './CourseGenerationLessonResults';

describe('CourseGenerationLessonResults', () => {
    it('shows partial counts and resumes only the selected lesson group', async () => {
        const onResume = vi.fn();
        const user = userEvent.setup();

        render(
            <CourseGenerationLessonResults
                state={{
                    id: 'job-1',
                    status: 'partial_drafts',
                    planned_lesson_count: 12,
                    ready_lesson_count: 9,
                    failed_lesson_count: 2,
                    source_gap_lesson_count: 1,
                    current_stage: 'lessons',
                    can_resume: true,
                }}
                onResume={onResume}
            />
        );

        expect(screen.getByText('Запланировано')).toBeInTheDocument();
        expect(screen.getByText('Готово')).toBeInTheDocument();
        expect(screen.getByText('Этап: создание уроков')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Продолжить генерацию' }));
        expect(onResume).toHaveBeenLastCalledWith(false);

        await user.click(screen.getByRole('button', { name: 'Повторить уроки без материала' }));
        expect(onResume).toHaveBeenLastCalledWith(true);
    });
});
