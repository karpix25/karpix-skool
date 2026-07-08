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
    });

    it('removes client-only ids from api payload', () => {
        const payload = toCourseGenerationSourcePayload([
            {
                clientId: 'local-1',
                kind: 'youtube',
                title: 'Video',
                url: 'https://youtube.com/watch?v=abc',
            },
        ]);

        expect(payload).toEqual([
            {
                kind: 'youtube',
                title: 'Video',
                url: 'https://youtube.com/watch?v=abc',
            },
        ]);
    });
});
