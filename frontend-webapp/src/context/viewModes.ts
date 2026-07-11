import type { ViewMode } from '../types/auth';

export const viewModes = ['super_admin', 'admin', 'student'] as const;

export const isViewMode = (value: unknown): value is ViewMode => (
    typeof value === 'string' && viewModes.includes(value as ViewMode)
);

export const normalizeViewMode = (
    value: unknown,
    {
        canAccessAdminMode,
        isSuperAdmin,
        hasMembership,
    }: {
        canAccessAdminMode: boolean;
        isSuperAdmin: boolean;
        hasMembership: boolean;
    },
): ViewMode => {
    if (isSuperAdmin) {
        if (isViewMode(value)) return value;
        if (value === 'admin') return 'admin';
        return 'super_admin';
    }

    if (value === 'admin' && canAccessAdminMode) return 'admin';
    if (value === 'student') return 'student';
    if (canAccessAdminMode) return 'admin';
    if (hasMembership) return 'student';
    return 'student';
};

export const canUseViewMode = (
    mode: ViewMode,
    {
        canAccessAdminMode,
        isSuperAdmin,
    }: {
        canAccessAdminMode: boolean;
        isSuperAdmin: boolean;
    },
) => {
    if (mode === 'student') return true;
    if (mode === 'admin') return canAccessAdminMode;
    return isSuperAdmin;
};
