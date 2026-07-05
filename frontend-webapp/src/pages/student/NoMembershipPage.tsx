import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RefreshCw, Send, ShieldAlert } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { getUserDisplayName, getUserInitials, getUserSecondaryLabel } from '../../lib/userDisplay';

export const NoMembershipPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, tenant, refreshProfile, logout } = useAuth();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const displayName = getUserDisplayName(user);
    const initials = getUserInitials(user);
    const secondaryLabel = getUserSecondaryLabel(user);
    const tenantName = tenant?.name?.trim();
    const hasLinkedGroup = !!(tenant?.telegram_group_id || tenant?.telegram_group_id_vip);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refreshProfile(tenant?.id || undefined);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground">
            <main className="w-full max-w-md space-y-5">
                <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] min-[380px]:p-6">
                    <div className="flex items-center gap-3 border-b border-border/70 pb-4">
                        <Avatar className="h-12 w-12 border border-primary/20">
                            <AvatarImage src={user?.avatar_url || undefined} alt={displayName} />
                            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="truncate text-base font-semibold">{displayName}</p>
                            <p className="truncate text-xs text-muted-foreground">{secondaryLabel}</p>
                        </div>
                    </div>

                    <div className="space-y-4 pt-5 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                            <ShieldAlert size={28} />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-semibold leading-tight">Доступ к школе не открыт</h1>
                            <p className="text-sm leading-6 text-muted-foreground">
                                {tenantName
                                    ? `Мы не нашли активное членство в Telegram-группе школы «${tenantName}».`
                                    : 'Мы не нашли активное членство в подключенной школе.'}
                            </p>
                            <p className="text-xs leading-5 text-muted-foreground">
                                {hasLinkedGroup
                                    ? 'После вступления в группу обновите доступ.'
                                    : 'Попросите администратора школы прислать актуальную ссылку доступа.'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-2">
                        <Button className="h-12 rounded-lg" onClick={handleRefresh} disabled={isRefreshing}>
                            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                            Обновить доступ
                        </Button>
                        <Button variant="outline" className="h-12 rounded-lg" onClick={() => navigate('/apply')}>
                            <Send size={16} />
                            Подать заявку автора
                        </Button>
                        <Button variant="ghost" className="h-12 rounded-lg text-muted-foreground" onClick={handleLogout}>
                            <LogOut size={16} />
                            Выйти
                        </Button>
                    </div>
                </section>
            </main>
        </div>
    );
};
