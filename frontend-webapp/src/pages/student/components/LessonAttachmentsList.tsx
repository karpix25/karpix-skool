import { Download, File, Lock } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { getApiBaseUrl } from '../../../env/apiUrl';
import {
    formatAttachmentSize,
    getLessonAttachmentDownloadHref,
    sortLessonAttachments,
} from '../../../lib/lessonAttachments';
import type { LessonAttachment } from '../../../types/lessonAttachments';

interface LessonAttachmentsListProps {
    attachments?: LessonAttachment[];
    isLocked?: boolean;
    lessonId: string;
}

export const LessonAttachmentsList = ({
    attachments = [],
    isLocked = false,
    lessonId,
}: LessonAttachmentsListProps) => {
    const sortedAttachments = sortLessonAttachments(attachments);
    if (!sortedAttachments.length) return null;

    return (
        <section aria-labelledby="lesson-attachments-title" className="space-y-3">
            <h2 id="lesson-attachments-title" className="text-sm font-bold text-foreground">
                Файлы урока
            </h2>
            <div className="space-y-2">
                {sortedAttachments.map((attachment) => (
                    <div
                        key={attachment.id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-sm"
                    >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <File className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{attachment.filename}</p>
                            <p className="text-xs font-medium text-muted-foreground">
                                {formatAttachmentSize(attachment.size_bytes)}
                            </p>
                        </div>
                        {isLocked ? (
                            <Button type="button" variant="secondary" size="sm" disabled aria-label="Вложение заблокировано">
                                <Lock className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button asChild variant="outline" size="sm" className="shrink-0">
                                <a
                                    href={getLessonAttachmentDownloadHref(attachment, lessonId, getApiBaseUrl())}
                                    aria-label={`Скачать ${attachment.filename}`}
                                >
                                    <Download className="h-4 w-4" />
                                    <span className="hidden min-[380px]:inline">Скачать</span>
                                </a>
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
};
