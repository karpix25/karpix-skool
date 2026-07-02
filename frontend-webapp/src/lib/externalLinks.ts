const SAFE_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'tg:']);
const EXTERNAL_WINDOW_FEATURES = 'noopener,noreferrer';

export const externalLinkRel = 'noopener noreferrer';

export const getSafeExternalUrl = (url: string | null | undefined) => {
    const trimmedUrl = url?.trim();
    if (!trimmedUrl) return null;

    try {
        const parsedUrl = new URL(trimmedUrl, window.location.origin);
        return SAFE_EXTERNAL_PROTOCOLS.has(parsedUrl.protocol) ? parsedUrl.href : null;
    } catch {
        return null;
    }
};

export const openExternalLink = (url: string | null | undefined) => {
    const safeUrl = getSafeExternalUrl(url);
    if (!safeUrl) return null;

    const openedWindow = window.open(safeUrl, '_blank', EXTERNAL_WINDOW_FEATURES);
    try {
        if (openedWindow) openedWindow.opener = null;
    } catch {
        // Some browsers expose a guarded WindowProxy for cross-origin tabs.
    }

    return openedWindow;
};
