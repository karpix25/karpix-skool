import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../../context/AuthContext';
import { fetchTeamMembers } from './team/teamApi';
import { Team } from './Team';

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('./team/teamApi', () => ({
    fetchTeamMembers: vi.fn(),
    addTeamMember: vi.fn(),
    revokeTeamMemberRole: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);
const fetchTeamMembersMock = vi.mocked(fetchTeamMembers);

const authValue = (role: 'owner' | 'admin') => ({
    activeTenantId: 'tenant-1',
    tenant: { id: 'tenant-1' },
    membership: {
        tenant_id: 'tenant-1',
        role,
        status: 'active',
        xp: 0,
        level: 1,
    },
    isSuperAdmin: false,
});

describe('Team ownership permissions', () => {
    beforeEach(() => {
        fetchTeamMembersMock.mockResolvedValue([]);
    });

    it('allows an active owner to invite administrators', async () => {
        useAuthMock.mockReturnValue(authValue('owner') as ReturnType<typeof useAuth>);
        render(<Team />);

        await waitFor(() => expect(fetchTeamMembersMock).toHaveBeenCalledWith('tenant-1'));
        expect(screen.getByPlaceholderText('@username или 123456789')).toBeEnabled();
        expect(screen.queryByText('Управление ролями доступно владельцу')).not.toBeInTheDocument();
    });

    it('keeps role changes disabled for a school administrator', async () => {
        useAuthMock.mockReturnValue(authValue('admin') as ReturnType<typeof useAuth>);
        render(<Team />);

        await waitFor(() => expect(fetchTeamMembersMock).toHaveBeenCalledWith('tenant-1'));
        expect(screen.getByPlaceholderText('@username или 123456789')).toBeDisabled();
        expect(screen.getByText('Управление ролями доступно владельцу')).toBeInTheDocument();
    });
});
