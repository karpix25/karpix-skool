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
            <p class="lead text-white" onclick="alert(1)" style="color:red">
                Hello<script>alert(1)</script><!-- comment -->
            </p>
            <svg onload="alert(2)"><circle /></svg>
        `);

        const paragraph = container.querySelector('p');
        expect(container.querySelector('script')).toBeNull();
        expect(container.querySelector('svg')).toBeNull();
        expect(paragraph).not.toHaveAttribute('class');
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
            <img src="https://cdn.example.com/photo.webp" alt="Photo" onerror="alert(1)" data-media-width="50%" data-media-align="right" />
            <img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+" alt="Bad" />
        `);

        const images = container.querySelectorAll('img');
        expect(images).toHaveLength(1);
        expect(images[0]).toHaveAttribute('src', 'https://cdn.example.com/photo.webp');
        expect(images[0]).toHaveAttribute('alt', 'Photo');
        expect(images[0]).toHaveAttribute('data-media-width', '50%');
        expect(images[0]).toHaveAttribute('data-media-align', 'right');
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

    it('keeps only safe media layout attributes', () => {
        const container = renderHtml(`
            <div
                data-mux-playback-id="mux123"
                data-media-width="75%"
                data-media-align="center"
                data-caption="Intro"
                style="width:9999px"
                onclick="alert(1)"
            ></div>
            <img
                src="https://cdn.example.com/photo.webp"
                data-media-width="999%"
                data-media-align="expression(alert(1))"
                data-caption="bad\u0001caption"
                data-extra="nope"
            />
        `);

        const mux = container.querySelector('div');
        const image = container.querySelector('img');
        expect(mux).toHaveAttribute('data-media-width', '75%');
        expect(mux).toHaveAttribute('data-media-align', 'center');
        expect(mux).toHaveAttribute('data-caption', 'Intro');
        expect(mux).not.toHaveAttribute('style');
        expect(mux).not.toHaveAttribute('onclick');
        expect(image).not.toHaveAttribute('data-media-width');
        expect(image).not.toHaveAttribute('data-media-align');
        expect(image).not.toHaveAttribute('data-caption');
        expect(image).not.toHaveAttribute('data-extra');
    });

    it('keeps mux placeholders that are still waiting for playback id', () => {
        const container = renderHtml(`
            <div
                data-mux-playback-id=""
                data-lesson-id="lesson123"
                data-media-width="100%"
                data-media-align="center"
            ></div>
        `);

        const mux = container.querySelector('div');
        expect(mux).toHaveAttribute('data-mux-playback-id', '');
        expect(mux).toHaveAttribute('data-lesson-id', 'lesson123');
        expect(mux).toHaveAttribute('data-media-width', '100%');
        expect(mux).toHaveAttribute('data-media-align', 'center');
    });

    it('removes presentational classes that can override the student lesson theme', () => {
        const container = renderHtml(`
            <h2 class="text-white">Heading</h2>
            <p class="text-white dark:prose-invert">Body</p>
            <span class="text-primary">Accent</span>
            <iframe
                class="absolute inset-0 text-white"
                src="https://www.youtube.com/embed/video-id"
                title="Intro"
                data-media-width="100%"
                data-media-align="center"
            ></iframe>
        `);

        expect(container.querySelector('h2')).not.toHaveAttribute('class');
        expect(container.querySelector('p')).not.toHaveAttribute('class');
        expect(container.querySelector('span')).not.toHaveAttribute('class');
        expect(container.querySelector('iframe')).not.toHaveAttribute('class');
        expect(container.querySelector('iframe')).toHaveAttribute('data-media-width', '100%');
    });
});
