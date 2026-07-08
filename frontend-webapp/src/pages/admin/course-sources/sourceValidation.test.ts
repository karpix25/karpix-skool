import { describe, expect, it } from 'vitest';

import {
    hasCourseGenerationSources,
    toCourseGenerationSourcePayload,
} from './sourceValidation';

describe('course source validation', () => {
    it('detects usable note and url sources', () => {
        expect(hasCourseGenerationSources([])).toBe(false);
        expect(hasCourseGenerationSources([{ kind: 'note', content: '   ' }])).toBe(false);
        expect(hasCourseGenerationSources([{ kind: 'note', content: 'idea' }])).toBe(true);
        expect(hasCourseGenerationSources([{ kind: 'link', url: 'https://example.com' }])).toBe(true);
        expect(hasCourseGenerationSources([{ kind: 'instagram', url: 'https://instagram.com/reel/abc' }])).toBe(true);
        expect(hasCourseGenerationSources([{ kind: 'tiktok', url: 'https://tiktok.com/@u/video/1' }])).toBe(true);
        expect(hasCourseGenerationSources([{ kind: 'open_notebook', url: 'https://notebook.karpix.com/notebooks/notebook%3A1' }])).toBe(true);
        expect(hasCourseGenerationSources([{ kind: 'file', file: new File(['x'], 'source.pdf') }])).toBe(true);
    });

    it('removes client-only fields from api payload', () => {
        const payload = toCourseGenerationSourcePayload([
            {
                clientId: 'local-1',
                kind: 'youtube',
                title: 'Video',
                url: 'https://youtube.com/watch?v=abc',
            },
            {
                clientId: 'local-2',
                kind: 'tiktok',
                title: 'TikTok',
                url: 'https://www.tiktok.com/@user/video/123',
            },
            {
                clientId: 'local-3',
                kind: 'open_notebook',
                title: 'Notebook',
                url: 'https://notebook.karpix.com/notebooks/notebook%3A1',
            },
            {
                clientId: 'local-4',
                kind: 'file',
                title: 'PDF',
                url: 'https://example.com/source.pdf',
                file: new File(['x'], 'source.pdf'),
            },
        ]);

        expect(payload).toEqual([
            {
                kind: 'youtube',
                title: 'Video',
                url: 'https://youtube.com/watch?v=abc',
            },
            {
                kind: 'tiktok',
                title: 'TikTok',
                url: 'https://www.tiktok.com/@user/video/123',
            },
            {
                kind: 'open_notebook',
                title: 'Notebook',
                url: 'https://notebook.karpix.com/notebooks/notebook%3A1',
            },
            {
                kind: 'file',
                title: 'PDF',
                url: 'https://example.com/source.pdf',
            },
        ]);
    });
});
