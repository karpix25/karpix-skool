import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Trophy, LayoutDashboard } from 'lucide-react';
import { ProfileHeader } from '../../../components/ProfileHeader';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../context/AuthContext';
import { WelcomeCarousel } from '../components/WelcomeCarousel';
import { ProfileSetup } from '../components/ProfileSetup';
import { useState } from 'react';

export const StudentLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();
    const { pathname } = window.location;
    const { membership, tenant } = useAuth();

    const [onboardingStep, setOnboardingStep] = useState<'CAROUSEL' | 'PROFILE' | 'NONE'>(
        (membership && !membership.is_onboarded) ? 'CAROUSEL' : 'NONE'
    );

    const NavItem = ({ icon: Icon, label, path, active }: any) => (
        <button
            onClick={() => navigate(path)}
            className={cn(
                "flex flex-col items-center gap-1 transition-all duration-200 flex-1",
                active ? "text-primary translate-y-[-2px]" : "text-muted-foreground opacity-60 hover:opacity-100"
            )}
        >
            <Icon size={20} />
            <span className={cn("text-[10px] uppercase tracking-widest font-black", active ? "text-primary" : "")}>{label}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-background text-foreground">
            {onboardingStep === 'CAROUSEL' && (
                <WelcomeCarousel
                    schoolName={tenant?.name || "Наша Школа"}
                    onComplete={() => setOnboardingStep('PROFILE')}
                />
            )}

            {onboardingStep === 'PROFILE' && (
                <ProfileSetup
                    onComplete={() => setOnboardingStep('NONE')}
                />
            )}

            <div className="max-w-4xl mx-auto pb-32">
                <ProfileHeader />
                <main className="px-5 space-y-8">
                    {children}
                    <div className="pt-8 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-40">
                    </div>
                </main>
            </div>

            <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border px-6 py-4 pb-10 z-50">
                <div className="flex justify-around items-center max-w-md mx-auto text-foreground">
                    <NavItem icon={LayoutDashboard} label="Главная" path="/" active={pathname === '/'} />
                    <NavItem icon={BookOpen} label="Курсы" path="/courses" active={pathname === '/courses'} />
                    <NavItem icon={Trophy} label="Рейтинг" path="/leaderboard" active={pathname === '/leaderboard'} />
                </div>
            </nav>
        </div>
    );
};
