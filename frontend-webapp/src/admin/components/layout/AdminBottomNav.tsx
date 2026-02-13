import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Plus, BookOpen, Settings, Shield } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../context/AuthContext';

interface AdminBottomNavProps {
    isOpen?: boolean;
    onPlusClick: () => void;
}

export const AdminBottomNav: React.FC<AdminBottomNavProps> = ({
    onPlusClick
}) => {
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = isSuperAdmin ? [
        { id: '/', label: 'Терминал', icon: Shield },
        { id: '/analytics', label: 'Статистика', icon: LayoutDashboard },
        { id: 'add', label: '', icon: Plus, isFab: true },
        { id: '/students', label: 'Студенты', icon: Users },
        { id: '/courses', label: 'Курсы', icon: BookOpen },
    ] : [
        { id: '/', label: 'Статистика', icon: LayoutDashboard },
        { id: '/students', label: 'Студенты', icon: Users },
        { id: 'add', label: '', icon: Plus, isFab: true },
        { id: '/courses', label: 'Курсы', icon: BookOpen },
        { id: '/settings', label: 'Настройки', icon: Settings },
    ];

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 h-20 bg-card/95 backdrop-blur-lg border-t border-border px-6 flex items-center justify-between pb-6 z-50 md:hidden">
                {tabs.map((tab) => {
                    if (tab.isFab) {
                        return (
                            <div key={tab.id} className="relative flex justify-center">
                                <button
                                    onClick={onPlusClick}
                                    className={cn(
                                        "bg-primary w-13 h-13 rounded-full -mt-10 shadow-lg flex items-center justify-center transition-all active:scale-95 shadow-primary/30 hover:shadow-primary/40",
                                    )}
                                >
                                    <tab.icon className="text-white w-6 h-6" />
                                </button>
                            </div>
                        );
                    }

                    const isActive = location.pathname === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.id)}
                            className={cn(
                                "flex flex-col items-center gap-1 transition-all duration-200",
                                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <tab.icon className="w-6 h-6" />
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </nav>
            {/* Home Indicator Spacer */}
            <div className="fixed bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-slate-400/30 rounded-full z-[60] pointer-events-none md:hidden" />
        </>
    );
};
