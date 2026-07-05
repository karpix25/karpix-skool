import { Crown, GraduationCap, ShieldCheck, UserCog } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { SUPER_ADMIN_VIEW_MODES } from './types';
import type { SuperAdminViewMode } from './types';

export interface SuperAdminViewModeConfig {
    mode: SuperAdminViewMode;
    label: string;
    description: string;
    targetRoute: string;
    icon: LucideIcon;
}

export const viewModeConfigByMode: Record<SuperAdminViewMode, SuperAdminViewModeConfig> = {
    super_admin: {
        mode: 'super_admin',
        label: 'Суперадмин',
        description: 'Платформенная консоль всех школ',
        targetRoute: '/',
        icon: Crown,
    },
    admin: {
        mode: 'admin',
        label: 'Админ',
        description: 'Управление выбранной школой',
        targetRoute: '/',
        icon: ShieldCheck,
    },
    moderator: {
        mode: 'moderator',
        label: 'Модератор',
        description: 'Модерация выбранной школы',
        targetRoute: '/students',
        icon: UserCog,
    },
    student: {
        mode: 'student',
        label: 'Юзер',
        description: 'Обычный ученический вид',
        targetRoute: '/',
        icon: GraduationCap,
    },
};

export const viewModeConfigs = SUPER_ADMIN_VIEW_MODES.map(
    (mode) => viewModeConfigByMode[mode]
);

export const tenantScopedViewModes = ['admin', 'moderator', 'student'] as const satisfies readonly SuperAdminViewMode[];
const tenantScopedViewModeSet = new Set<SuperAdminViewMode>(tenantScopedViewModes);

export function getViewModeConfig(mode: SuperAdminViewMode): SuperAdminViewModeConfig {
    return viewModeConfigByMode[mode];
}

export function getViewModeLabel(mode: SuperAdminViewMode): string {
    return getViewModeConfig(mode).label;
}

export function getViewModeDescription(mode: SuperAdminViewMode): string {
    return getViewModeConfig(mode).description;
}

export function isTenantScopedViewMode(mode: SuperAdminViewMode): boolean {
    return tenantScopedViewModeSet.has(mode);
}

export function getViewModeTargetRoute(
    mode: SuperAdminViewMode,
    tenantId?: string | null
): string {
    const route = getViewModeConfig(mode).targetRoute;

    if (!tenantId || !isTenantScopedViewMode(mode)) {
        return route;
    }

    return `${route}?tenant=${encodeURIComponent(tenantId)}`;
}
