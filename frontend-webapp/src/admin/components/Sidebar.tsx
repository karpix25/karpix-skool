import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, BookOpen, Settings, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
    const { logout, isSuperAdmin } = useAuth();

    const navItems = [
        { to: '/', name: 'Панель управления', icon: Home },
        { to: '/students', name: 'Студенты', icon: Users },
        { to: '/courses', name: 'Курсы', icon: BookOpen },
        { to: '/student-preview', name: 'Режим ученика', icon: Users },
    ];

    if (isSuperAdmin) {
        navItems.push({ to: '/super', name: 'Админ системы', icon: Shield });
    }

    return (
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            {/* Logo */}
            <div className="p-8 pb-10">
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-300">
                        <span className="text-white font-black text-2xl italic leading-none select-none">K</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-xl tracking-tight text-gray-900 uppercase leading-none">
                            Skool
                        </span>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mt-0.5 leading-none">
                            Панель админа
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1.5">
                <div className="px-4 mb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Главное меню</div>
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${isActive
                                ? 'bg-blue-600 text-white shadow-xl shadow-blue-100'
                                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-900'} />
                                {item.name}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Profile Section */}
            <div className="p-6 mt-auto">
                <div className="bg-gray-50 rounded-3xl p-4 space-y-4 border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                            <Users size={20} className="text-gray-500" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-black text-xs text-gray-900 truncate">Администратор</span>
                            <span className="text-[10px] text-gray-400 font-bold truncate">Управление школой</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button className="flex items-center justify-center p-2.5 bg-white rounded-xl text-gray-400 hover:text-blue-600 hover:shadow-sm border border-transparent hover:border-blue-50 transition-all">
                            <Settings size={18} />
                        </button>
                        <button
                            onClick={logout}
                            className="flex items-center justify-center p-2.5 bg-white rounded-xl text-gray-400 hover:text-red-500 hover:shadow-sm border border-transparent hover:border-red-50 transition-all"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
};
