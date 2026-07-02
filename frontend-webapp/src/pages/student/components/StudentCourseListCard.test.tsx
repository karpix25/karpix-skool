import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { StudentCourse } from '../../../types/course';
import { StudentCourseListCard } from './StudentCourseListCard';

const baseCourse: StudentCourse = {
    id: 'course-1',
    title: 'Основы запуска',
    description: 'Стартовый курс',
    progress_percent: 42,
    is_unlocked: true,
};

const renderCard = (course: StudentCourse) => render(
    <MemoryRouter>
        <StudentCourseListCard course={course} />
    </MemoryRouter>
);

describe('StudentCourseListCard', () => {
    it('links to the course when access is open', () => {
        renderCard(baseCourse);

        expect(screen.getByRole('link', { name: 'Открыть курс Основы запуска' })).toHaveAttribute(
            'href',
            '/course/course-1',
        );
        expect(screen.getByText('Открыт')).toBeInTheDocument();
        expect(screen.getByText('42%')).toBeInTheDocument();
        expect(screen.getByText('Продолжить')).toBeInTheDocument();
    });

    it('shows a calm locked state without linking to the course', () => {
        renderCard({
            ...baseCourse,
            is_unlocked: false,
            is_vip: true,
            lock_reason: 'Только для VIP',
            vip_group_link: 'https://example.com/vip',
        });

        expect(screen.queryByRole('link', { name: 'Открыть курс Основы запуска' })).not.toBeInTheDocument();
        expect(screen.getByText('Заблокирован')).toBeInTheDocument();
        expect(screen.getByText('Только для VIP')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'VIP доступ' })).toHaveAttribute('href', 'https://example.com/vip');
    });
});
