import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { LayoutDashboard } from 'lucide-react';

export const ProfileHeader: React.FC = () => {
    const { user, membership, isAdmin, setViewMode } = useAuth();
    if (!user) return null;

    const currentXp = membership?.xp || 0;
    const level = membership?.level || 1;
    const nextLevelXp = (level + 1) * 1000;
    const prevLevelXp = level * 1000;
    const xpInCurrentLevel = currentXp - prevLevelXp;
    const xpNeededForNext = nextLevelXp - prevLevelXp;
    const progressPercent = Math.min(Math.max((xpInCurrentLevel / xpNeededForNext) * 100, 0), 100);

    return (
        <header className="px-5 pt-6 pb-4 sticky top-0 bg-background/80 backdrop-blur-md z-30 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Avatar className="h-12 w-12 rounded-full border-2 border-primary shadow-sm">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-primary/5 text-primary text-lg font-bold">
                                {user.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-background">
                            Ур. {level}
                        </div>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-tight truncate max-w-[150px]">
                            {user.username || 'Пользователь'}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {user.is_super_admin ? 'Супер Админ' : membership ? 'Ученик' : 'Новый ученик'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => setViewMode('admin')}
                            title="Панель управления"
                        >
                            <LayoutDashboard size={20} />
                        </Button>
                    )}
                </div>
            </div>

            {membership && (
                <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black text-primary uppercase tracking-tight">Прогресс уровня {level}</span>
                        <span className="text-[10px] font-black text-muted-foreground opacity-60 uppercase tracking-widest">{currentXp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</span>
                    </div>
                    <div className="w-full bg-muted/50 h-2.5 rounded-full overflow-hidden p-0.5 border border-border/50">
                        <div
                            className="bg-primary h-full transition-all duration-1000 rounded-full shadow-sm shadow-primary/20"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>
            )}
        </header>
    );
};
