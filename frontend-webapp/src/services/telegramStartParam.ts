import type { TelegramInitDataUnsafe } from '../types/telegram';

interface TelegramWebAppLike {
    initDataUnsafe?: TelegramInitDataUnsafe;
}

const START_PARAM_KEYS = ['tgWebAppStartParam', 'startapp'];

const readParam = (source?: string) => {
    if (!source) return undefined;
    const normalized = source.replace(/^[?#]/, '');
    const params = new URLSearchParams(normalized);

    for (const key of START_PARAM_KEYS) {
        const value = params.get(key)?.trim();
        if (value) return value;
    }

    return undefined;
};

export const getTelegramStartParam = (
    webApp?: TelegramWebAppLike,
    search = window.location.search,
    hash = window.location.hash,
) => {
    const startParam = webApp?.initDataUnsafe?.start_param?.trim();
    return startParam || readParam(search) || readParam(hash);
};
