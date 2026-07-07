import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CourseModule } from '../../../types/course';
import { ModuleProgressSummary } from './ModuleProgressSummary';

const baseModule: CourseModule = {
    id: 'module-1',
    title: 'Первые шаги',
    lessons: [
        { id: 'lesson-1', title: 'Старт', is_completed: true },
        { id: 'lesson-2', title: 'Практика', is_completed: false },
    ],
};

describe('ModuleProgressSummary', () => {
    it('renders lesson counter and progress from lesson fallback data', () => {
        render(<ModuleProgressSummary module={baseModule} />);

        expect(screen.getByText('Прогресс папки')).toBeInTheDocument();
        expect(screen.getByText('1/2 урока · 50%')).toBeInTheDocument();
        expect(screen.getByLabelText('Прогресс папки Первые шаги')).toBeInTheDocument();
    });

    it('renders completed state from API progress fields', () => {
        render(
            <ModuleProgressSummary
                module={{
                    ...baseModule,
                    total_lessons: 5,
                    completed_lessons: 5,
                    progress_percent: 100,
                    lessons: [],
                }}
            />,
        );

        expect(screen.getByText('Папка завершена')).toBeInTheDocument();
        expect(screen.getByText('5/5 уроков · 100%')).toBeInTheDocument();
    });
});
