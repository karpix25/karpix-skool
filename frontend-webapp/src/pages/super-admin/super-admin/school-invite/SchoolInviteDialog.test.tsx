import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../../../../api/client';
import { SchoolInviteDialog } from './SchoolInviteDialog';

vi.mock('../../../../api/client', () => ({
    default: { post: vi.fn() },
}));

describe('SchoolInviteDialog', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
    });

    it('shows only the one-time setup command after creating a school', async () => {
        vi.mocked(api.post).mockResolvedValue({
            data: {
                id: 'tenant-1',
                name: 'Школа ремонта',
                setup_command: '/setup one-time-owner-token',
                setup_token_expires_at: '2026-07-15T12:00:00Z',
                setup_token: 'one-time-owner-token',
                setup_code: 'START-legacy-code',
            },
        });
        const user = userEvent.setup();
        const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

        render(<SchoolInviteDialog open onOpenChange={vi.fn()} />);
        await user.type(screen.getByLabelText('Название школы'), 'Школа ремонта');
        await user.click(screen.getByRole('button', { name: 'Создать школу' }));

        expect(await screen.findByText('Школа «Школа ремонта» создана')).toBeInTheDocument();
        expect(screen.getByText('/setup one-time-owner-token')).toBeInTheDocument();
        expect(screen.queryByText('START-legacy-code')).not.toBeInTheDocument();
        expect(screen.getByText(/отображается только сейчас/i)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Скопировать' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Скопировано' })).toBeInTheDocument());
        expect(writeText).toHaveBeenCalledWith('/setup one-time-owner-token');
    });
});
