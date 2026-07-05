import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    getUploadedMediaKey,
    toUploadedMediaUrl,
} from './uploadedMedia';

describe('uploadedMedia', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('extracts allowed uploaded media keys from bucket-style paths', () => {
        expect(getUploadedMediaKey('/karpix-skool/avatars/38061745_avatar.jpg')).toBe(
            'avatars/38061745_avatar.jpg',
        );
        expect(getUploadedMediaKey('/karpix-skool/oblozhki/course cover.jpg')).toBe(
            'oblozhki/course cover.jpg',
        );
        expect(getUploadedMediaKey('/karpix-skool/private/file.jpg')).toBeNull();
    });

    it('proxies direct R2 avatar URLs through the backend upload route', () => {
        vi.stubEnv('VITE_API_URL', 'https://api.example.com');

        expect(
            toUploadedMediaUrl(
                'https://b5b0b964016e7d29effdc05e52c756b8.r2.cloudflarestorage.com/karpix-skool/avatars/38061745_avatar.jpg',
            ),
        ).toBe('https://api.example.com/upload/files/avatars/38061745_avatar.jpg');
    });

    it('expands relative backend upload paths to the configured API origin', () => {
        vi.stubEnv('VITE_API_URL', 'https://api.example.com');

        expect(toUploadedMediaUrl('/upload/files/avatars/telegram.jpg')).toBe(
            'https://api.example.com/upload/files/avatars/telegram.jpg',
        );
    });

    it('keeps regular public URLs unchanged', () => {
        expect(toUploadedMediaUrl('https://cdn.example.com/image.jpg')).toBe(
            'https://cdn.example.com/image.jpg',
        );
    });
});
