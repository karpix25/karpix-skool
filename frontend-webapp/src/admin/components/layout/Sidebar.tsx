import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/button';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { cn } from '../../../lib/utils';
import { ThemePreferenceControl } from '../../../theme/ThemePreferenceControl';
import { canManageSchoolOwnershipSettings, getAdminNavItems } from './navigation';

export const Sidebar: React.FC = () => {
    const { activeTenantId, logout, isPlatformAdmin, isSuperAdmin, isTenantManager, membership, setViewMode, viewMode } = useAuth();
    const canManageSchoolSettings = canManageSchoolOwnershipSettings(membership, isSuperAdmin);
    const navItems = getAdminNavItems(isPlatformAdmin, !!activeTenantId, viewMode, canManageSchoolSettings);
    const workspaceLabel = isPlatformAdmin && viewMode === 'super_admin' ? 'Системная консоль' : 'Рабочая область школы';
    const profileLabel = isPlatformAdmin
        ? viewMode === 'admin' ? 'Админ preview' : 'Super Admin'
        : isTenantManager ? 'Менеджер школы' : 'Автор';
    const profileMeta = isPlatformAdmin
        ? activeTenantId ? 'Tenant выбран' : 'Tenant не выбран'
        : isTenantManager ? 'Доступ по роли школы' : 'Авторский доступ';

    return (
        <aside className="w-72 bg-card border-r border-border flex flex-col h-dvh sticky top-0 z-40 animate-in fade-in slide-in-from-left-2 duration-300">
            {/* Logo area */}
            <div className="p-6 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-primary-foreground font-semibold text-xl">K</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-lg text-foreground leading-none">Karpix Skool</span>
                        <span className="text-xs text-muted-foreground mt-1 leading-none">{workspaceLabel}</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground px-3 mb-3">Разделы</p>
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-3 h-11 rounded-lg text-sm font-medium transition-colors group border border-transparent",
                                isActive
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={18} strokeWidth={2.1} className={cn(isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground transition-colors")} />
                                <span>{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Profile Section */}
            <div className="p-4 mt-auto">
                <div className="bg-muted/30 rounded-lg p-4 space-y-4 border border-border/60">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 rounded-lg ring-1 ring-background shadow-sm">
                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">AD</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex flex-col justify-center">
                            <p className="font-semibold text-sm text-foreground truncate">{profileLabel}</p>
                            <p className="text-xs text-muted-foreground truncate">{profileMeta}</p>
                        </div>
                    </div>

                    <ThemePreferenceControl compact />

                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="w-full h-10 rounded-lg bg-card border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-primary"
                            onClick={() => setViewMode('student')}
                            aria-label="Перейти в режим студента"
                            title="Режим студента"
                        >
                            <User size={18} />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="w-full h-10 rounded-lg bg-card border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-destructive"
                            onClick={logout}
                            aria-label="Выйти из аккаунта"
                            title="Выход"
                        >
                            <LogOut size={18} />
                        </Button>
                    </div>
                </div>
            </div>
        </aside>
    );
};
