import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { LayoutDashboard } from 'lucide-react';
import { LevelProgressModal } from './LevelProgressModal';

export const ProfileHeader: React.FC = () => {
    const { user, membership, isAdmin, setViewMode, getLevelName } = useAuth();
    if (!user) return null;

    const toggleModal = () => setIsLevelModalOpen(!isLevelModalOpen);

    const [isLevelModalOpen, setIsLevelModalOpen] = React.useState(false);

    // LEVEL THRESHOLDS (Must match backend)
    const LEVEL_THRESHOLDS: Record<number, number> = {
        1: 0,
        2: 100,
        3: 300,
        4: 800,
        5: 2000,
        6: 3000,
        7: 5000,
        8: 7500,
        9: 10000
    };

    const currentXp = membership?.xp || 0;
    const level = membership?.level || 1;
    const nextLevel = Math.min(level + 1, 9);

    const prevThreshold = LEVEL_THRESHOLDS[level] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[nextLevel] || 10000;

    // Progress relative to current level bracket
    const xpInLevel = Math.max(0, currentXp - prevThreshold);
    const xpNeededForLevel = Math.max(1, nextThreshold - prevThreshold);
    const progressPercent = level >= 9 ? 100 : Math.min(Math.max((xpInLevel / xpNeededForLevel) * 100, 0), 100);

    return (
        <>
            <LevelProgressModal isOpen={isLevelModalOpen} onClose={() => setIsLevelModalOpen(false)} />
            <header className="px-5 pt-6 pb-4 sticky top-0 bg-background/80 backdrop-blur-md z-30 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative cursor-pointer hover:opacity-80 transition-opacity" onClick={toggleModal}>
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
                                {user.is_super_admin ? 'Супер Админ' : membership ? getLevelName(level) : 'Новый ученик'}
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
                    <div
                        className="bg-muted/30 p-4 rounded-2xl border border-border/50 shadow-sm cursor-pointer hover:bg-muted/40 transition-colors group"
                        onClick={toggleModal}
                    >
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-black text-primary uppercase tracking-tight group-hover:text-primary/80 transition-colors">Прогресс уровня {level}</span>
                            <span className="text-[10px] font-black text-muted-foreground opacity-60 uppercase tracking-widest">
                                {(currentXp ?? 0).toLocaleString()} / {level >= 9 ? "MAX" : (nextThreshold ?? 10000).toLocaleString()} XP
                            </span>
                        </div>
                        <div className="w-full bg-muted/50 h-2.5 rounded-full overflow-hidden p-0.5 border border-border/50">
                            <div
                                className="bg-primary h-full transition-all duration-1000 rounded-full shadow-sm shadow-primary/20 group-hover:shadow-primary/40"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </header>
        </>
    );
};
