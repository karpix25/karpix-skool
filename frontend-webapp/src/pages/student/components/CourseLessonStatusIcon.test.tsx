import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CourseLessonSummary } from '../../../types/course';
import { CourseLessonStatusIcon } from './CourseLessonStatusIcon';

const baseLesson: CourseLessonSummary = {
    id: 'lesson-1',
    title: 'Урок',
};

describe('CourseLessonStatusIcon', () => {
    it('renders the lesson emoji for an available lesson', () => {
        render(<CourseLessonStatusIcon lesson={{ ...baseLesson, icon_emoji: '🚀' }} isLocked={false} />);

        expect(screen.getByText('🚀')).toBeInTheDocument();
    });

    it('keeps the locked state stronger than the emoji', () => {
        const { container } = render(
            <CourseLessonStatusIcon lesson={{ ...baseLesson, icon_emoji: '🚀' }} isLocked />
        );

        expect(screen.queryByText('🚀')).not.toBeInTheDocument();
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('keeps the completed state stronger than the emoji', () => {
        const { container } = render(
            <CourseLessonStatusIcon
                lesson={{ ...baseLesson, icon_emoji: '🚀', is_completed: true }}
                isLocked={false}
            />
        );

        expect(screen.queryByText('🚀')).not.toBeInTheDocument();
        expect(container.querySelector('svg')).toBeInTheDocument();
    });
});
