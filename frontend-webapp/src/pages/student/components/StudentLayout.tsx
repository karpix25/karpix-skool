import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Trophy, LayoutDashboard, UserRound, type LucideIcon } from 'lucide-react';
import { ProfileHeader } from '../../../components/ProfileHeader';
import { SuperAdminWorkspaceSwitcher } from '../../super-admin/context-switcher/SuperAdminWorkspaceSwitcher';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/client';

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
    const { user, membership, refreshProfile, isAdmin } = useAuth();

    // Auto-complete onboarding silently (name comes from Telegram)
    useEffect(() => {
        // If they have a membership but not onboarded, OR if they are an admin but not onboarded
        const needsSilentOnboarding = (membership && !membership.is_onboarded) || (isAdmin && user && !user.is_onboarded);

        if (needsSilentOnboarding) {
            console.log('StudentLayout: Triggering silent onboarding...');
            api.post('/webapp/onboarding/complete')
                .then(() => {
                    console.log('StudentLayout: Auto-onboarding success');
                    refreshProfile();
                })
                .catch(err => console.error('Auto-onboarding failed:', err));
        }
    }, [membership, isAdmin, user, refreshProfile]);

    return (
        <div className="min-h-dvh overflow-x-clip bg-background text-foreground">
            <SuperAdminWorkspaceSwitcher />
            <div className="mx-auto max-w-4xl pb-[calc(6rem+env(safe-area-inset-bottom))] min-[900px]:max-w-[68rem]">
                <ProfileHeader />
                <main className="space-y-8 px-4 min-[380px]:px-5">
                    {children}
                    <div className="pt-8 text-center text-[10px] font-medium text-muted-foreground opacity-40">
                    </div>
                </main>
            </div>

            <nav
                data-tour="student-nav"
                className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur"
            >
                <div className="mx-auto flex max-w-md items-center justify-around gap-1 text-foreground">
                    <NavItem icon={LayoutDashboard} label="Главная" path="/" active={pathname === '/'} onClick={navigate} />
                    <NavItem icon={BookOpen} label="Курсы" path="/courses" active={pathname === '/courses'} onClick={navigate} />
                    <NavItem icon={Trophy} label="Рейтинг" path="/leaderboard" active={pathname === '/leaderboard'} onClick={navigate} />
                    <NavItem icon={UserRound} label="Профиль" path="/profile" active={pathname === '/profile'} onClick={navigate} />
                </div>
            </nav>
        </div>
    );
};
