import api from '../api/client';
import type { LessonAttachment } from '../types/lessonAttachments';

interface LessonAttachmentsEnvelope {
    attachments?: LessonAttachment[];
}

type LessonAttachmentsResponse = LessonAttachment[] | LessonAttachmentsEnvelope;

const normalizeLessonAttachments = (data: LessonAttachmentsResponse): LessonAttachment[] => (
    Array.isArray(data) ? data : data.attachments || []
);

export const fetchLessonAttachments = async (lessonId: string): Promise<LessonAttachment[]> => {
    const response = await api.get<LessonAttachmentsResponse>(`/courses/lessons/${lessonId}/attachments`);
    return normalizeLessonAttachments(response.data);
};

export const uploadLessonAttachment = async (
    lessonId: string,
    file: File,
): Promise<LessonAttachment> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<LessonAttachment>(
        `/courses/lessons/${lessonId}/attachments`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
    );

    return response.data;
};

export const deleteLessonAttachment = async (
    lessonId: string,
    attachmentId: string,
): Promise<void> => {
    await api.delete(`/courses/lessons/${lessonId}/attachments/${attachmentId}`);
};
