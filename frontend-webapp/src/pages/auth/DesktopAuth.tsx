import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

export const DesktopAuth: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const verifyToken = async () => {
            const token = searchParams.get('token');
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
            } catch (err: any) {
                console.error('Desktop auth failed', err);
                setStatus('error');
                setError(err.response?.data?.detail || 'Не удалось войти в систему. Возможно, ссылка устарела.');
            }
        };

        verifyToken();
    }, [searchParams, login, navigate]);

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
            <div className="w-full max-w-md p-8 bg-card rounded-2xl border border-border shadow-xl text-center space-y-6">
                {status === 'loading' && (
                    <>
                        <div className="relative mx-auto w-16 h-16">
                            <Loader2 className="w-16 h-16 text-primary animate-spin" />
                            <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold">Вход в систему...</h1>
                        <p className="text-muted-foreground">Проверяем вашу авторизацию через Telegram</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                            <ShieldCheck className="text-green-500 w-10 h-10" />
                        </div>
                        <h1 className="text-2xl font-bold">Успешный вход!</h1>
                        <p className="text-muted-foreground">Сейчас вы будете перенаправлены в личный кабинет</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                            <AlertCircle className="text-destructive w-10 h-10" />
                        </div>
                        <h1 className="text-2xl font-bold text-destructive">Ошибка входа</h1>
                        <p className="text-muted-foreground">{error}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
                        >
                            Вернуться на главную
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
