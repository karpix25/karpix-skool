import { describe, expect, it } from 'vitest';

import { getWelcomeVideoEmbed, getWelcomeVideoPlayback } from './welcomeVideoEmbed';

describe('welcome video embed helpers', () => {
    it('uses native video playback for direct video files', () => {
        expect(getWelcomeVideoEmbed('https://cdn.example.com/welcome.mp4?token=1')).toEqual({
            kind: 'video',
            src: 'https://cdn.example.com/welcome.mp4?token=1',
        });
    });

    it('normalizes common YouTube urls to no-cookie embeds without autoplay', () => {
        expect(getWelcomeVideoEmbed('https://youtu.be/abcdefghijk')).toEqual({
            kind: 'iframe',
            provider: 'youtube',
            src: 'https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=0&rel=0',
        });

        expect(getWelcomeVideoEmbed('https://www.youtube.com/watch?v=abcdefghijk')).toEqual({
            kind: 'iframe',
            provider: 'youtube',
            src: 'https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=0&rel=0',
        });
    });

    it('normalizes Vimeo and Loom links to provider embeds', () => {
        expect(getWelcomeVideoEmbed('https://vimeo.com/123456789')).toEqual({
            kind: 'iframe',
            provider: 'vimeo',
            src: 'https://player.vimeo.com/video/123456789?autoplay=0',
        });

        expect(getWelcomeVideoEmbed('https://www.loom.com/share/abc12345-def6')).toEqual({
            kind: 'iframe',
            provider: 'loom',
            src: 'https://www.loom.com/embed/abc12345-def6?hide_owner=true&hide_share=true',
        });
    });

    it('falls back to external links for unknown http urls', () => {
        expect(getWelcomeVideoEmbed('https://example.com/watch/welcome')).toEqual({
            kind: 'link',
            href: 'https://example.com/watch/welcome',
        });
    });

    it('does not render disabled, blank, or unsafe urls', () => {
        expect(getWelcomeVideoPlayback({ welcome_video_enabled: false, welcome_video_url: 'https://youtu.be/abcdefghijk' })).toBeNull();
        expect(getWelcomeVideoPlayback({ welcome_video_enabled: true, welcome_video_url: '   ' })).toBeNull();
        expect(getWelcomeVideoPlayback({ welcome_video_enabled: true, welcome_video_url: 'javascript:alert(1)' })).toBeNull();
    });
});
