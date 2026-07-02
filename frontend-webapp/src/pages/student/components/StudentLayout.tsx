import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Trophy, LayoutDashboard, UserRound, type LucideIcon } from 'lucide-react';
import { ProfileHeader } from '../../../components/ProfileHeader';
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
            "flex flex-1 flex-col items-center gap-1 transition-colors duration-200",
            active ? "text-primary" : "text-muted-foreground opacity-70 hover:opacity-100"
        )}
        aria-current={active ? 'page' : undefined}
    >
        <Icon size={20} />
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", active && "text-primary")}>{label}</span>
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
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-4xl mx-auto pb-32">
                <ProfileHeader />
                <main className="px-5 space-y-8">
                    {children}
                    <div className="pt-8 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-40">
                    </div>
                </main>
            </div>

            <nav
                data-tour="student-nav"
                className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-lg"
            >
                <div className="flex justify-around items-center max-w-md mx-auto text-foreground">
                    <NavItem icon={LayoutDashboard} label="Главная" path="/" active={pathname === '/'} onClick={navigate} />
                    <NavItem icon={BookOpen} label="Курсы" path="/courses" active={pathname === '/courses'} onClick={navigate} />
                    <NavItem icon={Trophy} label="Рейтинг" path="/leaderboard" active={pathname === '/leaderboard'} onClick={navigate} />
                    <NavItem icon={UserRound} label="Профиль" path="/profile" active={pathname === '/profile'} onClick={navigate} />
                </div>
            </nav>
        </div>
    );
};
