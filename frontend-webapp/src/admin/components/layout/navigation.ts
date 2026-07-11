import { Bot, BookOpen, LayoutDashboard, Settings, Shield, UserCog, Users, type LucideIcon } from 'lucide-react';
import type { ViewMode } from '../../../types/auth';

export interface AdminNavItem {
    to: string;
    label: string;
    shortLabel?: string;
    icon: LucideIcon;
    end?: boolean;
}

const schoolWorkspaceItems: AdminNavItem[] = [
    { to: '/', label: 'Обзор', icon: LayoutDashboard, end: true },
    { to: '/courses', label: 'Контент', icon: BookOpen },
    { to: '/agent-runs', label: 'AI assistant', shortLabel: 'AI', icon: Bot },
    { to: '/students', label: 'Студенты', icon: Users },
];

const ownerWorkspaceItems: AdminNavItem[] = [
    ...schoolWorkspaceItems,
    { to: '/team', label: 'Команда', shortLabel: 'Ком.', icon: UserCog },
    { to: '/settings', label: 'Настройки', shortLabel: 'Настр.', icon: Settings },
];

const platformAdminItems: AdminNavItem[] = [
    { to: '/', label: 'Консоль', icon: Shield, end: true },
    { to: '/analytics', label: 'Обзор', icon: LayoutDashboard, end: true },
];

const platformAdminSchoolItems: AdminNavItem[] = [
    { to: '/', label: 'Обзор', icon: LayoutDashboard, end: true },
    { to: '/courses', label: 'Контент', icon: BookOpen },
    { to: '/agent-runs', label: 'AI assistant', shortLabel: 'AI', icon: Bot },
    { to: '/students', label: 'Студенты', icon: Users },
    { to: '/team', label: 'Команда', shortLabel: 'Ком.', icon: UserCog },
    { to: '/settings', label: 'Настройки', shortLabel: 'Настр.', icon: Settings },
];

export const getAdminNavItems = (
    isPlatformAdmin: boolean,
    hasActiveTenant = false,
    viewMode: ViewMode = 'admin',
    canManageSchoolSettings = false,
) => {
    if (!isPlatformAdmin) return canManageSchoolSettings ? ownerWorkspaceItems : schoolWorkspaceItems;
    if (viewMode === 'super_admin') return platformAdminItems;
    if (!hasActiveTenant) return platformAdminItems;
    return platformAdminSchoolItems;
};

export const isAdminNavItemActive = (pathname: string, item: AdminNavItem) => {
    if (item.end || item.to === '/') return pathname === item.to;
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
};
