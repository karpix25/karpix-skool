import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { CourseSubscriptionState } from '../../../services/courseSubscriptions';
import { CourseSubscriptionButton, type CourseSubscriptionActions } from './CourseSubscriptionButton';

const courseId = 'course-1';

const state = (isSubscribed: boolean): CourseSubscriptionState => ({
    course_id: courseId,
    is_subscribed: isSubscribed,
    updated_at: null,
});

const createActions = (overrides: Partial<CourseSubscriptionActions> = {}): CourseSubscriptionActions => ({
    getStatus: vi.fn().mockResolvedValue(state(false)),
    subscribe: vi.fn().mockResolvedValue(state(true)),
    unsubscribe: vi.fn().mockResolvedValue(state(false)),
    ...overrides,
});

describe('CourseSubscriptionButton', () => {
    it('loads the current state and lets a student subscribe', async () => {
        const user = userEvent.setup();
        const actions = createActions();

        render(<CourseSubscriptionButton courseId={courseId} actions={actions} />);

        const button = await screen.findByRole('button', {
            name: 'Включить Telegram-уведомления о новых уроках курса',
        });
        expect(button).toHaveTextContent('Уведомлять');

        await user.click(button);

        await waitFor(() => expect(actions.subscribe).toHaveBeenCalledWith(courseId));
        expect(await screen.findByRole('button', {
            name: 'Отключить Telegram-уведомления курса',
        })).toHaveTextContent('Уведомления включены');
    });

    it('unsubscribes from an active course subscription', async () => {
        const user = userEvent.setup();
        const actions = createActions({
            getStatus: vi.fn().mockResolvedValue(state(true)),
        });

        render(<CourseSubscriptionButton courseId={courseId} actions={actions} />);

        const button = await screen.findByRole('button', {
            name: 'Отключить Telegram-уведомления курса',
        });
        await user.click(button);

        await waitFor(() => expect(actions.unsubscribe).toHaveBeenCalledWith(courseId));
        expect(await screen.findByRole('button', {
            name: 'Включить Telegram-уведомления о новых уроках курса',
        })).toHaveTextContent('Уведомлять');
    });

    it('shows a retryable error state when loading fails', async () => {
        const actions = createActions({
            getStatus: vi.fn().mockRejectedValue(new Error('Нет доступа к курсу')),
        });

        render(<CourseSubscriptionButton courseId={courseId} actions={actions} />);

        expect(await screen.findByRole('button', {
            name: 'Повторить загрузку состояния уведомлений курса',
        })).toHaveTextContent('Повторить');
        expect(screen.getByRole('alert')).toHaveTextContent('Нет доступа к курсу');
    });
});
