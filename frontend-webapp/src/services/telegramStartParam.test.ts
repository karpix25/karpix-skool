import { describe, expect, it } from 'vitest';

import { getTelegramStartParam } from './telegramStartParam';

describe('getTelegramStartParam', () => {
    it('prefers Telegram init data start_param', () => {
        expect(
            getTelegramStartParam(
                { initDataUnsafe: { start_param: 'lesson_from_sdk' } },
                '?tgWebAppStartParam=lesson_from_query',
            ),
        ).toBe('lesson_from_sdk');
    });

    it('reads the Mini App GET parameter from direct links', () => {
        expect(
            getTelegramStartParam(undefined, '?tgWebAppStartParam=module_123'),
        ).toBe('module_123');
    });

    it('supports startapp for local direct-open diagnostics', () => {
        expect(getTelegramStartParam(undefined, '?startapp=course_123')).toBe('course_123');
    });

    it('reads hash params when Telegram places data there', () => {
        expect(
            getTelegramStartParam(undefined, '', '#tgWebAppStartParam=lesson_123'),
        ).toBe('lesson_123');
    });
});
