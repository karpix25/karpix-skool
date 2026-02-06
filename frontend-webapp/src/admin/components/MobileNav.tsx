import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, BookOpen, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MobileNav: React.FC = () => {
    const { isSuperAdmin } = useAuth();

    const navItems = [
        { to: '/', name: 'Главная', icon: Home },
        { to: '/courses', name: 'Курсы', icon: BookOpen },
        { to: '/students', name: 'Студенты', icon: Users },
    ];

    if (isSuperAdmin) {
        navItems.push({ to: '/super', name: 'Админ', icon: Shield });
    }

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-2 pb-safe">
            <nav className="flex justify-around items-center h-16">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center w-full transition-all duration-200 ${isActive ? 'text-blue-600' : 'text-gray-400'
                            }`
                        }
                    >
                        <item.icon size={22} />
                        <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">
                            {item.name}
                        </span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};
