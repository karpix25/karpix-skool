import api from '../api/client';
import type { WebAppLevelsResponse } from '../types/levels';

export const fetchWebAppLevels = async (tenantId?: string | null) => {
    const response = await api.get<WebAppLevelsResponse>('/webapp/levels', {
        params: tenantId ? { tenant_id: tenantId } : undefined,
    });

    return response.data;
};
