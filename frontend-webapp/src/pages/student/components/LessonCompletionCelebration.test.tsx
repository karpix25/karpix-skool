import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
    it('renders granted XP and updated lesson progress', () => {
        render(<LessonCompletionCelebration result={completionResult} />);

        expect(screen.getByRole('status')).toHaveTextContent('Урок засчитан');
        expect(screen.getByText('+25 XP')).toBeInTheDocument();
        expect(screen.getByText(/Сейчас у вас 1\s*250 XP · уровень 3/)).toBeInTheDocument();
        expect(screen.getByText('2/3 урока · 67%')).toBeInTheDocument();
        expect(screen.getByText('4/10 уроков · 40%')).toBeInTheDocument();
    });

    it('calls out when the current module is completed', () => {
        render(
            <LessonCompletionCelebration
                result={{
                    ...completionResult,
                    module_progress: {
                        ...completionResult.module_progress,
                        completed_lessons: 3,
                        progress_percent: 100,
                    },
                }}
            />,
        );

        expect(screen.getByText('Папка завершена')).toBeInTheDocument();
        expect(screen.getByText('3/3 урока · 100%')).toBeInTheDocument();
    });
});
