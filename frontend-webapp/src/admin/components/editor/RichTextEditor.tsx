import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import api from '../../../api/client';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { CustomYoutube } from './CustomYoutube';
import { CustomMux } from './CustomMux';
import LessonEditorFloatingToolbar from './LessonEditorFloatingToolbar';

interface Props {
    lessonId?: string;
    title: string;
    onTitleChange: (title: string) => void;
    content: string;
    onChange: (content: string) => void;
}

export const RichTextEditor: React.FC<Props> = ({ lessonId, title, onTitleChange, content, onChange }) => {
    const onChangeRef = useRef(onChange);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

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
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-lg shadow-sm my-10 max-w-full h-auto border border-border',
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

    const titleRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize title but limit to 2 lines
    useEffect(() => {
        if (titleRef.current) {
            const el = titleRef.current;
            el.style.height = 'auto';

            const style = window.getComputedStyle(el);
            const lineHeight = parseFloat(style.lineHeight);
            const maxHeight = lineHeight * 2;

            const newHeight = Math.min(el.scrollHeight, maxHeight);
            el.style.height = `${newHeight}px`;
        }
    }, [title]);

    useEffect(() => {
        if (!editor) return;

        const currentHTML = editor.getHTML();
        // Only update if prop 'content' is significantly different from current editor HTML
        // This prevents the editor from resetting its cursor or state while the user is typing
        // or during the first render.
        const isBasicallyEmpty = (content === '' || !content) && (currentHTML === '<p></p>' || currentHTML === '');

        if (!isBasicallyEmpty && content !== currentHTML) {
            editor.commands.setContent(content || '', false); // false to not emit update
        }
    }, [content, editor]);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/upload/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const imageUrl = res.data.url;
            if (imageUrl) {
                editor?.chain().focus().setImage({ src: imageUrl }).run();
            }
        } catch (err) {
            console.error('Image upload failed:', err);
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
                accept="image/*"
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
                        editor.chain()
                            .focus()
                            .insertContentAt(0, {
                                type: 'mux',
                                attrs: {
                                    playbackId: playbackId || '',
                                    lessonId: lessonId || ''
                                }
                            })
                            .run();
                    } else if (url) {
                        editor.chain()
                            .focus()
                            .insertContentAt(0, {
                                type: 'youtube',
                                attrs: { src: url }
                            })
                            .run();
                    }
                }}
            />

            <div className="max-w-[700px] mx-auto px-4 sm:px-6 pt-12 pb-40">
                <article className="min-h-[70vh] flex flex-col">
                    <div className="mb-12">
                        <textarea
                            ref={titleRef}
                            value={title}
                            onChange={(e) => {
                                const value = e.target.value;
                                const newlineCount = (value.match(/\n/g) || []).length;
                                if (newlineCount < 2) {
                                    onTitleChange(value);
                                }
                            }}
                            placeholder="Без названия"
                            rows={1}
                            className="w-full text-4xl sm:text-5xl font-semibold bg-transparent border-none focus:ring-0 p-0 placeholder:text-muted-foreground/30 leading-[1.2] resize-none overflow-hidden block"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const newlineCount = (title.match(/\n/g) || []).length;
                                    if (newlineCount >= 1) {
                                        e.preventDefault();
                                    }
                                }
                            }}
                        />
                    </div>

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
