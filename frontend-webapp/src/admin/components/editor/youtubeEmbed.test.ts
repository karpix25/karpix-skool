import { describe, expect, it } from 'vitest';

import { getYoutubeEmbedUrl } from './youtubeEmbed';

describe('getYoutubeEmbedUrl', () => {
    it('normalizes supported YouTube links before editor insertion', () => {
        expect(getYoutubeEmbedUrl('https://youtu.be/abcdefghijk')).toBe('https://www.youtube.com/embed/abcdefghijk');
        expect(getYoutubeEmbedUrl('https://www.youtube.com/watch?v=abcdefghijk')).toBe('https://www.youtube.com/embed/abcdefghijk');
        expect(getYoutubeEmbedUrl('https://www.youtube.com/embed/abcdefghijk')).toBe('https://www.youtube.com/embed/abcdefghijk');
    });

    it('leaves unknown urls unchanged for existing validation to reject', () => {
        expect(getYoutubeEmbedUrl('https://example.com/video')).toBe('https://example.com/video');
    });
});
