import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, Settings, Shield } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../context/AuthContext';

export const AdminBottomNav: React.FC = () => {
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = isSuperAdmin ? [
        { id: '/', label: 'Терминал', icon: Shield },
        { id: '/analytics', label: 'Статистика', icon: LayoutDashboard },
        { id: '/students', label: 'Студенты', icon: Users },
        { id: '/courses', label: 'Курсы', icon: BookOpen },
        { id: '/settings', label: 'Настройки', icon: Settings },
    ] : [
        { id: '/', label: 'Статистика', icon: LayoutDashboard },
        { id: '/students', label: 'Студенты', icon: Users },
        { id: '/courses', label: 'Курсы', icon: BookOpen },
        { id: '/settings', label: 'Настройки', icon: Settings },
    ];

    return (
        <>
            <nav
                data-tour="admin-nav"
                className="fixed bottom-0 left-0 right-0 min-h-20 bg-card/95 backdrop-blur-lg border-t border-border px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 flex items-center justify-between z-50 md:hidden"
            >
                {tabs.map((tab) => {
                    const isActive = location.pathname === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => navigate(tab.id)}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                "min-h-11 min-w-0 flex-1 flex flex-col items-center justify-center gap-1 rounded-xl px-1 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <tab.icon className="w-6 h-6" />
                            <span className="max-w-full truncate text-[10px] font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </nav>
            {/* Home Indicator Spacer */}
            <div className="fixed bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-slate-400/30 rounded-full z-[60] pointer-events-none md:hidden" />
        </>
    );
};
