import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../context/AuthContext';
import { canManageSchoolOwnershipSettings, getAdminNavItems, isAdminNavItemActive } from './navigation';

export const AdminBottomNav: React.FC = () => {
    const { activeTenantId, isPlatformAdmin, isSuperAdmin, membership, viewMode } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const canManageSchoolSettings = canManageSchoolOwnershipSettings(membership, isSuperAdmin);
    const tabs = getAdminNavItems(isPlatformAdmin, !!activeTenantId, viewMode, canManageSchoolSettings);

    return (
        <nav
            data-tour="admin-nav"
            className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-lg md:hidden"
        >
            {tabs.map((tab) => {
                const isActive = isAdminNavItemActive(location.pathname, tab);
                return (
                    <button
                        key={tab.to}
                        type="button"
                        onClick={() => navigate(tab.to)}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={tab.label}
                        className={cn(
                            "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <tab.icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
                        <span className="max-w-full truncate text-[11px] font-medium leading-tight">{tab.shortLabel || tab.label}</span>
                    </button>
                );
            })}
        </nav>
    );
};
