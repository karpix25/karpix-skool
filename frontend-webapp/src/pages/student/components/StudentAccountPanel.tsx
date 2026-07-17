import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Monitor } from 'lucide-react';

import api from '../../../api/client';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { useAuth } from '../../../context/AuthContext';
import { getUserDisplayName, getUserInitials, getUserSecondaryLabel } from '../../../lib/userDisplay';
import { ThemePreferenceControl } from '../../../theme/ThemePreferenceControl';
import { AuthorInviteCard } from './AuthorInviteCard';

export const StudentAccountPanel: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const displayName = getUserDisplayName(user);
    const secondaryLabel = getUserSecondaryLabel(user);
    const initials = getUserInitials(user);

    const requestDesktopLogin = async () => {
        try {
            await api.post('/auth/request-desktop-login');
            alert('Ссылка для входа отправлена вам в Telegram!');
        } catch {
            alert('Не удалось отправить ссылку. Попробуйте позже.');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <section id="account" className="space-y-4" aria-label="Аккаунт">
            <div className="px-1">
                <p className="text-[11px] font-semibold text-muted-foreground">Аккаунт</p>
                <h2 className="text-lg font-semibold">Настройки входа</h2>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Card className="rounded-xl border-border/70 p-5">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 border border-primary/20">
                            <AvatarImage src={user?.avatar_url || undefined} alt={displayName} />
                            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <h3 className="truncate text-base font-semibold">{displayName}</h3>
                            <p className="truncate text-sm text-muted-foreground">{secondaryLabel}</p>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Button variant="outline" className="h-11 justify-start rounded-lg" onClick={requestDesktopLogin}>
                            <Monitor size={17} />
                            Вход с компьютера
                        </Button>
                        <Button variant="destructive" className="h-11 justify-start rounded-lg" onClick={handleLogout}>
                            <LogOut size={17} />
                            Выйти
                        </Button>
                    </div>
                </Card>

                <div className="space-y-4">
                    <Card className="rounded-xl border-border/70 p-5">
                        <ThemePreferenceControl />
                    </Card>
                    <AuthorInviteCard onOpen={() => navigate('/apply')} />
                </div>
            </div>
        </section>
    );
};
