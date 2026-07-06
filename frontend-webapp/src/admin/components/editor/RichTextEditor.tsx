import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { CustomYoutube } from './CustomYoutube';
import { CustomMux } from './CustomMux';
import { CustomImage } from './CustomImage';
import LessonEditorFloatingToolbar from './LessonEditorFloatingToolbar';
import { uploadEditorImage, validateEditorImageFile } from './imageUpload';
import { insertMediaBlock } from './insertMediaBlock';
import { getYoutubeEmbedUrl } from './youtubeEmbed';

interface Props {
    lessonId?: string;
    content: string;
    contentVersion: number;
    onChange: (content: string) => void;
}

export const RichTextEditor: React.FC<Props> = ({ lessonId, content, contentVersion, onChange }) => {
    const onChangeRef = useRef(onChange);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const clearUploadTimerRef = useRef<number | null>(null);
    const loadedContentKeyRef = useRef<string | null>(null);
    const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [uploadMessage, setUploadMessage] = useState('');

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => () => {
        if (clearUploadTimerRef.current) {
            window.clearTimeout(clearUploadTimerRef.current);
        }
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline font-bold',
                },
            }),
            CustomImage.configure({
                HTMLAttributes: {
                    class: 'lesson-media-image rounded-lg shadow-sm max-w-full h-auto border border-border',
                },
            }),
            CustomYoutube.configure({
                HTMLAttributes: {
                    class: 'rounded-lg shadow-sm my-12 aspect-video w-full max-w-3xl mx-auto overflow-hidden ring-1 ring-border',
                },
            }),
            CustomMux,
        ],
        content: content || '',
        onUpdate: ({ editor }) => {
            onChangeRef.current(editor.getHTML());
        },
        onSelectionUpdate: ({ editor }) => {
            // Auto-scroll to cursor logic
            const { view } = editor;
            const { selection } = view.state;

            // Get the cursor position in the viewport
            const coords = view.coordsAtPos(selection.from);

            // Find the scrollable container (main in LessonEditor)
            const scrollContainer = document.querySelector('main');
            if (!scrollContainer || !coords) return;

            const buffer = 100; // Pixels from top/bottom to trigger scroll
            const rect = scrollContainer.getBoundingClientRect();

            if (coords.bottom > rect.bottom - buffer) {
                scrollContainer.scrollBy({
                    top: coords.bottom - (rect.bottom - buffer),
                    behavior: 'smooth'
                });
            } else if (coords.top < rect.top + buffer) {
                scrollContainer.scrollBy({
                    top: coords.top - (rect.top + buffer),
                    behavior: 'smooth'
                });
            }
        },
        editorProps: {
            attributes: {
                class: 'prose prose-slate max-w-none focus:outline-none min-h-[70vh] text-lg leading-relaxed text-foreground pb-80'
            }
        }
    });

    useEffect(() => {
        if (!editor) return;

        const contentKey = `${lessonId || 'new'}:${contentVersion}`;
        if (loadedContentKeyRef.current === contentKey) return;

        editor.commands.setContent(content || '', false);
        loadedContentKeyRef.current = contentKey;
    }, [content, contentVersion, editor, lessonId]);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
            setUploadMessage('Загружаю картинку...');
            const imageUrl = await uploadEditorImage(file);
            const inserted = editor
                ? insertMediaBlock(editor, {
                    type: 'image',
                    attrs: {
                        src: imageUrl,
                        alt: file.name,
                        mediaWidth: '100%',
                        mediaAlign: 'center',
                    },
                })
                : false;
            if (!inserted) {
                throw new Error('Не удалось вставить картинку в урок.');
            }
            setUploadState('success');
            setUploadMessage('Картинка добавлена в урок.');
            if (clearUploadTimerRef.current) {
                window.clearTimeout(clearUploadTimerRef.current);
            }
            clearUploadTimerRef.current = window.setTimeout(() => {
                setUploadState('idle');
                setUploadMessage('');
            }, 2500);
        } catch (err) {
            console.error('Image upload failed:', err);
            setUploadState('error');
            setUploadMessage(err instanceof Error ? err.message : 'Не удалось загрузить картинку.');
        } finally {
            if (event.target) event.target.value = '';
        }
    };


    let hasVideo = false;
    if (editor) {
        editor.state.doc.descendants(node => {
            if (node.type.name === 'youtube' || node.type.name === 'mux') {
                hasVideo = true;
                return false;
            }
        });
    }

    return (
        <div className="w-full selection:bg-primary/20">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
            />

            <LessonEditorFloatingToolbar
                editor={editor}
                onAddImage={() => fileInputRef.current?.click()}
                hasVideo={hasVideo}
                lessonId={lessonId}
                onAddVideo={(url, type, playbackId) => {
                    if (!editor) return;

                    if (type === 'mux') {
                        insertMediaBlock(editor, {
                            type: 'mux',
                            attrs: {
                                playbackId: playbackId || '',
                                lessonId: lessonId || '',
                                mediaWidth: '100%',
                                mediaAlign: 'center',
                            },
                        });
                    } else if (url) {
                        insertMediaBlock(editor, {
                            type: 'youtube',
                            attrs: {
                                src: getYoutubeEmbedUrl(url),
                                mediaWidth: '100%',
                                mediaAlign: 'center',
                            },
                        });
                    }
                }}
            />

            <div className="max-w-[700px] mx-auto px-4 sm:px-6 pt-8 pb-40">
                {uploadState !== 'idle' && (
                    <div
                        role={uploadState === 'error' ? 'alert' : 'status'}
                        className={`mb-5 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm ${uploadState === 'error'
                            ? 'border-destructive/25 bg-destructive/10 text-destructive'
                            : uploadState === 'success'
                                ? 'border-success/25 bg-success/10 text-success'
                                : 'border-primary/25 bg-primary/10 text-primary'
                            }`}
                    >
                        {uploadState === 'uploading' && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />}
                        {uploadState === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                        {uploadState === 'error' && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                        <p className="min-w-0 flex-1 font-medium leading-5">{uploadMessage}</p>
                        {uploadState === 'error' && (
                            <button
                                type="button"
                                onClick={() => {
                                    setUploadState('idle');
                                    setUploadMessage('');
                                }}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-current/10"
                                aria-label="Скрыть ошибку"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}
                <article className="min-h-[70vh] flex flex-col">
                    <div className="flex-1">
                        <EditorContent editor={editor} className="cursor-text" />
                    </div>

                    <div className="mt-16 flex items-center justify-end pt-8">
                        <div className="flex items-center gap-2 text-muted-foreground/50 select-none">
                            <span className="material-symbols-outlined text-[16px]">cloud_done</span>
                            <span className="text-[10px] font-semibold">Сохранено</span>
                        </div>
                    </div>
                </article>
            </div>
        </div>
    );
};
