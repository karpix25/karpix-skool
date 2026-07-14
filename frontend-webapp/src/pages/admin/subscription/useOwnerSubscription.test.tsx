import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../../../api/client';
import { useOwnerSubscription } from './useOwnerSubscription';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn() } }));

const apiGet = vi.mocked(api.get);

describe('useOwnerSubscription', () => {
    beforeEach(() => apiGet.mockReset());

    it('loads the tenant-scoped owner subscription', async () => {
        apiGet.mockResolvedValue({ data: { tenant_id: 'tenant-1', status: 'trialing' } } as never);

        const { result } = renderHook(() => useOwnerSubscription('tenant-1'));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(apiGet).toHaveBeenCalledWith('/tenants/tenant-1/subscription');
        expect(result.current.subscription).toMatchObject({ status: 'trialing' });
    });
});
