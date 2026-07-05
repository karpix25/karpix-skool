import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { LayoutDashboard } from 'lucide-react';
import { LevelProgressModal } from './LevelProgressModal';
import { getUserDisplayName, getUserInitials } from '../lib/userDisplay';
import { getLevelProgress, thresholdsFromMilestones } from './level/levelProgress';
import { useWebAppLevels } from './level/useWebAppLevels';

export const ProfileHeader: React.FC = () => {
    const {
        user,
        membership,
        canAccessAdminMode,
        isAuthor,
        isPlatformAdmin,
        isTenantManager,
        setViewMode,
        getLevelName,
        activeTenantId,
    } = useAuth();
    const [isLevelModalOpen, setIsLevelModalOpen] = React.useState(false);
    const toggleModal = () => setIsLevelModalOpen(!isLevelModalOpen);
    const { data: levelsData } = useWebAppLevels(!!membership, activeTenantId);

    if (!user) return null;

    const displayName = getUserDisplayName(user);
    const initials = getUserInitials(user);
    const currentXp = membership?.xp || 0;
    const level = membership?.level || 1;
    const thresholds = thresholdsFromMilestones(levelsData?.milestones);
    const progress = getLevelProgress(currentXp, level, thresholds);
    const roleLabel = isPlatformAdmin
        ? 'Платформенный админ'
        : isAuthor
            ? 'Автор'
            : isTenantManager
                ? 'Админ школы'
                : membership
                    ? getLevelName(level)
                    : 'Новый ученик';

    return (
        <>
            <LevelProgressModal isOpen={isLevelModalOpen} onClose={() => setIsLevelModalOpen(false)} />
            <header className="sticky top-0 z-30 space-y-3 border-b border-border/60 bg-background/95 px-4 pb-3 pt-4 backdrop-blur min-[380px]:px-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="relative rounded-full transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            onClick={toggleModal}
                            aria-label="Открыть прогресс уровня"
                        >
                            <Avatar className="h-11 w-11 rounded-full border border-primary/30">
                                <AvatarImage src={user.avatar_url || undefined} alt={displayName} />
                                <AvatarFallback className="bg-primary/5 text-primary text-lg font-bold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 rounded-md border border-background bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                Ур. {level}
                            </div>
                        </button>
                        <div className="min-w-0">
                            <h1 className="max-w-[160px] truncate text-base font-semibold leading-tight min-[380px]:max-w-[190px]">
                                {displayName}
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                {roleLabel}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {canAccessAdminMode && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-colors hover:text-primary"
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
                        className="group cursor-pointer rounded-xl border border-border/70 bg-card p-3 transition-colors hover:bg-muted/20"
                        onClick={toggleModal}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                toggleModal();
                            }
                        }}
                    >
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[11px] font-semibold text-primary transition-colors group-hover:text-primary/80">Прогресс уровня {level}</span>
                            <span className="text-[11px] font-semibold text-muted-foreground">
                                {(currentXp ?? 0).toLocaleString()} / {progress.isMaxLevel ? "MAX" : progress.nextThreshold.toLocaleString()} XP
                            </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full border border-border/60 bg-muted/50">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-700"
                                style={{ width: `${progress.progressPercent}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </header>
        </>
    );
};
