import React from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { useNavigate } from 'react-router-dom';
import { TelegramLoginButton } from '../../admin/components/auth/TelegramLoginButton';
import { Shield, Lock } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const BOT_USERNAME = 'ChickoChickenbot';

export const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleTelegramAuth = async (user: any) => {
        try {
            const response = await api.post('/auth/login/telegram', user);
            login(response.data.access_token);
            navigate('/');
        } catch (err: any) {
            console.error(err);
            alert('Ошибка авторизации: ' + (err.response?.data?.detail || 'Неизвестная ошибка'));
        }
    };

    const handleDevLogin = async () => {
        try {
            const response = await api.post('/auth/dev-login', {
                id: 7777777,
                username: 'DevAdmin'
            });
            login(response.data.access_token);
            navigate('/');
        } catch (err: any) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6 animate-in fade-in duration-700">
            <Card className="max-w-md w-full border-none shadow-2xl rounded-[40px] overflow-hidden bg-card relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-indigo-600"></div>

                <CardContent className="p-10 md:p-12 text-center space-y-10">
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-primary/5 text-primary rounded-[28px] flex items-center justify-center shadow-inner">
                            <Shield size={40} strokeWidth={2} />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">Вход для админа</h1>
                            <p className="text-muted-foreground text-sm font-medium px-4">
                                Войдите через Telegram для управления школами, курсами и студентами.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-center py-4">
                        <div className="transform hover:scale-105 transition-transform duration-300">
                            <TelegramLoginButton
                                botName={BOT_USERNAME}
                                onAuth={handleTelegramAuth}
                            />
                        </div>
                    </div>

                    <div className="space-y-6 pt-4">
                        <div className="flex items-center gap-3 justify-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                            <Lock size={12} />
                            Защищённое окружение
                        </div>

                        <div className="pt-4 border-t border-muted">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 hover:text-primary hover:bg-primary/5 rounded-full"
                                onClick={handleDevLogin}
                            >
                                Dev-вход
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
