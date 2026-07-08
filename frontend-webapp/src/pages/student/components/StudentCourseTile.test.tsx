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

    it('renders course covers as fit images instead of cropped covers', () => {
        renderTile({ ...course, cover_url: 'https://cdn.example.com/course.jpg' });

        expect(screen.getByRole('img', { name: course.title })).toHaveClass('object-contain');
    });

    it('keeps locked courses non-clickable', () => {
        renderTile({ ...course, is_unlocked: false, lock_reason: 'Закрыто' });

        expect(screen.queryByRole('link', { name: /Открыть курс/ })).not.toBeInTheDocument();
        expect(screen.getByLabelText(`Курс ${course.title} заблокирован`)).toBeInTheDocument();
        expect(screen.getByText('Закрыто')).toBeInTheDocument();
    });

    it('shows a level unlock overlay over locked previews', () => {
        renderTile({ ...course, is_unlocked: false, lock_reason: 'Откроется на 3 уровне' });

        expect(screen.getByLabelText('Откроется на ур. 3')).toBeInTheDocument();
        expect(screen.getByText('Откроется на ур. 3')).toBeInTheDocument();
    });

    it('renders VIP courses with a translucent lock badge', () => {
        renderTile({ ...course, is_vip: true });

        expect(screen.getByLabelText('VIP')).toHaveClass('bg-amber-500/10');
        expect(screen.getByText('VIP')).toBeInTheDocument();
    });

    it('keeps locked VIP courses non-clickable', () => {
        renderTile({ ...course, is_vip: true, is_unlocked: false, lock_reason: 'Только для VIP' });

        expect(screen.queryByRole('link', { name: /Открыть курс/ })).not.toBeInTheDocument();
        expect(screen.getByLabelText('VIP доступ')).toBeInTheDocument();
        expect(screen.getByText('VIP доступ')).toBeInTheDocument();
    });
});
