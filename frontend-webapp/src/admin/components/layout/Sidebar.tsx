import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, BookOpen, LogOut, Shield, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/button';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { cn } from '../../../lib/utils';

export const Sidebar: React.FC = () => {
    const { logout, isSuperAdmin, setViewMode } = useAuth();

    const navItems = [
        { to: '/', name: 'Dashboard', icon: Home },
        { to: '/students', name: 'Students', icon: Users },
        { to: '/courses', name: 'Courses', icon: BookOpen },
    ];

    if (isSuperAdmin) {
        navItems.push({ to: '/super', name: 'Super Admin', icon: Shield });
    }

    return (
        <aside className="w-72 bg-card border-r border-border flex flex-col h-screen sticky top-0 shadow-sm z-40 animate-in fade-in slide-in-from-left-4 duration-500">
            {/* Logo area */}
            <div className="p-8">
                <div className="flex items-center gap-3.5 group cursor-pointer">
                    <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-all duration-300">
                        <span className="text-white font-black text-2xl tracking-tighter italic">K</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-xl tracking-tight text-foreground uppercase leading-none">Skool</span>
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1 opacity-80 leading-none">Admin Panel</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] px-4 mb-4 opacity-50">Main Navigator</p>
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3.5 px-4 h-12 rounded-2xl text-xs font-black uppercase tracking-widest transition-all group",
                                isActive
                                    ? "bg-primary text-white shadow-xl shadow-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={18} strokeWidth={isActive ? 3 : 2.5} className={cn(isActive ? "text-white" : "text-muted-foreground/40 group-hover:text-foreground transition-colors")} />
                                <span>{item.name}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Profile Section */}
            <div className="p-6 mt-auto">
                <div className="bg-muted/30 rounded-[32px] p-5 space-y-5 border border-transparent hover:border-border transition-all group/sidebar-profile">
                    <div className="flex items-center gap-3.5">
                        <Avatar className="h-10 w-10 rounded-xl ring-2 ring-background shadow-sm">
                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-black">AD</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex flex-col justify-center">
                            <p className="font-black text-xs text-foreground truncate uppercase tracking-widest">Administrator</p>
                            <p className="text-[10px] text-muted-foreground font-bold truncate opacity-50">Local Control</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="w-full h-11 rounded-xl bg-card border hover:bg-muted/50 transition-all text-muted-foreground hover:text-primary active:scale-95"
                            onClick={() => setViewMode('student')}
                            title="Switch to Student View"
                        >
                            <User size={18} />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="w-full h-11 rounded-xl bg-card border hover:bg-muted/50 transition-all text-muted-foreground hover:text-red-500 active:scale-95"
                            onClick={logout}
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </Button>
                    </div>
                </div>
            </div>
        </aside>
    );
};
