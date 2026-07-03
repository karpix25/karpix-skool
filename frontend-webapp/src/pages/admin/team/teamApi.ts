import api from '../../../api/client';
import type { AssignableTeamRole, TeamMember, TeamRole } from './types';

export const fetchTeamMembers = async (tenantId: string) => {
    const response = await api.get<TeamMember[]>(`/tenants/${tenantId}/team`);
    return response.data;
};

export const addTeamMember = async (
    tenantId: string,
    identifier: string,
    role: AssignableTeamRole,
) => {
    const response = await api.post<TeamMember>(`/tenants/${tenantId}/team`, {
        identifier,
        role,
    });
    return response.data;
};

export const updateTeamMemberRole = async (
    tenantId: string,
    memberId: string,
    role: TeamRole,
) => {
    const response = await api.patch<TeamMember>(`/tenants/${tenantId}/team/${memberId}`, {
        role,
    });
    return response.data;
};

export const revokeTeamMemberRole = async (tenantId: string, memberId: string) => {
    const response = await api.delete<TeamMember>(`/tenants/${tenantId}/team/${memberId}`);
    return response.data;
};
