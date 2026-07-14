import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../../../../api/client';
import type { Tenant } from '../types';
import { OwnerInvitePanel } from './OwnerInvitePanel';

vi.mock('../../../../api/client', () => ({
    default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const tenant: Tenant = {
    id: 'tenant-1',
    name: 'Школа ремонта',
    owner_email: null,
    owner_username: null,
    owner_telegram_id: null,
    subscription_status: 'active',
    expires_at: null,
    member_count: 0,
    course_count: 0,
    onboarding_stage: 'invited',
    has_telegram_group: false,
    has_published_lesson: false,
    student_count: 0,
};

const activeInvite = {
    tenant_id: tenant.id,
    status: 'active' as const,
    expires_at: '2026-07-20T12:00:00Z',
    created_at: '2026-07-14T12:00:00Z',
    revoked_at: null,
};

describe('OwnerInvitePanel', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
        vi.mocked(api.delete).mockReset();
        vi.mocked(api.get).mockResolvedValue({ data: activeInvite });
    });

    it('shows persisted status and expiry and revokes an active invite', async () => {
        vi.mocked(api.delete).mockResolvedValue({
            data: {
                ...activeInvite,
                status: 'revoked',
                revoked_at: '2026-07-14T13:00:00Z',
            },
        });
        const user = userEvent.setup();
        render(<OwnerInvitePanel tenant={tenant} />);

        expect(await screen.findByText('Ожидает владельца')).toBeInTheDocument();
        expect(screen.getByText(/Срок действия: до/i)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Отозвать' }));

        await waitFor(() => expect(api.delete).toHaveBeenCalledWith(
            '/super/tenants/tenant-1/owner-invite'
        ));
        expect(await screen.findByText('Отозвано')).toBeInTheDocument();
    });

    it('rotates the invite and reveals only the fresh one-time command', async () => {
        vi.mocked(api.post).mockResolvedValue({
            data: {
                ...activeInvite,
                setup_command: '/setup SETUP2-fresh-secret',
            },
        });
        const user = userEvent.setup();
        render(<OwnerInvitePanel tenant={tenant} />);

        await user.click(await screen.findByRole('button', { name: 'Обновить код' }));

        await waitFor(() => expect(api.post).toHaveBeenCalledWith(
            '/super/tenants/tenant-1/owner-invite/rotate'
        ));
        expect(screen.getByText('/setup SETUP2-fresh-secret')).toBeInTheDocument();
        expect(screen.getByText(/Старые активные коды уже отозваны/i)).toBeInTheDocument();
    });

    it('shows a claimed invite without secret-management actions', async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: {
                ...activeInvite,
                status: 'claimed',
            },
        });
        render(<OwnerInvitePanel tenant={{ ...tenant, owner_username: 'owner' }} />);

        expect(await screen.findByText('Владелец подключён')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /код/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Отозвать' })).not.toBeInTheDocument();
    });
});
