import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
    cleanup();
});

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

vi.mock('@twa-dev/sdk', () => ({
    default: {
        ready: vi.fn(),
        expand: vi.fn(),
        close: vi.fn(),
        initData: '',
        initDataUnsafe: {},
        colorScheme: 'dark',
        MainButton: {
            show: vi.fn(),
            hide: vi.fn(),
            setText: vi.fn(),
            onClick: vi.fn(),
            offClick: vi.fn(),
        },
        BackButton: {
            show: vi.fn(),
            hide: vi.fn(),
            onClick: vi.fn(),
            offClick: vi.fn(),
        },
        onEvent: vi.fn(),
        offEvent: vi.fn(),
    },
}));
