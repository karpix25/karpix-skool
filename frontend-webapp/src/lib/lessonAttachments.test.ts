import { describe, expect, it } from 'vitest';

import {
    buildLessonAttachmentDownloadPath,
    formatAttachmentSize,
    getLessonAttachmentDownloadHref,
    sortLessonAttachments,
} from './lessonAttachments';
import type { LessonAttachment } from '../types/lessonAttachments';

const attachment = (overrides: Partial<LessonAttachment> = {}): LessonAttachment => ({
    id: 'attachment-1',
    lesson_id: 'lesson-1',
    filename: 'guide.pdf',
    content_type: 'application/pdf',
    size_bytes: 1536,
    display_order: 0,
    created_at: '2026-07-01T10:00:00Z',
    ...overrides,
});

describe('lesson attachment helpers', () => {
    it('formats attachment sizes for lesson UI', () => {
        expect(formatAttachmentSize(512)).toBe('512 Б');
        expect(formatAttachmentSize(1536)).toBe('1.5 КБ');
        expect(formatAttachmentSize(2 * 1024 * 1024)).toBe('2 МБ');
        expect(formatAttachmentSize(null)).toBe('Размер неизвестен');
    });

    it('builds fallback download URLs against the API origin', () => {
        expect(buildLessonAttachmentDownloadPath('lesson 1', 'file 2')).toBe(
            '/webapp/lessons/lesson%201/attachments/file%202/download'
        );
        expect(getLessonAttachmentDownloadHref(
            attachment({ download_url: null }),
            'lesson-1',
            'https://api.example.com/',
        )).toBe('https://api.example.com/webapp/lessons/lesson-1/attachments/attachment-1/download');
    });

    it('prefers backend-provided download URLs', () => {
        expect(getLessonAttachmentDownloadHref(
            attachment({ download_url: ' https://cdn.example.com/file.pdf ' }),
            'lesson-1',
            'https://api.example.com',
        )).toBe('https://cdn.example.com/file.pdf');
    });

    it('sorts attachments by display order and creation time', () => {
        const sorted = sortLessonAttachments([
            attachment({ id: 'newer', display_order: 2, created_at: '2026-07-01T12:00:00Z' }),
            attachment({ id: 'first', display_order: 1, created_at: '2026-07-01T11:00:00Z' }),
            attachment({ id: 'older', display_order: 2, created_at: '2026-07-01T09:00:00Z' }),
        ]);

        expect(sorted.map(item => item.id)).toEqual(['first', 'older', 'newer']);
    });
});
