import api from '../api/client';

export type SetupTokenScope = 'owner_invite' | 'free_group_link' | 'vip_group_link';

export interface SetupTokenIssue {
    token: string;
    scope: SetupTokenScope;
    expires_at: string;
    setup_command: string;
}

export const createTenantSetupToken = async (
    tenantId: string,
    scope: SetupTokenScope
): Promise<SetupTokenIssue> => {
    const response = await api.post<SetupTokenIssue>(`/tenants/${tenantId}/setup-tokens`, { scope });
    return response.data;
};
