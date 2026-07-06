export type ShareCopyStatus = 'idle' | 'loading' | 'copied' | 'manual' | 'error';

export const shareLinkStatusLabel: Record<ShareCopyStatus, string> = {
    idle: 'Ссылка',
    loading: 'Готовлю',
    copied: 'Скопировано',
    manual: 'Ссылка готова',
    error: 'Ошибка',
};

export const copyShareLinkUrl = async (url: string, manualLabel: string) => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return 'copied' as const;
    }

    window.prompt(manualLabel, url);
    return 'manual' as const;
};
