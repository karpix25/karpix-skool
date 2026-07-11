import { describe, expect, it } from 'vitest';

import { canUseViewMode, normalizeViewMode } from './viewModes';

describe('viewModes', () => {
    it('defaults super admins to the platform console', () => {
        expect(normalizeViewMode(null, {
            canAccessAdminMode: true,
            isSuperAdmin: true,
            hasMembership: false,
        })).toBe('super_admin');
    });

    it('preserves super admin preview modes', () => {
        for (const mode of ['super_admin', 'admin', 'student'] as const) {
            expect(normalizeViewMode(mode, {
                canAccessAdminMode: true,
                isSuperAdmin: true,
                hasMembership: true,
            })).toBe(mode);
        }
    });

    it('does not allow ordinary admins to use platform-only modes', () => {
        expect(normalizeViewMode('super_admin', {
            canAccessAdminMode: true,
            isSuperAdmin: false,
            hasMembership: true,
        })).toBe('admin');
        expect(canUseViewMode('student', {
            canAccessAdminMode: true,
            isSuperAdmin: false,
        })).toBe(true);
    });
});
