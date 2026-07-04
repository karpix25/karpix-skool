import { describe, expect, it } from 'vitest';

import { validateEditorImageFile } from './imageUpload';

const imageFile = (type: string, size = 1200) => (
    new File([new Uint8Array(size)], 'image', { type })
);

describe('validateEditorImageFile', () => {
    it('accepts editor image formats supported by backend upload', () => {
        expect(validateEditorImageFile(imageFile('image/jpeg'))).toBeNull();
        expect(validateEditorImageFile(imageFile('image/jpg'))).toBeNull();
        expect(validateEditorImageFile(imageFile('image/png'))).toBeNull();
        expect(validateEditorImageFile(imageFile('image/webp'))).toBeNull();
    });

    it('rejects unsupported image formats before the upload request', () => {
        expect(validateEditorImageFile(imageFile('image/heic'))).toContain('JPEG');
        expect(validateEditorImageFile(imageFile('image/svg+xml'))).toContain('JPEG');
    });

    it('rejects images larger than the backend limit', () => {
        const file = imageFile('image/png', 8 * 1024 * 1024 + 1);

        expect(validateEditorImageFile(file)).toContain('8 МБ');
    });
});
