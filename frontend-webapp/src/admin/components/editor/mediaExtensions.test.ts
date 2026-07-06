import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';

import { CustomImage } from './CustomImage';
import { CustomMux } from './CustomMux';
import { CustomYoutube } from './CustomYoutube';
import { insertMediaBlock } from './insertMediaBlock';

let editor: Editor | null = null;

const createEditor = () => {
    editor = new Editor({
        extensions: [
            StarterKit,
            CustomImage,
            CustomYoutube,
            CustomMux,
        ],
        content: '<p>Intro</p>',
    });

    return editor;
};

afterEach(() => {
    editor?.destroy();
    editor = null;
});

describe('lesson editor media extensions', () => {
    it('serializes image media controls into safe data attributes', () => {
        const testEditor = createEditor();
        insertMediaBlock(testEditor, {
            type: 'image',
            attrs: {
                src: 'https://cdn.example.com/photo.webp',
                alt: 'Photo',
                mediaWidth: '50%',
                mediaAlign: 'right',
            },
        });

        const html = testEditor.getHTML();
        expect(html).toContain('src="https://cdn.example.com/photo.webp"');
        expect(html).toContain('data-media-width="50%"');
        expect(html).toContain('data-media-align="right"');
    });

    it('serializes youtube media controls with an embed src', () => {
        const testEditor = createEditor();
        insertMediaBlock(testEditor, {
            type: 'youtube',
            attrs: {
                src: 'https://www.youtube.com/embed/abcdefghijk',
                mediaWidth: '75%',
                mediaAlign: 'center',
            },
        });

        const html = testEditor.getHTML();
        expect(html).toContain('https://www.youtube.com/embed/abcdefghijk');
        expect(html).toContain('data-media-width="75%"');
        expect(html).toContain('data-media-align="center"');
    });

    it('keeps mux placeholders while upload processing is pending', () => {
        const testEditor = createEditor();
        insertMediaBlock(testEditor, {
            type: 'mux',
            attrs: {
                playbackId: '',
                lessonId: 'lesson123',
                mediaWidth: '100%',
                mediaAlign: 'center',
            },
        });

        const html = testEditor.getHTML();
        expect(html).toContain('data-mux-playback-id=""');
        expect(html).toContain('data-lesson-id="lesson123"');
        expect(html).toContain('data-media-width="100%"');
        expect(html).toContain('data-media-align="center"');
    });
});
