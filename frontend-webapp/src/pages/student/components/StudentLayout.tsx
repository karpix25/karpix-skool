import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, Trophy, User } from 'lucide-react';
import { ProfileHeader } from '../../../components/ProfileHeader';
import { cn } from '../../../lib/utils';

export const StudentLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const { pathname } = window.location;

    const NavItem = ({ icon: Icon, label, path, active }: any) => (
        <button
            onClick={() => navigate(path)}
            className={cn(
                "flex flex-col items-center gap-1 transition-all duration-200",
                active ? "text-primary translate-y-[-2px]" : "text-muted-foreground opacity-60 hover:opacity-100"
            )}
        >
            <Icon size={20} />
            <span className={cn("text-[10px]", active ? "font-bold" : "font-medium")}>{label}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-4xl mx-auto pb-32">
                <ProfileHeader />
                <main className="px-5 space-y-8 mt-4">
                    {children}
                    <div className="pt-8 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-40">
                        POWERED BY SKOOL
                    </div>
                </main>
            </div>

            <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border px-6 py-2 pb-8 z-50">
                <div className="flex justify-between items-center max-w-md mx-auto text-foreground">
                    <NavItem icon={LayoutDashboard} label="Home" path="/" active={pathname === '/'} />
                    <NavItem icon={BookOpen} label="Courses" path="/courses" active={pathname === '/courses'} />
                    <NavItem icon={Users} label="Community" path="/community" active={pathname === '/community'} />
                    <NavItem icon={Trophy} label="Stats" path="/leaderboard" active={pathname === '/leaderboard'} />
                    <NavItem icon={User} label="Profile" path="/profile" active={pathname === '/profile'} />
                </div>
            </nav>
        </div>
    );
};
