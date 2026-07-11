export const SUPER_ADMIN_VIEW_MODES = [
    'super_admin',
    'admin',
    'student',
] as const;

export type SuperAdminViewMode = typeof SUPER_ADMIN_VIEW_MODES[number];

export interface ContextSwitcherTenant {
    id: string;
    name: string;
    member_count?: number | null;
    subscription_status?: string | null;
}

export interface SuperAdminContextSwitcherProps {
    currentMode: SuperAdminViewMode;
    selectedTenantId: string | null;
    tenants: ContextSwitcherTenant[];
    onModeChange: (mode: SuperAdminViewMode) => void;
    onTenantChange: (tenantId: string) => void;
    className?: string;
}
