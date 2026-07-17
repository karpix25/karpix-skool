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

    it('limits long course titles so cards keep a stable height', () => {
        renderTile();

        expect(screen.getByText(course.title)).toHaveClass('line-clamp-2', 'h-10', 'lg:line-clamp-3');
    });

    it('limits desktop descriptions so long copy does not stretch the card', () => {
        renderTile({ ...course, description: 'Очень длинное описание курса, которое не должно раздувать карточку в сетке.' });

        expect(screen.getByText(/Очень длинное описание/)).toHaveClass('lg:line-clamp-2', 'lg:max-h-12');
    });

    it('renders course covers as fit images instead of cropped covers', () => {
        renderTile({ ...course, cover_url: 'https://cdn.example.com/course.jpg' });

        const cover = screen.getByRole('img', { name: course.title });

        expect(cover).toHaveClass('object-contain');
        expect(cover.parentElement).toHaveClass('aspect-[16/9]');
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

        expect(screen.getByLabelText('VIP')).toHaveClass('bg-vip/10');
        expect(screen.getByText('VIP')).toBeInTheDocument();
    });

    it('links locked VIP courses to VIP access when the group link is available', () => {
        renderTile({
            ...course,
            is_vip: true,
            is_unlocked: false,
            lock_reason: 'Только для VIP',
            vip_group_link: 'https://t.me/vip-school',
        });

        expect(screen.queryByRole('link', { name: /Открыть курс/ })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: `Открыть VIP доступ к курсу ${course.title}` })).toHaveAttribute(
            'href',
            'https://t.me/vip-school',
        );
        expect(screen.getByLabelText('VIP доступ')).toBeInTheDocument();
        expect(screen.getByText('VIP доступ')).toBeInTheDocument();
    });

    it('keeps locked VIP courses non-clickable when the group link is missing', () => {
        renderTile({ ...course, is_vip: true, is_unlocked: false, lock_reason: 'Только для VIP' });

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(screen.getByLabelText('VIP доступ')).toBeInTheDocument();
    });
});
