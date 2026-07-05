import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { StudentCourse } from '../../../types/course';
import { CourseCard } from './CourseCard';

const baseCourse: StudentCourse = {
    id: 'course-1',
    title: 'Основы запуска',
    description: 'Стартовый курс',
    progress_percent: 0,
    is_unlocked: true,
};

const renderCard = (course: StudentCourse) => render(
    <MemoryRouter>
        <CourseCard course={course} />
    </MemoryRouter>
);

describe('CourseCard', () => {
    it('links to course detail when the course is unlocked', () => {
        renderCard({ ...baseCourse, progress_percent: 42 });

        const link = screen.getByRole('link', { name: 'Открыть курс Основы запуска' });
        expect(link).toHaveAttribute('href', '/course/course-1');
        expect(screen.getByText('Продолжить')).toBeInTheDocument();
        expect(screen.getByText('42%')).toBeInTheDocument();
    });

    it('fits the full cover image inside student course cards', () => {
        renderCard({ ...baseCourse, cover_url: 'https://cdn.example.com/cover.jpg' });

        expect(screen.getByRole('img', { name: 'Основы запуска' })).toHaveClass('object-contain');
    });

    it('renders locked courses as disabled cards without navigation', () => {
        renderCard({
            ...baseCourse,
            is_unlocked: false,
            lock_reason: 'Откроется на 3 уровне',
        });

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(screen.getByRole('article', { name: 'Курс Основы запуска заблокирован' })).toHaveAttribute(
            'aria-disabled',
            'true',
        );
        expect(screen.getByRole('button', { name: 'Откроется на 3 уровне' })).toBeDisabled();
    });
});
