import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { LayoutDashboard } from 'lucide-react';
import { LevelProgressModal } from './LevelProgressModal';
import { getUserDisplayName, getUserInitials } from '../lib/userDisplay';

export const ProfileHeader: React.FC = () => {
    const {
        user,
        membership,
        canAccessAdminMode,
        setViewMode,
    } = useAuth();
    const [isLevelModalOpen, setIsLevelModalOpen] = React.useState(false);
    const toggleModal = () => setIsLevelModalOpen(!isLevelModalOpen);

    if (!user) return null;

    const displayName = getUserDisplayName(user);
    const initials = getUserInitials(user);
    const level = membership?.level ?? null;

    return (
        <>
            <LevelProgressModal isOpen={isLevelModalOpen} onClose={() => setIsLevelModalOpen(false)} />
            <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur min-[380px]:px-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="rounded-full transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            onClick={toggleModal}
                            aria-label="Открыть прогресс уровня"
                        >
                            <Avatar className="h-11 w-11 rounded-full border border-primary/30">
                                <AvatarImage src={user.avatar_url || undefined} alt={displayName} />
                                <AvatarFallback className="bg-primary/5 text-primary text-lg font-bold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                        </button>
                        <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                                <h1 className="max-w-[160px] truncate text-base font-semibold leading-tight min-[380px]:max-w-[190px]">
                                    {displayName}
                                </h1>
                                {level && (
                                    <button
                                        type="button"
                                        className="shrink-0 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                        onClick={toggleModal}
                                    >
                                        Ур. {level}
                                    </button>
                                )}
                            </div>
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
            </header>
        </>
    );
};
