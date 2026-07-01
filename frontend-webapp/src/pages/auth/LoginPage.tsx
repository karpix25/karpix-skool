import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { useNavigate } from 'react-router-dom';
import { TelegramLoginButton } from '../../admin/components/auth/TelegramLoginButton';
import { Shield, Lock } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { getApiErrorMessage } from '../../services/apiError';
import type { WebAppLoginResponse } from '../../types/auth';
import type { TelegramLoginUser } from '../../types/telegram';

const BOT_USERNAME = 'ChickoChickenbot';

export const LoginPage: React.FC = () => {
    const { login, authError, clearAuthError } = useAuth();
    const navigate = useNavigate();
    const [message, setMessage] = useState<string | null>(authError);

    const showMessage = (nextMessage: string | null) => {
        clearAuthError();
        setMessage(nextMessage);
    };

    const handleTelegramAuth = async (user: TelegramLoginUser) => {
        try {
            showMessage(null);
            const response = await api.post<WebAppLoginResponse>('/auth/login/telegram', user);
            await login(response.data.access_token);
            navigate('/');
        } catch (err: unknown) {
            console.error(err);
            showMessage(`Ошибка авторизации: ${getApiErrorMessage(err)}`);
        }
    };

    const handleDevLogin = async () => {
        try {
            showMessage(null);
            const response = await api.post<WebAppLoginResponse>('/auth/dev-login', {
                id: 7777777,
                username: 'DevAdmin'
            });
            await login(response.data.access_token);
            navigate('/');
        } catch (err: unknown) {
            console.error(err);
            showMessage(`Ошибка dev-входа: ${getApiErrorMessage(err)}`);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6 animate-in fade-in duration-700">
            <Card className="max-w-md w-full border border-border/70 shadow-2xl rounded-[32px] overflow-hidden bg-card relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-indigo-600"></div>

                <CardContent className="p-8 md:p-10 text-center space-y-8">
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-primary/10 text-primary rounded-[28px] flex items-center justify-center shadow-inner">
                            <Shield size={40} strokeWidth={2} />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black text-foreground tracking-tight">Вход для админа</h1>
                            <p className="text-foreground/70 text-sm font-medium px-4 leading-relaxed">
                                Войдите через Telegram для управления школами, курсами и студентами.
                            </p>
                        </div>
                    </div>

                    {(message || authError) && (
                        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-left text-sm font-medium text-destructive">
                            {message || authError}
                        </div>
                    )}

                    <div className="flex justify-center py-4">
                        <div className="transform hover:scale-105 transition-transform duration-300">
                            <TelegramLoginButton
                                botName={BOT_USERNAME}
                                onAuth={handleTelegramAuth}
                            />
                        </div>
                    </div>

                    <div className="space-y-6 pt-4">
                        <div className="flex items-center gap-3 justify-center text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                            <Lock size={12} />
                            Защищённое окружение
                        </div>

                        <div className="flex flex-col gap-2 pt-4 border-t border-muted">
                            {/* Deactivated legal links
                        <div className="flex justify-center gap-4">
                            <button onClick={() => navigate('/legal?type=tos')} className="text-[10px] text-muted-foreground/40 hover:text-primary transition-colors">Условия</button>
                            <button onClick={() => navigate('/legal?type=privacy')} className="text-[10px] text-muted-foreground/40 hover:text-primary transition-colors">Конфиденциальность</button>
                        </div>
                        */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
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
