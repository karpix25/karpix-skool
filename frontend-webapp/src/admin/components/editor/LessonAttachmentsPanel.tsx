import { type ChangeEvent, useRef } from 'react';
import { File, Loader2, Paperclip, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { formatAttachmentSize } from '../../../lib/lessonAttachments';
import { useLessonAttachments } from './useLessonAttachments';

interface LessonAttachmentsPanelProps {
    lessonId?: string;
}

export const LessonAttachmentsPanel = ({ lessonId }: LessonAttachmentsPanelProps) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const {
        attachments,
        canUpload,
        deletingIds,
        isLoading,
        message,
        remove,
        setMessage,
        setUploadState,
        upload,
        uploadState,
    } = useLessonAttachments(lessonId);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            await upload(file);
        }
        event.target.value = '';
    };

    const isUploading = uploadState === 'uploading';

    return (
        <section className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                disabled={!canUpload || isUploading}
                onChange={handleFileChange}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-sm font-bold">
                        <Paperclip className="h-4 w-4 text-primary" />
                        Вложения урока
                    </h2>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                        Файлы появятся у ученика отдельными кнопками скачивания.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    disabled={!canUpload || isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-11 rounded-lg text-xs font-semibold"
                >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                    {isUploading ? 'Загружаю' : 'Прикрепить файл'}
                </Button>
            </div>

            {!canUpload && (
                <InlineAlert
                    className="mt-4"
                    variant="info"
                    title="Файлы доступны после сохранения"
                    description="Сначала сохраните новый урок, затем добавьте вложения."
                />
            )}

            {message && canUpload && (
                <InlineAlert
                    className="mt-4"
                    variant={uploadState === 'error' ? 'error' : uploadState === 'success' ? 'success' : 'info'}
                    title={message}
                    onDismiss={() => {
                        setMessage(null);
                        setUploadState('idle');
                    }}
                />
            )}

            <div className="mt-4 space-y-2">
                {isLoading ? (
                    <div className="flex min-h-16 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="text-xs font-semibold">Загружаю вложения</span>
                    </div>
                ) : attachments.length > 0 ? (
                    attachments.map((attachment) => {
                        const isDeleting = deletingIds.has(attachment.id);
                        return (
                            <div
                                key={attachment.id}
                                className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <File className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">{attachment.filename}</p>
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {formatAttachmentSize(attachment.size_bytes)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => void remove(attachment.id)}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-destructive disabled:opacity-45"
                                    aria-label={`Удалить вложение ${attachment.filename}`}
                                >
                                    {isDeleting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-5 text-center text-xs font-medium text-muted-foreground">
                        В этом уроке пока нет вложений.
                    </div>
                )}
            </div>
        </section>
    );
};
