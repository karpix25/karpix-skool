import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { StudentCourse } from '../../../types/course';
import { CourseCard } from './CourseCard';

const baseCourse: StudentCourse = {
    id: 'course-1',
    title: 'Основы запуска',
    description: 'Стартовый курс',
    progress_percent: 0,
    is_unlocked: true,
};

const renderCard = (course: StudentCourse, props: Omit<ComponentProps<typeof CourseCard>, 'course'> = {}) => render(
    <MemoryRouter>
        <CourseCard course={course} {...props} />
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
        expect(screen.getByText('Откроется на ур. 3')).toBeInTheDocument();
    });

    it('shows VIP access over the locked cover preview', () => {
        renderCard({
            ...baseCourse,
            is_unlocked: false,
            is_vip: true,
            lock_reason: 'Только для VIP',
        });

        expect(screen.getByText('VIP доступ')).toBeInTheDocument();
    });

    it('links locked VIP courses to VIP access when the group link is available', () => {
        renderCard({
            ...baseCourse,
            is_unlocked: false,
            is_vip: true,
            lock_reason: 'Только для VIP',
            vip_group_link: 'https://t.me/vip-school',
        });

        expect(screen.getByRole('link', { name: 'Открыть VIP доступ к курсу Основы запуска' })).toHaveAttribute(
            'href',
            'https://t.me/vip-school',
        );
        expect(screen.queryByRole('article', { name: 'Курс Основы запуска заблокирован' })).not.toBeInTheDocument();
    });

    it('renders material metadata and a pending favorite action', () => {
        const onFavoriteToggle = vi.fn();
        renderCard({ ...baseCourse, content_type: 'prompt', category: 'AI', tags: ['ChatGPT'] }, {
            isFavorite: true,
            favoritePending: true,
            favoriteError: 'Не удалось обновить избранное.',
            onFavoriteToggle,
        });

        expect(screen.getByText('Промпт')).toBeInTheDocument();
        expect(screen.getByText('AI')).toBeInTheDocument();
        expect(screen.getByText('#ChatGPT')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Убрать из избранного' })).toBeDisabled();
        expect(screen.getByRole('alert')).toHaveTextContent('Не удалось обновить избранное.');
        fireEvent.click(screen.getByRole('button', { name: 'Убрать из избранного' }));
        expect(onFavoriteToggle).not.toHaveBeenCalled();
    });
});
