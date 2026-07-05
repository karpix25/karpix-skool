import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { StudentCourse } from '../../../types/course';
import { StudentCourseTile } from './StudentCourseTile';

const course: StudentCourse = {
    id: 'course-1',
    title: 'Очень длинное название курса без обрезания на первой строке',
    progress_percent: 33,
    is_unlocked: true,
};

const renderTile = (nextCourse: StudentCourse = course) => render(
    <MemoryRouter>
        <StudentCourseTile course={nextCourse} />
    </MemoryRouter>
);

describe('StudentCourseTile', () => {
    it('renders a compact linked course tile', () => {
        renderTile();

        expect(screen.getByRole('link', { name: `Открыть курс ${course.title}` })).toHaveAttribute(
            'href',
            '/course/course-1',
        );
        expect(screen.getByText(course.title)).toBeInTheDocument();
        expect(screen.getByText('33%')).toBeInTheDocument();
    });

    it('keeps locked courses non-clickable', () => {
        renderTile({ ...course, is_unlocked: false, lock_reason: 'Закрыто' });

        expect(screen.queryByRole('link', { name: /Открыть курс/ })).not.toBeInTheDocument();
        expect(screen.getByLabelText(`Курс ${course.title} заблокирован`)).toBeInTheDocument();
    });
});
