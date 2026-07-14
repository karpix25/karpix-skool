import { describe, expect, it } from 'vitest';

import type { TenantMembership } from '../../../types/auth';
import { canManageSchoolOwnershipSettings, getAdminNavItems } from './navigation';

const membership = (role: string, status: string | null = 'active'): TenantMembership => ({
    tenant_id: 'tenant-1',
    role,
    status,
    xp: 0,
    level: 1,
});

describe('school ownership navigation permissions', () => {
    it('allows active owners and superadmins to manage school settings', () => {
        expect(canManageSchoolOwnershipSettings(membership('owner'), false)).toBe(true);
        expect(canManageSchoolOwnershipSettings(null, true)).toBe(true);
    });

    it('rejects admins and inactive owners', () => {
        expect(canManageSchoolOwnershipSettings(membership('admin'), false)).toBe(false);
        expect(canManageSchoolOwnershipSettings(membership('owner', 'paused'), false)).toBe(false);
        expect(canManageSchoolOwnershipSettings({ ...membership('owner'), deleted_at: '2026-01-01' }, false)).toBe(false);
    });

    it('shows team and settings only when ownership permission is passed', () => {
        const regularLabels = getAdminNavItems(false, true, 'admin', false).map((item) => item.label);
        const ownerLabels = getAdminNavItems(false, true, 'admin', true).map((item) => item.label);

        expect(regularLabels).not.toContain('Команда');
        expect(regularLabels).not.toContain('Настройки');
        expect(ownerLabels).toContain('Команда');
        expect(ownerLabels).toContain('Настройки');
    });
});
