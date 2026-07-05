import { describe, expect, it, vi } from 'vitest';

import {
    isChunkLoadError,
    recoverFromChunkLoadError,
} from './chunkRecovery';

const createStorage = (lastReloadAt: string | null = null) => ({
    getItem: vi.fn(() => lastReloadAt),
    setItem: vi.fn(),
});

describe('chunkRecovery', () => {
    it('detects Vite dynamic import failures', () => {
        expect(isChunkLoadError(new Error('TypeError: Importing a module script failed.'))).toBe(true);
        expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module'))).toBe(true);
        expect(isChunkLoadError(new Error('Regular render failure'))).toBe(false);
    });

    it('reloads once for stale lazy chunks', () => {
        const storage = createStorage();
        const reload = vi.fn();

        const recovered = recoverFromChunkLoadError(
            new Error('Importing a module script failed.'),
            {
                now: () => 10_000,
                reload,
                storage: storage as unknown as Storage,
            },
        );

        expect(recovered).toBe(true);
        expect(storage.setItem).toHaveBeenCalledWith('karpix-skool:last-chunk-reload-at', '10000');
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('does not reload repeatedly inside the throttle window', () => {
        const storage = createStorage('9000');
        const reload = vi.fn();

        const recovered = recoverFromChunkLoadError(
            new Error('Importing a module script failed.'),
            {
                now: () => 10_000,
                reload,
                storage: storage as unknown as Storage,
            },
        );

        expect(recovered).toBe(false);
        expect(reload).not.toHaveBeenCalled();
    });
});
