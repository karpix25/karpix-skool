import WebApp from '@twa-dev/sdk';

import { openExternalLink } from './externalLinks';


export const openTelegramGroupLink = (url: string | null | undefined) => {
    const link = url?.trim();
    if (!link) return null;

    if (/^https:\/\/t\.me\//i.test(link) && typeof WebApp.openTelegramLink === 'function') {
        WebApp.openTelegramLink(link);
        return true;
    }

    return openExternalLink(link);
};
