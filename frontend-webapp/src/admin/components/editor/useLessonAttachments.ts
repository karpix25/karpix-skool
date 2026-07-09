import { useCallback, useEffect, useMemo, useState } from 'react';

import { sortLessonAttachments } from '../../../lib/lessonAttachments';
import { getApiErrorMessage } from '../../../services/apiError';
import {
    deleteLessonAttachment,
    fetchLessonAttachments,
    uploadLessonAttachment,
} from '../../../services/lessonAttachments';
import type { LessonAttachment } from '../../../types/lessonAttachments';

export type AttachmentUploadState = 'idle' | 'uploading' | 'success' | 'error';

export const useLessonAttachments = (lessonId?: string) => {
    const stableLessonId = lessonId && lessonId !== 'new' ? lessonId : null;
    const [attachments, setAttachments] = useState<LessonAttachment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadState, setUploadState] = useState<AttachmentUploadState>('idle');
    const [message, setMessage] = useState<string | null>(null);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());

    const sortedAttachments = useMemo(
        () => sortLessonAttachments(attachments),
        [attachments],
    );

    const loadAttachments = useCallback(async () => {
        if (!stableLessonId) {
            setAttachments([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setMessage(null);
        try {
            const nextAttachments = await fetchLessonAttachments(stableLessonId);
            setAttachments(nextAttachments);
        } catch (error) {
            setUploadState('error');
            setMessage(getApiErrorMessage(error, 'Не удалось загрузить вложения урока.'));
        } finally {
            setIsLoading(false);
        }
    }, [stableLessonId]);

    useEffect(() => {
        void loadAttachments();
    }, [loadAttachments]);

    const upload = useCallback(async (file: File) => {
        if (!stableLessonId) {
            setUploadState('error');
            setMessage('Сначала сохраните урок, затем прикрепите файл.');
            return;
        }

        setUploadState('uploading');
        setMessage(`Загружаю ${file.name}...`);
        try {
            const uploadedAttachment = await uploadLessonAttachment(stableLessonId, file);
            setAttachments((current) => sortLessonAttachments([...current, uploadedAttachment]));
            setUploadState('success');
            setMessage('Файл прикреплен к уроку.');
        } catch (error) {
            setUploadState('error');
            setMessage(getApiErrorMessage(error, 'Не удалось прикрепить файл.'));
        }
    }, [stableLessonId]);

    const remove = useCallback(async (attachmentId: string) => {
        if (!stableLessonId) return;

        setDeletingIds((current) => new Set(current).add(attachmentId));
        setMessage(null);
        try {
            await deleteLessonAttachment(stableLessonId, attachmentId);
            setAttachments((current) => current.filter(attachment => attachment.id !== attachmentId));
        } catch (error) {
            setUploadState('error');
            setMessage(getApiErrorMessage(error, 'Не удалось удалить вложение.'));
        } finally {
            setDeletingIds((current) => {
                const next = new Set(current);
                next.delete(attachmentId);
                return next;
            });
        }
    }, [stableLessonId]);

    return {
        attachments: sortedAttachments,
        canUpload: Boolean(stableLessonId),
        deletingIds,
        isLoading,
        message,
        reload: loadAttachments,
        remove,
        setMessage,
        setUploadState,
        upload,
        uploadState,
    };
};
