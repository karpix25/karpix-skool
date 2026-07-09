import type { LessonAttachment } from '../types/lessonAttachments';

const BYTE_UNITS = ['Б', 'КБ', 'МБ', 'ГБ'];

export const formatAttachmentSize = (sizeBytes?: number | null): string => {
    if (typeof sizeBytes !== 'number' || !Number.isFinite(sizeBytes) || sizeBytes < 0) {
        return 'Размер неизвестен';
    }

    let size = sizeBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }

    const formattedSize = unitIndex === 0 || size >= 10
        ? Math.round(size).toString()
        : size.toFixed(1).replace('.0', '');

    return `${formattedSize} ${BYTE_UNITS[unitIndex]}`;
};

export const sortLessonAttachments = (attachments: LessonAttachment[]): LessonAttachment[] => (
    [...attachments].sort((left, right) => {
        if (left.display_order !== right.display_order) {
            return left.display_order - right.display_order;
        }
        return left.created_at.localeCompare(right.created_at);
    })
);

export const buildLessonAttachmentDownloadPath = (
    lessonId: string,
    attachmentId: string,
): string => (
    `/webapp/lessons/${encodeURIComponent(lessonId)}/attachments/${encodeURIComponent(attachmentId)}/download`
);

export const getLessonAttachmentDownloadHref = (
    attachment: LessonAttachment,
    lessonId = attachment.lesson_id,
    apiBaseUrl = '',
): string => {
    const directUrl = attachment.download_url?.trim();
    if (directUrl) return directUrl;

    const downloadPath = buildLessonAttachmentDownloadPath(lessonId, attachment.id);
    if (!apiBaseUrl.trim()) return downloadPath;

    return `${apiBaseUrl.replace(/\/+$/, '')}${downloadPath}`;
};
