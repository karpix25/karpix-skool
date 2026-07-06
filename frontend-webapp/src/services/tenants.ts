import api from '../api/client';
import type { AdminTenant } from '../types/admin';

export type TelegramGroupScope = 'regular' | 'vip';

export interface TenantAdminSyncResult {
    total_admins: number;
    promoted: string[];
}

export const disconnectTenantTelegramGroup = async (
    tenantId: string,
    scope: TelegramGroupScope
): Promise<AdminTenant> => {
    const response = await api.delete<AdminTenant>(`/tenants/${tenantId}/telegram-groups/${scope}`);
    return response.data;
};

export const syncTenantAdmins = async (tenantId: string): Promise<TenantAdminSyncResult> => {
    const response = await api.post<TenantAdminSyncResult>(`/tenants/${tenantId}/sync`);
    return response.data;
};
