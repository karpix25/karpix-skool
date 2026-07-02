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
        <div className="flex min-h-dvh items-center justify-center bg-background p-4 animate-in fade-in duration-500 sm:p-6">
            <Card className="w-full max-w-md overflow-hidden border-border/80 bg-card">
                <CardContent className="space-y-6 p-6 text-center sm:p-8">
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Shield size={30} strokeWidth={2} />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-semibold tracking-normal text-foreground">Вход для админа</h1>
                            <p className="px-2 text-sm leading-6 text-muted-foreground">
                                Войдите через Telegram для управления школами, курсами и студентами.
                            </p>
                        </div>
                    </div>

                    {(message || authError) && (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-left text-sm font-medium text-destructive">
                            {message || authError}
                        </div>
                    )}

                    <div className="flex justify-center py-6">
                        <TelegramLoginButton
                            botName={BOT_USERNAME}
                            onAuth={handleTelegramAuth}
                        />
                    </div>

                    <div className="space-y-5 border-t border-border/70 pt-5">
                        <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
                            <Lock size={12} />
                            Защищённое окружение
                        </div>

                        <div className="flex flex-col gap-2">
                            {/* Deactivated legal links
                        <div className="flex justify-center gap-4">
                            <button onClick={() => navigate('/legal?type=tos')} className="text-[10px] text-muted-foreground/40 hover:text-primary transition-colors">Условия</button>
                            <button onClick={() => navigate('/legal?type=privacy')} className="text-[10px] text-muted-foreground/40 hover:text-primary transition-colors">Конфиденциальность</button>
                        </div>
                        */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs font-medium text-muted-foreground hover:text-primary"
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
