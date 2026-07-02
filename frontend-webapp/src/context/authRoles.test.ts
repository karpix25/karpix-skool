import { describe, expect, it } from 'vitest';

import { hasTenantManagementRole } from './authRoles';
import type { TenantMembership } from '../types/auth';

const membership = (overrides: Partial<TenantMembership> = {}): TenantMembership => ({
    tenant_id: 'tenant-1',
    role: 'admin',
    status: 'active',
    xp: 0,
    level: 1,
    ...overrides,
});

describe('auth roles', () => {
    it('allows active tenant managers', () => {
        expect(hasTenantManagementRole(membership({ role: 'owner' }))).toBe(true);
        expect(hasTenantManagementRole(membership({ role: 'admin' }))).toBe(true);
        expect(hasTenantManagementRole(membership({ role: 'moderator' }))).toBe(true);
    });

    it('rejects students and inactive memberships for admin mode', () => {
        expect(hasTenantManagementRole(membership({ role: 'student' }))).toBe(false);
        expect(hasTenantManagementRole(membership({ status: 'paused' }))).toBe(false);
        expect(hasTenantManagementRole(membership({ deleted_at: '2026-07-02T00:00:00Z' }))).toBe(false);
    });
});
