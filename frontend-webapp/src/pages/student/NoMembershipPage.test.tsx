import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NoMembershipPage } from './NoMembershipPage';

const authMock = vi.hoisted((): { value: Record<string, unknown> } => ({ value: {} }));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => authMock.value,
}));

describe('NoMembershipPage', () => {
    let refreshProfile: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        refreshProfile = vi.fn().mockResolvedValue(null);
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
});
