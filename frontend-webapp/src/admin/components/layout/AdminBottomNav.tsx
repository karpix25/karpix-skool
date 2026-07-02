import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../context/AuthContext';
import { getAdminNavItems, isAdminNavItemActive } from './navigation';

export const AdminBottomNav: React.FC = () => {
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const tabs = getAdminNavItems(isSuperAdmin);

    return (
        <nav
            data-tour="admin-nav"
            className="fixed bottom-0 left-0 right-0 min-h-20 bg-card/95 backdrop-blur-lg border-t border-border px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 flex items-center justify-between z-50 md:hidden"
        >
            {tabs.map((tab) => {
                const isActive = isAdminNavItemActive(location.pathname, tab);
                return (
                    <button
                        key={tab.to}
                        type="button"
                        onClick={() => navigate(tab.to)}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                            "min-h-12 min-w-0 flex-1 flex flex-col items-center justify-center gap-1 rounded-lg px-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <tab.icon className="h-5 w-5" strokeWidth={2.1} />
                        <span className="max-w-full truncate text-[11px] font-medium">{tab.label}</span>
                    </button>
                );
            })}
        </nav>
    );
};
