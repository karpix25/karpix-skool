import { BookOpen, LayoutDashboard, Settings, Shield, Users, type LucideIcon } from 'lucide-react';

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
    { to: '/students', label: 'Студенты', icon: Users },
    { to: '/settings', label: 'Настройки', shortLabel: 'Настр.', icon: Settings },
];

const superAdminItems: AdminNavItem[] = [
    { to: '/', label: 'Консоль', icon: Shield, end: true },
    { to: '/analytics', label: 'Обзор', icon: LayoutDashboard, end: true },
    { to: '/courses', label: 'Контент', icon: BookOpen },
    { to: '/students', label: 'Студенты', icon: Users },
    { to: '/settings', label: 'Настройки', shortLabel: 'Настр.', icon: Settings },
];

export const getAdminNavItems = (isSuperAdmin: boolean) =>
    isSuperAdmin ? superAdminItems : schoolWorkspaceItems;

export const isAdminNavItemActive = (pathname: string, item: AdminNavItem) => {
    if (item.end || item.to === '/') return pathname === item.to;
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
};
