import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, BookOpen, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export const MobileNav: React.FC = () => {
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { id: '/', text: 'Главная', Icon: Home },
        { id: '/courses', text: 'Курсы', Icon: BookOpen },
        { id: '/students', text: 'Студенты', Icon: Users },
    ];

    if (isSuperAdmin) {
        tabs.push({ id: '/super', text: 'Админ', Icon: Shield });
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-area-inset-bottom md:hidden z-50">
            <div className="flex justify-around items-center h-16">
                {tabs.map(({ id, text, Icon }) => {
                    const isActive = location.pathname === id;
                    return (
                        <button
                            key={id}
                            onClick={() => navigate(id)}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">{text}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
