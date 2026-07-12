import api from '../api/client';
import type { AdminTenant } from '../types/admin';

export type TelegramGroupScope = 'regular' | 'vip';

export interface TenantUpdateInput {
    name?: string;
    vip_group_link?: string | null;
    level_names?: Record<string, string> | null;
    welcome_video_enabled?: boolean;
    welcome_video_url?: string | null;
    welcome_video_title?: string | null;
    welcome_video_description?: string | null;
}

export interface TenantAdminSyncResult {
    total_admins: number;
    promoted: string[];
}

export const updateTenant = async (
    tenantId: string,
    payload: TenantUpdateInput
): Promise<AdminTenant> => {
    const response = await api.patch<AdminTenant>(`/tenants/${tenantId}`, payload);
    return response.data;
};

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
