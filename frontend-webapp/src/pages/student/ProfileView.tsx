import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Monitor } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Card } from '../../components/ui/card';

export const ProfileView: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    return (
        <section className="space-y-6">
            <div className="flex items-center gap-4 px-1">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="-ml-2">
                    <ChevronLeft size={20} />
                </Button>
                <h2 className="text-xl font-bold">Ваш профиль</h2>
            </div>

            <div className="space-y-4">
                <Card className="p-6 flex flex-col items-center gap-4 text-center">
                    <Avatar className="h-20 w-20 border-2 border-primary/20">
                        <AvatarImage src={user?.avatar_url} />
                        <AvatarFallback>{user?.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h3 className="font-bold text-lg">{user?.username}</h3>
                        <p className="text-sm text-muted-foreground">{user?.first_name} {user?.last_name}</p>
                    </div>
                    <Button variant="destructive" className="w-full mt-4" onClick={() => { logout(); navigate('/'); }}>
                        Выйти
                    </Button>
                </Card>

                <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Monitor size={20} className="text-primary" />
                        </div>
                        <div className="text-left">
                            <h4 className="font-semibold text-sm">Вход с компьютера</h4>
                            <p className="text-xs text-muted-foreground">Получите ссылку для входа в браузере</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        className="w-full rounded-xl"
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

                {/* Deactivated legal section
                    <div className="py-2">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/50 mb-3 px-1">Правовая информация</h4>
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
