import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import api from '../../../api/client';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import {
    Bold, Italic, Strikethrough, Code,
    List, ListOrdered, Quote,
    Image as ImageIcon, Link as LinkIcon, Minus,
    Youtube as YoutubeIcon
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import LessonEditorFloatingToolbar from './LessonEditorFloatingToolbar';

interface Props {
    title: string;
    onTitleChange: (title: string) => void;
    content: string;
    onChange: (content: string) => void;
}

const ToolbarButton = React.memo(({ onClick, active = false, children, title, className }: any) => (
    <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={onClick}
        title={title}
        className={cn(
            "h-10 w-10 flex items-center justify-center rounded-none transition-all",
            active
                ? "text-foreground bg-muted/40"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/20",
            className
        )}
    >
        {children}
    </Button>
));

const H1Icon = () => <span className="text-[14px] font-black uppercase">H<sub className="text-[8px] bottom-0 ml-0.5">1</sub></span>;
const H2Icon = () => <span className="text-[14px] font-black uppercase">H<sub className="text-[8px] bottom-0 ml-0.5">2</sub></span>;
const H3Icon = () => <span className="text-[14px] font-black uppercase">H<sub className="text-[8px] bottom-0 ml-0.5">3</sub></span>;
const H4Icon = () => <span className="text-[14px] font-black uppercase">H<sub className="text-[8px] bottom-0 ml-0.5">4</sub></span>;

export const RichTextEditor: React.FC<Props> = ({ title, onTitleChange, content, onChange }) => {
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
                    class: 'rounded-2xl shadow-xl my-10 max-w-full h-auto border-4 border-background ring-1 ring-border/50',
                },
            }),
            Youtube.configure({
                width: 800,
                height: 450,
                HTMLAttributes: {
                    class: 'rounded-[32px] shadow-2xl my-12 aspect-video w-full max-w-3xl mx-auto overflow-hidden ring-1 ring-white/10',
                },
            }),
        ],
        content: content || '',
        onUpdate: ({ editor }) => {
            const timer = (editor as any)._changeTimer;
            if (timer) clearTimeout(timer);
            (editor as any)._changeTimer = setTimeout(() => {
                onChangeRef.current(editor.getHTML());
            }, 500);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[50vh] text-lg md:text-xl leading-relaxed font-medium pb-60 selection:bg-primary/20'
            }
        }
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content || '');
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

    const addYoutubeVideo = useCallback(() => {
        const url = window.prompt('Enter YouTube URL');
        if (url) {
            editor?.commands.setYoutubeVideo({
                src: url,
            });
        }
    }, [editor]);

    return (
        <div className="w-full">
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
                onAddYoutube={addYoutubeVideo}
            />

            <div className="max-w-[700px] mx-auto">
                <div className="pt-16 pb-12">
                    <textarea
                        value={title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        placeholder="Untitled Lesson"
                        rows={1}
                        className="w-full text-5xl font-black bg-transparent border-none focus:ring-0 p-0 placeholder:text-muted-foreground/10 text-foreground tracking-tight leading-[1.1] resize-none overflow-hidden block"
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                        }}
                    />
                </div>

                <div className="min-h-[60vh]">
                    <EditorContent editor={editor} className="cursor-text" />
                </div>
            </div>
        </div>
    );
};
