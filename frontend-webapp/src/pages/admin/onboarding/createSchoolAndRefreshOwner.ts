import api from '../../../api/client';
import type { AdminTenant } from '../../../types/admin';

type RefreshOwnerProfile = (tenantId: string) => Promise<unknown | null>;

export const createSchoolAndRefreshOwner = async (
    name: string,
    refreshProfile: RefreshOwnerProfile,
) => {
    const response = await api.post<AdminTenant>('/tenants', { name });
    const profile = await refreshProfile(response.data.id);

    return {
        tenant: response.data,
        profileRefreshed: profile !== null,
    };
};
