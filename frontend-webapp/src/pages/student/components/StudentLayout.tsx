import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Trophy, LayoutDashboard, Heart, type LucideIcon } from 'lucide-react';
import { SuperAdminWorkspaceSwitcher } from '../../super-admin/context-switcher/SuperAdminWorkspaceSwitcher';
import { cn } from '../../../lib/utils';
import { StudentSchoolHeader } from '../branding/StudentSchoolHeader';
import { getStudentBrandStyle } from '../branding/studentBrandStyle';
import { useAuth } from '../../../context/AuthContext';

interface NavItemProps {
    icon: LucideIcon;
    label: string;
    path: string;
    active: boolean;
    onClick: (path: string) => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, path, active, onClick }) => (
    <button
        type="button"
        onClick={() => onClick(path)}
        className={cn(
            "flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 transition-colors duration-200",
            active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
        aria-current={active ? 'page' : undefined}
    >
        <Icon size={20} />
        <span className={cn("text-[10px] font-semibold leading-none", active && "text-primary")}>{label}</span>
    </button>
);

export const StudentLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { tenant } = useAuth();

    return (
        <div className="min-h-dvh overflow-x-clip bg-background text-foreground" style={getStudentBrandStyle(tenant?.accent_color)}>
            <SuperAdminWorkspaceSwitcher />
            <StudentSchoolHeader />
            <div className="mx-auto w-full max-w-[68rem] pb-[calc(6rem+env(safe-area-inset-bottom))]">
                <main className="space-y-8 px-4 pt-4 min-[380px]:px-5">
                    {children}
                    <div className="pt-8 text-center text-[10px] font-medium text-muted-foreground opacity-40">
                    </div>
                </main>
            </div>

            <nav
                data-tour="student-nav"
                className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur"
            >
                <div className="mx-auto flex max-w-sm items-center justify-around gap-1 text-foreground">
                    <NavItem icon={LayoutDashboard} label="Главная" path="/" active={pathname === '/'} onClick={navigate} />
                    <NavItem icon={BookOpen} label="Курсы" path="/courses" active={pathname === '/courses'} onClick={navigate} />
                    <NavItem icon={Heart} label="Избранное" path="/favorites" active={pathname === '/favorites'} onClick={navigate} />
                    <NavItem icon={Trophy} label="Прогресс" path="/leaderboard" active={pathname === '/leaderboard'} onClick={navigate} />
                </div>
            </nav>
        </div>
    );
};
