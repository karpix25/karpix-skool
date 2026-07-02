import type { TenantMembership } from '../types/auth';

const tenantManagementRoles = new Set(['admin', 'owner', 'moderator']);

export const isMembershipActive = (membership: TenantMembership | null) => (
    !!membership
    && (membership.status === undefined || membership.status === null || membership.status === 'active')
    && !membership.deleted_at
);

export const hasTenantManagementRole = (membership: TenantMembership | null) => (
    isMembershipActive(membership)
    && !!membership?.role
    && tenantManagementRoles.has(String(membership.role))
);
