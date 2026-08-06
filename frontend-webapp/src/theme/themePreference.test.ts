import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    applyThemePreference,
    getStoredThemePreference,
    installThemeController,
    resolveThemePreference,
    THEME_PREFERENCE_STORAGE_KEY,
    type ThemeColorScheme,
} from './themePreference';

describe('themePreference', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.className = '';
        delete document.documentElement.dataset.theme;
        delete document.documentElement.dataset.resolvedTheme;
        document.documentElement.style.cssText = '';
        document.body.style.cssText = '';
        vi.clearAllMocks();
    });

    it('stores light as the default preference', () => {
        expect(getStoredThemePreference()).toBe('light');
        expect(localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)).toBe('light');

        localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, 'dark');
        expect(getStoredThemePreference()).toBe('dark');

        localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, 'sepia');
        expect(getStoredThemePreference()).toBe('light');
        expect(localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)).toBe('light');
    });

    it('uses Telegram colorScheme when a Mini App theme is available', () => {
        applyThemePreference('telegram', {
            ownerDocument: document,
            webApp: {
                colorScheme: 'dark',
                initData: 'signed-init-data',
                platform: 'ios',
            },
        });

        expect(document.documentElement).toHaveClass('dark');
        expect(document.documentElement.dataset.theme).toBe('telegram');
        expect(document.documentElement.dataset.resolvedTheme).toBe('dark');
        expect(document.documentElement.style.colorScheme).toBe('dark');
        expect(document.body.style.backgroundColor).toBe('var(--color-background)');
    });

    it('falls back to system theme outside Telegram even when the SDK has a colorScheme', () => {
        const webApp = {
            colorScheme: 'dark',
            initData: '',
            platform: 'unknown',
        };

        expect(resolveThemePreference('telegram', { systemPrefersDark: false, webApp })).toBe('light');
        expect(resolveThemePreference('telegram', { systemPrefersDark: true, webApp })).toBe('dark');
    });

    it('updates the resolved theme when Telegram emits themeChanged', () => {
        let telegramColorScheme: ThemeColorScheme = 'light';
        let handleThemeChanged: (() => void) | undefined;
        const webApp = {
            get colorScheme() {
                return telegramColorScheme;
            },
            initData: 'signed-init-data',
            platform: 'ios',
            onEvent: vi.fn((eventName: 'themeChanged', callback: () => void) => {
                if (eventName === 'themeChanged') {
                    handleThemeChanged = callback;
                }
            }),
            offEvent: vi.fn(),
        };

        localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, 'telegram');
        const cleanup = installThemeController(webApp, {
            ownerDocument: document,
            storage: localStorage,
            window,
        });

        expect(document.documentElement).not.toHaveClass('dark');

        telegramColorScheme = 'dark';
        handleThemeChanged?.();

        expect(document.documentElement).toHaveClass('dark');
        expect(document.documentElement.dataset.resolvedTheme).toBe('dark');

        cleanup();
        expect(webApp.offEvent).toHaveBeenCalledWith('themeChanged', expect.any(Function));
    });
});
