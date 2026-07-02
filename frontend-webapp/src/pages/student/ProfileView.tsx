import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Monitor } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Card } from '../../components/ui/card';
import { AuthorInviteCard } from './components/AuthorInviteCard';

export const ProfileView: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    return (
        <section className="space-y-6 overflow-x-clip">
            <div className="flex items-center gap-4 px-1">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="-ml-2">
                    <ChevronLeft size={20} />
                </Button>
                <h2 className="text-xl font-semibold">Ваш профиль</h2>
            </div>

            <div className="space-y-4">
                <Card className="flex flex-col items-center gap-4 rounded-xl border-border/70 p-5 text-center min-[380px]:p-6">
                    <Avatar className="h-20 w-20 border-2 border-primary/20">
                        <AvatarImage src={user?.avatar_url} />
                        <AvatarFallback>{user?.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold">{user?.username}</h3>
                        <p className="text-sm text-muted-foreground">{user?.first_name} {user?.last_name}</p>
                    </div>
                    <Button variant="destructive" className="mt-4 w-full rounded-lg" onClick={() => { logout(); navigate('/'); }}>
                        Выйти
                    </Button>
                </Card>

                <Card className="space-y-4 rounded-xl border-border/70 p-5 min-[380px]:p-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Monitor size={20} className="text-primary" />
                        </div>
                        <div className="text-left">
                            <h4 className="text-sm font-semibold">Вход с компьютера</h4>
                            <p className="text-xs text-muted-foreground">Получите ссылку для входа в браузере</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        className="w-full rounded-lg"
                        onClick={async () => {
                            try {
                                await api.post('/auth/request-desktop-login');
                                alert('Ссылка для входа отправлена вам в Telegram!');
                            } catch {
                                alert('Не удалось отправить ссылку. Попробуйте позже.');
                            }
                        }}
                    >
                        Отправить ссылку в Telegram
                    </Button>
                </Card>

                <AuthorInviteCard onOpen={() => navigate('/apply')} />

                {/* Deactivated legal section
                    <div className="py-2">
                        <h4 className="text-[11px] font-black text-muted-foreground/50 mb-3 px-1">Правовая информация</h4>
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                className="w-full justify-start h-12 rounded-xl text-sm border-muted hover:bg-muted/50"
                                onClick={() => navigate('/legal?type=tos')}
                            >
                                Условия использования
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start h-12 rounded-xl text-sm border-muted hover:bg-muted/50"
                                onClick={() => navigate('/legal?type=privacy')}
                            >
                                Политика конфиденциальности
                            </Button>
                        </div>
                    </div>
                    */}
            </div>
        </section>
    );
};
