import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { LessonAttachment } from '../../../types/lessonAttachments';
import { LessonAttachmentsList } from './LessonAttachmentsList';

const attachment = (overrides: Partial<LessonAttachment> = {}): LessonAttachment => ({
    id: 'attachment-1',
    lesson_id: 'lesson-1',
    filename: 'Рабочая тетрадь.pdf',
    content_type: 'application/pdf',
    size_bytes: 2048,
    display_order: 0,
    created_at: '2026-07-01T10:00:00Z',
    ...overrides,
});

describe('LessonAttachmentsList', () => {
    it('renders lesson attachments as download cards', () => {
        render(
            <LessonAttachmentsList
                lessonId="lesson-1"
                attachments={[
                    attachment({ filename: 'Чеклист.pdf', display_order: 2 }),
                    attachment({ filename: 'Рабочая тетрадь.pdf', display_order: 1 }),
                ]}
            />
        );

        expect(screen.getByRole('heading', { name: 'Файлы урока' })).toBeInTheDocument();
        expect(screen.getByText('Рабочая тетрадь.pdf')).toBeInTheDocument();
        expect(screen.getByText('Чеклист.pdf')).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /Скачать/ })).toHaveLength(2);
    });

    it('uses backend-provided download URLs when present', () => {
        render(
            <LessonAttachmentsList
                lessonId="lesson-1"
                attachments={[
                    attachment({ download_url: 'https://cdn.example.com/workbook.pdf' }),
                ]}
            />
        );

        expect(screen.getByRole('link', { name: 'Скачать Рабочая тетрадь.pdf' })).toHaveAttribute(
            'href',
            'https://cdn.example.com/workbook.pdf',
        );
    });

    it('does not render active download links for locked lessons', () => {
        render(
            <LessonAttachmentsList
                isLocked
                lessonId="lesson-1"
                attachments={[attachment()]}
            />
        );

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Вложение заблокировано' })).toBeDisabled();
    });
});
