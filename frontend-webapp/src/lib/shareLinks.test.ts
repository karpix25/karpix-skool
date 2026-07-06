import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyShareLinkUrl, copyTextToClipboard } from './shareLinks';

const setClipboard = (writeText?: ReturnType<typeof vi.fn>) => {
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: writeText ? { writeText } : undefined,
    });
};

describe('share link clipboard helpers', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns copied when clipboard write succeeds', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        setClipboard(writeText);

        await expect(copyTextToClipboard('hello')).resolves.toBe('copied');
        expect(writeText).toHaveBeenCalledWith('hello');
    });

    it('returns manual when clipboard is unavailable', async () => {
        setClipboard();

        await expect(copyShareLinkUrl('https://t.me/bot/app?startapp=lesson_1')).resolves.toBe('manual');
    });

    it('returns manual when the platform blocks clipboard write', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const writeText = vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
        setClipboard(writeText);

        await expect(copyShareLinkUrl('https://t.me/bot/app?startapp=lesson_1')).resolves.toBe('manual');

        expect(writeText).toHaveBeenCalledOnce();
        warnSpy.mockRestore();
    });
});
