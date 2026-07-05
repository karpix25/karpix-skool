import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { LessonContent } from '../../../types/course';
import { LessonHeroHeader } from './LessonHeroHeader';

const lesson: LessonContent = {
    id: 'lesson-1',
    title: 'Как собрать сильный промпт',
    cover_url: 'https://cdn.example.com/cover.jpg',
    icon_emoji: '🧠',
};

describe('LessonHeroHeader', () => {
    it('renders the static lesson cover, emoji, and title', () => {
        const { container } = render(<LessonHeroHeader lesson={lesson} />);

        expect(container.querySelector('img')).toHaveAttribute('src', lesson.cover_url);
        expect(screen.getByText('🧠')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: lesson.title })).toBeInTheDocument();
    });

    it('renders the title without optional header media', () => {
        const { container } = render(<LessonHeroHeader lesson={{ id: 'lesson-2', title: 'Только заголовок' }} />);

        expect(screen.getByRole('heading', { name: 'Только заголовок' })).toBeInTheDocument();
        expect(container.querySelector('img')).not.toBeInTheDocument();
    });
});
