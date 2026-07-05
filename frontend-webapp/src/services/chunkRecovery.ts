const CHUNK_RELOAD_STORAGE_KEY = 'karpix-skool:last-chunk-reload-at';
const DEFAULT_RELOAD_THROTTLE_MS = 30_000;

const chunkErrorPatterns = [
    /Importing a module script failed/i,
    /Failed to fetch dynamically imported module/i,
    /error loading dynamically imported module/i,
    /Loading chunk \S+ failed/i,
    /ChunkLoadError/i,
];

interface RecoveryOptions {
    now?: () => number;
    reload?: () => void;
    storage?: Storage | null;
    throttleMs?: number;
}

export const getErrorMessage = (error: unknown): string => {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        return typeof message === 'string' ? message : '';
    }
    return '';
};

const isScriptAssetError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object' || !('target' in error)) return false;

    const target = (error as { target?: EventTarget | null }).target;
    if (!(target instanceof HTMLScriptElement)) return false;

    return target.src.includes('/assets/') && target.src.endsWith('.js');
};

export const isChunkLoadError = (error: unknown): boolean => {
    const message = getErrorMessage(error);
    return chunkErrorPatterns.some((pattern) => pattern.test(message)) || isScriptAssetError(error);
};

export const recoverFromChunkLoadError = (error: unknown, options: RecoveryOptions = {}): boolean => {
    if (!isChunkLoadError(error) || typeof window === 'undefined') return false;

    const now = options.now?.() ?? Date.now();
    const throttleMs = options.throttleMs ?? DEFAULT_RELOAD_THROTTLE_MS;
    const reload = options.reload ?? (() => window.location.reload());
    const storage = options.storage ?? window.sessionStorage;

    try {
        const lastReloadAt = Number(storage?.getItem(CHUNK_RELOAD_STORAGE_KEY) ?? 0);
        if (lastReloadAt && now - lastReloadAt < throttleMs) return false;
        storage?.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
    } catch {
        // Storage can be unavailable inside privacy-restricted webviews; reload still helps.
    }

    reload();
    return true;
};

export const installChunkErrorListeners = () => {
    if (typeof window === 'undefined') return () => undefined;

    const handleError = (event: ErrorEvent) => {
        recoverFromChunkLoadError(event.error || event);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        recoverFromChunkLoadError(event.reason);
    };

    const handleVitePreloadError = (event: Event) => {
        recoverFromChunkLoadError((event as CustomEvent<unknown>).detail || event);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('vite:preloadError', handleVitePreloadError);

    return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('vite:preloadError', handleVitePreloadError);
    };
};
