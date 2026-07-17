import { useCallback, useEffect, useState } from 'react';

import {
    getStoredThemePreference,
    setStoredThemePreference,
    THEME_PREFERENCE_CHANGED_EVENT,
    THEME_PREFERENCE_STORAGE_KEY,
    type ResolvedTheme,
    type ThemePreference,
} from './themePreference';

interface ThemePreferenceState {
    preference: ThemePreference;
    resolvedTheme: ResolvedTheme;
}

const readThemeState = (): ThemePreferenceState => ({
    preference: getStoredThemePreference(),
    resolvedTheme: document.documentElement.dataset.resolvedTheme === 'dark' ? 'dark' : 'light',
});

export const useThemePreference = () => {
    const [themeState, setThemeState] = useState<ThemePreferenceState>(readThemeState);

    useEffect(() => {
        const syncThemeState = () => setThemeState(readThemeState());
        const handleStorage = (event: StorageEvent) => {
            if (event.key === THEME_PREFERENCE_STORAGE_KEY) {
                syncThemeState();
            }
        };

        window.addEventListener(THEME_PREFERENCE_CHANGED_EVENT, syncThemeState);
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener(THEME_PREFERENCE_CHANGED_EVENT, syncThemeState);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    const setPreference = useCallback((preference: ThemePreference) => {
        setStoredThemePreference(preference);
        setThemeState(readThemeState());
    }, []);

    return {
        ...themeState,
        setPreference,
    };
};
