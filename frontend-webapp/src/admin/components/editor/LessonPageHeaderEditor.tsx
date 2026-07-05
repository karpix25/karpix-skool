import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Image as ImageIcon, Loader2, Smile, X } from 'lucide-react';

import { toUploadedMediaUrl } from '../../../lib/uploadedMedia';
import { cn } from '../../../lib/utils';
import { uploadEditorImage, validateEditorImageFile } from './imageUpload';

interface LessonPageHeaderEditorProps {
    title: string;
    coverUrl: string;
    iconEmoji: string;
    onTitleChange: (title: string) => void;
    onCoverUrlChange: (coverUrl: string) => void;
    onIconEmojiChange: (iconEmoji: string) => void;
}

const clampEmojiInput = (value: string) => value.trim().slice(0, 12);

export const LessonPageHeaderEditor = ({
    title,
    coverUrl,
    iconEmoji,
    onTitleChange,
    onCoverUrlChange,
    onIconEmojiChange,
}: LessonPageHeaderEditorProps) => {
    const titleRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isIconInputOpen, setIsIconInputOpen] = useState(false);
    const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [uploadMessage, setUploadMessage] = useState('');
    const safeCoverUrl = toUploadedMediaUrl(coverUrl);

    useEffect(() => {
        const el = titleRef.current;
        if (!el) return;
        el.style.height = 'auto';
        const lineHeight = parseFloat(window.getComputedStyle(el).lineHeight);
        el.style.height = `${Math.min(el.scrollHeight, lineHeight * 2)}px`;
    }, [title]);

    const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const validationError = validateEditorImageFile(file);
        if (validationError) {
            setUploadState('error');
            setUploadMessage(validationError);
            event.target.value = '';
            return;
        }

        try {
            setUploadState('uploading');
            setUploadMessage('Загружаю обложку...');
            onCoverUrlChange(await uploadEditorImage(file));
            setUploadState('success');
            setUploadMessage('Обложка добавлена.');
        } catch (err) {
            console.error('Lesson cover upload failed:', err);
            setUploadState('error');
            setUploadMessage(err instanceof Error ? err.message : 'Не удалось загрузить обложку.');
        } finally {
            event.target.value = '';
        }
    };

    return (
        <section className="mx-auto w-full max-w-[700px] px-4 pt-8 sm:px-6">
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverUpload}
            />

            {safeCoverUrl && (
                <div className="relative mb-0 h-36 overflow-hidden rounded-xl border border-border bg-muted sm:h-44">
                    <img src={safeCoverUrl} alt="Обложка урока" className="h-full w-full object-cover" />
                    <div className="absolute right-2 top-2 flex gap-2">
                        <button
                            type="button"
                            className="h-9 rounded-lg border border-border bg-card/95 px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Изменить
                        </button>
                        <button
                            type="button"
                            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card/95 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                            onClick={() => onCoverUrlChange('')}
                            aria-label="Удалить обложку урока"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>
            )}

            <div className={cn('space-y-4', safeCoverUrl ? '-mt-7' : '')}>
                {iconEmoji ? (
                    <div className="relative inline-flex">
                        <button
                            type="button"
                            className="grid h-16 w-16 place-items-center rounded-2xl border border-border bg-card text-4xl shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                            onClick={() => setIsIconInputOpen(true)}
                            aria-label="Изменить иконку урока"
                        >
                            {iconEmoji}
                        </button>
                        <button
                            type="button"
                            className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onIconEmojiChange('')}
                            aria-label="Удалить иконку урока"
                        >
                            <X size={13} />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                            onClick={() => setIsIconInputOpen(true)}
                        >
                            <Smile size={16} />
                            Добавить иконку
                        </button>
                        {!safeCoverUrl && (
                            <button
                                type="button"
                                className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <ImageIcon size={16} />
                                Добавить обложку
                            </button>
                        )}
                    </div>
                )}

                {isIconInputOpen && (
                    <div className="flex max-w-xs items-center gap-2">
                        <input
                            autoFocus
                            value={iconEmoji}
                            onChange={(event) => onIconEmojiChange(clampEmojiInput(event.target.value))}
                            placeholder="😀"
                            className="h-11 w-24 rounded-lg border border-input bg-card px-3 text-center text-2xl outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
                        />
                        <button
                            type="button"
                            className="h-11 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
                            onClick={() => setIsIconInputOpen(false)}
                        >
                            Готово
                        </button>
                    </div>
                )}

                {uploadState !== 'idle' && (
                    <div
                        role={uploadState === 'error' ? 'alert' : 'status'}
                        className={cn(
                            'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                            uploadState === 'error' && 'border-destructive/25 bg-destructive/10 text-destructive',
                            uploadState === 'success' && 'border-success/25 bg-success/10 text-success',
                            uploadState === 'uploading' && 'border-primary/25 bg-primary/10 text-primary',
                        )}
                    >
                        {uploadState === 'uploading' && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />}
                        {uploadState === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                        {uploadState === 'error' && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                        <span className="min-w-0 flex-1 font-medium">{uploadMessage}</span>
                    </div>
                )}

                <textarea
                    ref={titleRef}
                    value={title}
                    onChange={(event) => {
                        const value = event.target.value;
                        if ((value.match(/\n/g) || []).length < 2) {
                            onTitleChange(value);
                        }
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && (title.match(/\n/g) || []).length >= 1) {
                            event.preventDefault();
                        }
                    }}
                    placeholder="Без названия"
                    rows={1}
                    className="block w-full resize-none overflow-hidden border-none bg-transparent p-0 text-4xl font-semibold leading-[1.15] text-foreground placeholder:text-muted-foreground/30 focus:ring-0 sm:text-5xl"
                />
            </div>
        </section>
    );
};
