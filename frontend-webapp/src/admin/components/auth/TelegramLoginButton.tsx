import React, { useEffect } from 'react';

interface TelegramUser {
    id: number;
    first_name: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

interface Props {
    botName: string;
    onAuth: (user: TelegramUser) => void;
    buttonSize?: 'large' | 'medium' | 'small';
    cornerRadius?: number;
    requestAccess?: 'write';
}

export const TelegramLoginButton: React.FC<Props> = ({
    botName,
    onAuth,
    buttonSize = 'large',
    cornerRadius = 5,
    requestAccess = 'write',
}) => {
    useEffect(() => {
        // 1. Define Callback function on window
        const callbackName = 'onTelegramAuth';
        (window as any)[callbackName] = (user: TelegramUser) => {
            onAuth(user);
        };

        // 2. Create Script
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', botName);
        script.setAttribute('data-size', buttonSize);
        script.setAttribute('data-radius', cornerRadius.toString());
        script.setAttribute('data-request-access', requestAccess);
        script.setAttribute('data-onauth', `${callbackName}(user)`);
        script.setAttribute('data-userpic', 'false');

        // 3. Mount
        const container = document.getElementById('telegram-login-container');
        if (container) {
            container.innerHTML = '';
            container.appendChild(script);
        }
    }, [botName, onAuth, buttonSize, cornerRadius, requestAccess]);

    return <div id="telegram-login-container" className="flex justify-center" />;
};
