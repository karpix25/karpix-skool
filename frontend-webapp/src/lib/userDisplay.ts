import type { WebAppUser } from '../types/auth';

const cleanPart = (value?: string | number | null) => {
    const text = String(value ?? '').trim();
    return text.length > 0 ? text : null;
};

const getFullName = (user?: WebAppUser | null) => (
    [cleanPart(user?.first_name), cleanPart(user?.last_name)].filter(Boolean).join(' ').trim()
);

export const getUserDisplayName = (user?: WebAppUser | null) => (
    cleanPart(user?.username) || getFullName(user) || 'Пользователь'
);

export const getUserSecondaryLabel = (user?: WebAppUser | null) => {
    const fullName = getFullName(user);
    if (cleanPart(user?.username) && fullName) return fullName;

    const telegramId = cleanPart(user?.telegram_id);
    return telegramId ? `Telegram ID ${telegramId}` : 'Telegram профиль';
};

export const getUserInitials = (user?: WebAppUser | null) => {
    const fullName = getFullName(user);
    if (fullName) {
        return fullName
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase();
    }

    const username = cleanPart(user?.username);
    return username ? username.slice(0, 2).toUpperCase() : 'U';
};
