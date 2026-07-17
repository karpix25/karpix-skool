export type ThemePreference = 'light' | 'dark' | 'system' | 'telegram';
export type ResolvedTheme = 'light' | 'dark';
export type ThemeColorScheme = 'light' | 'dark';

export const THEME_PREFERENCE_STORAGE_KEY = 'karpix-theme-preference';
export const THEME_PREFERENCE_CHANGED_EVENT = 'karpix-theme-preference-changed';

const DEFAULT_THEME_PREFERENCE: ThemePreference = 'telegram';
const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system', 'telegram'];

interface TelegramThemeSource {
    colorScheme?: ThemeColorScheme;
    initData?: string;
    initDataUnsafe?: { user?: unknown };
    platform?: string;
    onEvent?: (eventName: 'themeChanged', callback: () => void) => void;
    offEvent?: (eventName: 'themeChanged', callback: () => void) => void;
}

interface ThemeEnvironment {
    matchMedia?: (query: string) => MediaQueryList;
    ownerDocument?: Document;
    storage?: Storage | null;
    window?: Window;
}

interface ResolveThemeOptions {
    systemPrefersDark?: boolean;
    webApp?: unknown;
}

interface ApplyThemeOptions extends ThemeEnvironment {
    webApp?: unknown;
}

const isThemePreference = (value: string | null): value is ThemePreference => (
    THEME_PREFERENCES.includes(value as ThemePreference)
);

const asTelegramThemeSource = (webApp: unknown): TelegramThemeSource => (
    typeof webApp === 'object' && webApp !== null ? webApp as TelegramThemeSource : {}
);

const getBrowserStorage = () => {
    if (typeof window === 'undefined') return null;

    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

const getBrowserWindow = () => (typeof window === 'undefined' ? undefined : window);

const readStorageItem = (storage: Storage | null, key: string) => {
    try {
        return storage?.getItem(key) ?? null;
    } catch {
        return null;
    }
};

const writeStorageItem = (storage: Storage | null, key: string, value: string) => {
    try {
        storage?.setItem(key, value);
    } catch {
        // Theme resolution should keep working even when storage is unavailable.
    }
};

const getOwnerDocument = (environment?: ThemeEnvironment) => (
    environment?.ownerDocument ?? (typeof document === 'undefined' ? undefined : document)
);

const getSystemPrefersDark = (environment?: ThemeEnvironment) => {
    const matchMedia = environment?.matchMedia ?? getBrowserWindow()?.matchMedia;
    return Boolean(matchMedia?.('(prefers-color-scheme: dark)').matches);
};

const canUseTelegramTheme = (webApp: unknown) => {
    const source = asTelegramThemeSource(webApp);
    return Boolean(
        source.initData ||
        source.initDataUnsafe?.user ||
        (source.platform && source.platform !== 'unknown')
    );
};

export const getStoredThemePreference = (
    storage: Storage | null = getBrowserStorage(),
): ThemePreference => {
    const storedPreference = readStorageItem(storage, THEME_PREFERENCE_STORAGE_KEY);
    if (isThemePreference(storedPreference)) {
        return storedPreference;
    }

    writeStorageItem(storage, THEME_PREFERENCE_STORAGE_KEY, DEFAULT_THEME_PREFERENCE);
    return DEFAULT_THEME_PREFERENCE;
};

export const setStoredThemePreference = (
    preference: ThemePreference,
    environment?: ThemeEnvironment,
) => {
    const storage = environment?.storage ?? getBrowserStorage();
    writeStorageItem(storage, THEME_PREFERENCE_STORAGE_KEY, preference);

    const targetWindow = environment?.window ?? getBrowserWindow();
    targetWindow?.dispatchEvent(new CustomEvent(THEME_PREFERENCE_CHANGED_EVENT, {
        detail: { preference },
    }));
};

export const resolveThemePreference = (
    preference: ThemePreference,
    options?: ResolveThemeOptions,
): ResolvedTheme => {
    if (preference === 'light' || preference === 'dark') {
        return preference;
    }

    if (preference === 'telegram') {
        const telegramSource = asTelegramThemeSource(options?.webApp);
        if (canUseTelegramTheme(telegramSource) && telegramSource.colorScheme) {
            return telegramSource.colorScheme;
        }
    }

    return options?.systemPrefersDark ? 'dark' : 'light';
};

export const applyThemePreference = (
    preference: ThemePreference,
    options?: ApplyThemeOptions,
): ResolvedTheme => {
    const ownerDocument = getOwnerDocument(options);
    const resolvedTheme = resolveThemePreference(preference, {
        systemPrefersDark: getSystemPrefersDark(options),
        webApp: options?.webApp,
    });

    if (!ownerDocument) {
        return resolvedTheme;
    }

    const root = ownerDocument.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.dataset.theme = preference;
    root.dataset.resolvedTheme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    ownerDocument.body.style.backgroundColor = 'var(--color-background)';

    return resolvedTheme;
};

export const installThemeController = (
    webApp: unknown,
    environment?: ThemeEnvironment,
) => {
    const source = asTelegramThemeSource(webApp);
    const targetWindow = environment?.window ?? getBrowserWindow();
    const matchMedia = environment?.matchMedia ?? targetWindow?.matchMedia;
    const systemThemeQuery = matchMedia?.('(prefers-color-scheme: dark)');
    const storage = environment?.storage ?? getBrowserStorage();

    const applyCurrentPreference = () => {
        applyThemePreference(getStoredThemePreference(storage), {
            ...environment,
            matchMedia,
            storage,
            webApp,
        });
    };

    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === THEME_PREFERENCE_STORAGE_KEY) {
            applyCurrentPreference();
        }
    };

    applyCurrentPreference();

    source.onEvent?.('themeChanged', applyCurrentPreference);
    systemThemeQuery?.addEventListener?.('change', applyCurrentPreference);
    targetWindow?.addEventListener('storage', handleStorageChange);
    targetWindow?.addEventListener(THEME_PREFERENCE_CHANGED_EVENT, applyCurrentPreference);

    return () => {
        source.offEvent?.('themeChanged', applyCurrentPreference);
        systemThemeQuery?.removeEventListener?.('change', applyCurrentPreference);
        targetWindow?.removeEventListener('storage', handleStorageChange);
        targetWindow?.removeEventListener(THEME_PREFERENCE_CHANGED_EVENT, applyCurrentPreference);
    };
};
