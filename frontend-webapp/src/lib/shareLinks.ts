export type ShareCopyStatus = 'idle' | 'loading' | 'copied' | 'manual' | 'error';

export const shareLinkStatusLabel: Record<ShareCopyStatus, string> = {
    idle: 'Ссылка',
    loading: 'Готовлю',
    copied: 'Скопировано',
    manual: 'Ссылка готова',
    error: 'Ошибка',
};

export const copyTextToClipboard = async (text: string) => {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return 'copied' as const;
        }
    } catch (error) {
        console.warn('Clipboard write was blocked by the platform:', error);
    }

    return 'manual' as const;
};

export const copyShareLinkUrl = async (url: string) => copyTextToClipboard(url);
