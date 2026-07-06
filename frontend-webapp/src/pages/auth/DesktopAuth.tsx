import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { getApiErrorMessage } from '../../services/apiError';
import { Button } from '../../components/ui/button';
import { consumeDesktopAuthToken } from './desktopAuthUrl';

export const DesktopAuth: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const hasConsumedToken = useRef(false);

    useEffect(() => {
        if (hasConsumedToken.current) return;
        hasConsumedToken.current = true;

        const verifyToken = async () => {
            const tokenResult = consumeDesktopAuthToken(location.search);

            if (tokenResult.shouldReplace) {
                navigate({
                    pathname: location.pathname,
                    search: tokenResult.search,
                    hash: location.hash,
                }, { replace: true });
            }

            const { token } = tokenResult;

            if (!token) {
                setStatus('error');
                setError('Токен отсутствует. Пожалуйста, запросите новую ссылку в приложении.');
                return;
            }

            try {
                const response = await api.post('/auth/verify-desktop-token', { token });
                const { access_token } = response.data;

                // Use the login function from AuthContext to set the token and fetch profile
                await login(access_token);

                setStatus('success');
                // Brief pause to show success state
                setTimeout(() => {
                    navigate('/');
                }, 1500);
            } catch (err: unknown) {
                console.error('Desktop auth failed', err);
                setStatus('error');
                setError(getApiErrorMessage(err, 'Не удалось войти в систему. Возможно, ссылка устарела.'));
            }
        };

        verifyToken();
    }, [location.hash, location.pathname, location.search, login, navigate]);

    return (
        <div className="flex min-h-dvh items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/80 bg-card p-6 text-center shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-8">
                {status === 'loading' && (
                    <>
                        <div className="relative mx-auto h-14 w-14">
                            <Loader2 className="h-14 w-14 animate-spin text-primary" />
                            <ShieldCheck className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-primary" />
                        </div>
                        <h1 className="text-2xl font-semibold">Вход в систему...</h1>
                        <p className="text-muted-foreground">Проверяем вашу авторизацию через Telegram</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
                            <ShieldCheck className="h-8 w-8 text-success" />
                        </div>
                        <h1 className="text-2xl font-semibold">Успешный вход</h1>
                        <p className="text-muted-foreground">Сейчас вы будете перенаправлены в личный кабинет</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <h1 className="text-2xl font-semibold text-destructive">Ошибка входа</h1>
                        <p className="text-muted-foreground">{error}</p>
                        <Button onClick={() => navigate('/')} className="w-full">
                            Вернуться на главную
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};
