import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../../../api/client';
import { createSchoolAndRefreshOwner } from './createSchoolAndRefreshOwner';

vi.mock('../../../api/client', () => ({
    default: { post: vi.fn() },
}));

const apiPost = vi.mocked(api.post);

describe('createSchoolAndRefreshOwner', () => {
    beforeEach(() => apiPost.mockReset());

    it('refreshes the owner profile against the newly created tenant', async () => {
        apiPost.mockResolvedValue({ data: { id: 'tenant-1', name: 'Школа' } } as never);
        const refreshProfile = vi.fn().mockResolvedValue({ id: 'owner-1' });

        const result = await createSchoolAndRefreshOwner('Школа', refreshProfile);

        expect(apiPost).toHaveBeenCalledWith('/tenants', { name: 'Школа' });
        expect(refreshProfile).toHaveBeenCalledWith('tenant-1');
        expect(result.profileRefreshed).toBe(true);
    });
});
