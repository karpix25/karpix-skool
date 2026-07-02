import { describe, expect, it } from 'vitest';

import { externalLinkRel } from '../../lib/externalLinks';
import { sanitizeLessonHtml } from './lessonHtmlSafety';

const renderHtml = (html: string) => {
    const container = document.createElement('div');
    container.innerHTML = sanitizeLessonHtml(html);
    return container;
};

describe('sanitizeLessonHtml', () => {
    it('removes executable content and inline event handlers', () => {
        const container = renderHtml(`
            <p class="lead" onclick="alert(1)" style="color:red">
                Hello<script>alert(1)</script><!-- comment -->
            </p>
            <svg onload="alert(2)"><circle /></svg>
        `);

        const paragraph = container.querySelector('p');
        expect(container.querySelector('script')).toBeNull();
        expect(container.querySelector('svg')).toBeNull();
        expect(paragraph).toHaveAttribute('class', 'lead');
        expect(paragraph).not.toHaveAttribute('onclick');
        expect(paragraph).not.toHaveAttribute('style');
        expect(container.textContent?.replace(/\s+/g, ' ').trim()).toBe('Hello');
    });

    it('keeps safe lesson links and protects blank targets', () => {
        const container = renderHtml(`
            <a href="https://example.com/lesson" target="_blank" rel="opener">Lesson</a>
            <a href="javascript:alert(1)">Bad</a>
        `);

        const links = container.querySelectorAll('a');
        expect(links[0]).toHaveAttribute('href', 'https://example.com/lesson');
        expect(links[0]).toHaveAttribute('target', '_blank');
        expect(links[0]).toHaveAttribute('rel', externalLinkRel);
        expect(links[1]).not.toHaveAttribute('href');
    });

    it('allows safe images and removes unsafe image payloads', () => {
        const container = renderHtml(`
            <img src="https://cdn.example.com/photo.webp" alt="Photo" onerror="alert(1)" />
            <img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+" alt="Bad" />
        `);

        const images = container.querySelectorAll('img');
        expect(images).toHaveLength(1);
        expect(images[0]).toHaveAttribute('src', 'https://cdn.example.com/photo.webp');
        expect(images[0]).toHaveAttribute('alt', 'Photo');
        expect(images[0]).not.toHaveAttribute('onerror');
    });

    it('keeps YouTube embeds and drops other frames', () => {
        const container = renderHtml(`
            <iframe src="https://www.youtube.com/embed/video-id" title="Intro" srcdoc="<script>alert(1)</script>"></iframe>
            <iframe src="https://evil.example/embed/video-id" title="Bad"></iframe>
        `);

        const frames = container.querySelectorAll('iframe');
        expect(frames).toHaveLength(1);
        expect(frames[0]).toHaveAttribute('src', 'https://www.youtube.com/embed/video-id');
        expect(frames[0]).toHaveAttribute('title', 'Intro');
        expect(frames[0]).not.toHaveAttribute('srcdoc');
    });

    it('rejects encoded and mixed-case javascript urls', () => {
        const container = renderHtml(`
            <a href="JaVa&#x73;CrIpT:alert(1)">Encoded</a>
            <img src="java
            script:alert(1)" alt="Bad" />
        `);

        expect(container.querySelector('a')).not.toHaveAttribute('href');
        expect(container.querySelector('img')).toBeNull();
    });
});
