import React from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';
import { TelegramLoginButton } from '../components/TelegramLoginButton';

const BOT_USERNAME = 'ChickoChickenbot' as string; // User needs to change this!

export const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleTelegramAuth = async (user: any) => {
        try {
            // Call backend to validate hash and get JWT
            const response = await api.post('/auth/login/telegram', user);
            login(response.data.access_token, response.data.is_super_admin);
            navigate('/');
        } catch (err: any) {
            console.error(err);
            alert('Ошибка аутентификации: ' + (err.response?.data?.detail || 'Неизвестная ошибка'));
        }
    };

    const handleDevLogin = async () => {
        alert('Dev Login: Попытка обхода...');
        try {
            const response = await api.post('/auth/dev-login', {
                id: 7777777,
                username: 'DevAdmin'
            });
            alert('Dev Login: Успешно! Перенаправление...');
            login(response.data.access_token, response.data.is_super_admin);
            navigate('/');
        } catch (err: any) {
            console.error(err);
            alert('Dev Login не удался: ' + (err.response?.data?.detail || err.message));
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md w-96 text-center">
                <h2 className="text-2xl font-bold mb-6">Вход для админа</h2>
                <p className="text-gray-500 mb-6">Войдите через Telegram, чтобы управлять своей школой.</p>

                {BOT_USERNAME === 'BOT_USERNAME_HERE' ? (
                    <div className="bg-yellow-100 text-yellow-800 p-4 rounded text-sm mb-4">
                        ⚠️ <span className="font-bold">Требуется настройка:</span><br />
                        Пожалуйста, откройте <code>src/pages/LoginPage.tsx</code> и установите <code>BOT_USERNAME</code> вашего бота.
                    </div>
                ) : (
                    <TelegramLoginButton
                        botName={BOT_USERNAME}
                        onAuth={handleTelegramAuth}
                    />
                )}

                <div className="mt-8 border-t pt-4">
                    <button
                        onClick={handleDevLogin}
                        className="text-gray-500 hover:text-gray-700 text-sm underline"
                    >
                        (Только для разработки) Обход входа
                    </button>
                </div>
            </div>
        </div>
    );
};
