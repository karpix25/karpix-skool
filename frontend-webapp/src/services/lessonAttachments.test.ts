import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../api/client';
import {
    deleteLessonAttachment,
    fetchLessonAttachments,
    uploadLessonAttachment,
} from './lessonAttachments';
import type { LessonAttachment } from '../types/lessonAttachments';

vi.mock('../api/client', () => ({
    default: {
        delete: vi.fn(),
        get: vi.fn(),
        post: vi.fn(),
    },
}));

const apiDelete = vi.mocked(api.delete);
const apiGet = vi.mocked(api.get);
const apiPost = vi.mocked(api.post);
const apiResponse = <T,>(data: T) => ({ data }) as Awaited<ReturnType<typeof api.get<T>>>;

const lessonId = 'lesson-1';
const attachment: LessonAttachment = {
    id: 'attachment-1',
    lesson_id: lessonId,
    filename: 'guide.pdf',
    content_type: 'application/pdf',
    size_bytes: 2048,
    download_url: null,
    display_order: 0,
    created_at: '2026-07-01T10:00:00Z',
};

describe('lesson attachment API', () => {
    beforeEach(() => {
        apiDelete.mockReset();
        apiGet.mockReset();
        apiPost.mockReset();
    });

    it('loads lesson attachments from the admin endpoint', async () => {
        apiGet.mockResolvedValue(apiResponse([attachment]));

        await expect(fetchLessonAttachments(lessonId)).resolves.toEqual([attachment]);
        expect(apiGet).toHaveBeenCalledWith(`/courses/lessons/${lessonId}/attachments`);
    });

    it('uploads a lesson attachment as multipart form data', async () => {
        const file = new File(['pdf'], 'guide.pdf', { type: 'application/pdf' });
        apiPost.mockResolvedValue(apiResponse(attachment));

        await expect(uploadLessonAttachment(lessonId, file)).resolves.toEqual(attachment);
        expect(apiPost).toHaveBeenCalledWith(
            `/courses/lessons/${lessonId}/attachments`,
            expect.any(FormData),
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        const formData = apiPost.mock.calls[0][1] as FormData;
        expect(formData.get('file')).toBe(file);
    });

    it('deletes a lesson attachment through the admin endpoint', async () => {
        apiDelete.mockResolvedValue(apiResponse({}));

        await expect(deleteLessonAttachment(lessonId, attachment.id)).resolves.toBeUndefined();
        expect(apiDelete).toHaveBeenCalledWith(`/courses/lessons/${lessonId}/attachments/${attachment.id}`);
    });
});
