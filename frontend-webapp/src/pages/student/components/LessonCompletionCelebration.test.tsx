import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LessonCompletionResponse } from '../../../types/course';
import { LessonCompletionCelebration } from './LessonCompletionCelebration';

const completionResult: LessonCompletionResponse = {
    xp_granted: 25,
    new_xp: 1250,
    new_level: 3,
    module_progress: {
        module_id: 'module-1',
        title: 'Первые шаги',
        total_lessons: 3,
        completed_lessons: 2,
        progress_percent: 67,
    },
    course_progress: {
        course_id: 'course-1',
        total_lessons: 10,
        completed_lessons: 4,
        progress_percent: 40,
    },
};

describe('LessonCompletionCelebration', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders only the granted XP animation', () => {
        render(<LessonCompletionCelebration result={completionResult} />);

        expect(screen.getByRole('status')).toHaveTextContent('+25 XP');
        expect(screen.getByText('+25 XP')).toBeInTheDocument();
        expect(screen.queryByText('Урок засчитан')).not.toBeInTheDocument();
        expect(screen.queryByText(/Сейчас у вас/)).not.toBeInTheDocument();
        expect(screen.queryByText('2/3 урока · 67%')).not.toBeInTheDocument();
    });

    it('hides itself after the short animation', () => {
        vi.useFakeTimers();

        render(<LessonCompletionCelebration result={completionResult} />);

        expect(screen.getByText('+25 XP')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(1850);
        });

        expect(screen.queryByText('+25 XP')).not.toBeInTheDocument();
    });
});
