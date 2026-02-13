import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Bell, LogOut, LayoutDashboard } from 'lucide-react';

export const ProfileHeader: React.FC = () => {
    const { user, membership, logout, isAdmin, setViewMode } = useAuth();
    if (!user) return null;

    const level = membership?.level || 1;

    return (
        <header className="px-5 pt-6 pb-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-30">
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

                <button className="w-10 h-10 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:text-primary transition-colors">
                    <Bell size={20} />
                </button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => { if (confirm('Выйти?')) logout(); }}
                >
                    <LogOut size={20} />
                </Button>
            </div>
        </header>
    );
};

