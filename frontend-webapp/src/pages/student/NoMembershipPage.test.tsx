import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NoMembershipPage } from './NoMembershipPage';

const authMock = vi.hoisted((): { value: Record<string, unknown> } => ({ value: {} }));
const lessonOfferMock = vi.hoisted((): { value: Record<string, unknown> } => ({ value: {} }));
const telegramLinksMock = vi.hoisted(() => ({
    openTelegramGroupLink: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => authMock.value,
}));

vi.mock('./no-membership/useLessonLeadOffer', () => ({
    useLessonLeadOffer: () => lessonOfferMock.value,
}));

vi.mock('../../lib/telegramLinks', () => ({
    openTelegramGroupLink: telegramLinksMock.openTelegramGroupLink,
}));

vi.mock('../../services/deepLinks', () => ({
    resolveDeepLink: vi.fn(),
}));

describe('NoMembershipPage', () => {
    let refreshProfile: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        refreshProfile = vi.fn().mockResolvedValue(null);
        telegramLinksMock.openTelegramGroupLink.mockClear();
        lessonOfferMock.value = {
            offer: null,
            startParam: null,
            isLoading: false,
        };
        authMock.value = {
            user: {
                id: 'user-1',
                username: 'karpix',
                first_name: 'Карло',
                last_name: 'Пикс',
                avatar_url: 'https://example.com/avatar.jpg',
            },
            tenant: {
                id: 'tenant-1',
                name: 'Karpix Academy',
                telegram_group_id: -100123,
                free_group_link: 'https://t.me/aikarlo',
            },
            refreshProfile,
            logout: vi.fn(),
        };
    });

    it('shows an authenticated no-membership state without student navigation', () => {
        render(
            <MemoryRouter>
                <NoMembershipPage />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Доступ к школе не открыт' })).toBeInTheDocument();
        expect(screen.getByText(/школы «Karpix Academy»/)).toBeInTheDocument();
        expect(screen.getByText('karpix')).toBeInTheDocument();
        expect(screen.queryByText('Главная')).not.toBeInTheDocument();
        expect(screen.queryByText('Курсы')).not.toBeInTheDocument();
    });

    it('refreshes profile for the current tenant', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <NoMembershipPage />
            </MemoryRouter>
        );

        await user.click(screen.getByRole('button', { name: 'Обновить доступ' }));

        expect(refreshProfile).toHaveBeenCalledWith('tenant-1');
    });

    it('shows a lesson-specific free group offer', async () => {
        const user = userEvent.setup();
        lessonOfferMock.value = {
            startParam: 'lesson_11111111-1111-4111-8111-111111111111',
            isLoading: false,
            offer: {
                type: 'lesson',
                lesson_id: '11111111-1111-4111-8111-111111111111',
                lesson_title: 'Автоматизация заявок',
                course_id: 'course-1',
                course_title: 'AI для бизнеса',
                tenant_id: 'tenant-1',
                tenant_name: 'Karpix Academy',
                target_path: '/course/course-1?lessonId=11111111-1111-4111-8111-111111111111',
                is_locked: true,
                requires_group_join: true,
                free_group_link: 'https://t.me/aikarlo',
            },
        };

        render(
            <MemoryRouter>
                <NoMembershipPage />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Откройте урок «Автоматизация заявок»' })).toBeInTheDocument();
        expect(screen.getByText(/AI для бизнеса/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Вступить в группу' }));

        expect(telegramLinksMock.openTelegramGroupLink).toHaveBeenCalledWith('https://t.me/aikarlo');
    });
});
