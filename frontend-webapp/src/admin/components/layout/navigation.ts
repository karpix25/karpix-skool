import { BookOpen, LayoutDashboard, Settings, Shield, UserCog, Users, type LucideIcon } from 'lucide-react';

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
    { to: '/team', label: 'Команда', shortLabel: 'Ком.', icon: UserCog },
    { to: '/settings', label: 'Настройки', shortLabel: 'Настр.', icon: Settings },
];

const platformAdminItems: AdminNavItem[] = [
    { to: '/', label: 'Консоль', icon: Shield, end: true },
    { to: '/analytics', label: 'Обзор', icon: LayoutDashboard, end: true },
];

const platformAdminSchoolItems: AdminNavItem[] = [
    ...platformAdminItems,
    { to: '/courses', label: 'Контент', icon: BookOpen },
    { to: '/students', label: 'Студенты', icon: Users },
    { to: '/team', label: 'Команда', shortLabel: 'Ком.', icon: UserCog },
    { to: '/settings', label: 'Настройки', shortLabel: 'Настр.', icon: Settings },
];

export const getAdminNavItems = (isPlatformAdmin: boolean, hasActiveTenant = false) => {
    if (!isPlatformAdmin) return schoolWorkspaceItems;
    return hasActiveTenant ? platformAdminSchoolItems : platformAdminItems;
};

export const isAdminNavItemActive = (pathname: string, item: AdminNavItem) => {
    if (item.end || item.to === '/') return pathname === item.to;
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
};
