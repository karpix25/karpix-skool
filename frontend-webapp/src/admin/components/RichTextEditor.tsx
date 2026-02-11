import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import api from '../../api/client';
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
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

interface Props {
    title?: string;
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

export const RichTextEditor: React.FC<Props> = ({ content, onChange }) => {
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
                    class: 'text-[#F5D485] underline font-bold',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-xl shadow-sm my-6 max-w-full h-auto',
                },
            }),
            Youtube.configure({
                width: 800,
                height: 450,
                HTMLAttributes: {
                    class: 'rounded-2xl shadow-lg my-8 aspect-video w-full max-w-3xl mx-auto overflow-hidden',
                },
            }),
        ],
        content: content || '',
        onUpdate: ({ editor }) => {
            const timer = (editor as any)._changeTimer;
            if (timer) clearTimeout(timer);
            (editor as any)._changeTimer = setTimeout(() => {
                onChangeRef.current(editor.getHTML());
            }, 1000);
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm md:prose-lg max-w-none focus:outline-none min-h-[400px] text-foreground leading-relaxed font-medium'
            }
        }
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content || '');
        }
    }, [content, editor]);

    const addImage = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

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

    const setLink = useCallback(() => {
        const previousUrl = editor?.getAttributes('link').href;
        const url = window.prompt('Enter URL', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor?.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const addYoutubeVideo = useCallback(() => {
        const url = window.prompt('Enter YouTube URL');
        if (url) {
            editor?.commands.setYoutubeVideo({
                src: url,
                width: 800,
                height: 450,
            });
        }
    }, [editor]);

    if (!editor) return null;

    return (
        <div className="w-full">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
            />

            {/* Toolbar - Matching Skool/Image Design */}
            <div className="bg-[#F8F9FA] border-b border-border/60 py-1.5 px-4 flex flex-wrap items-center gap-0 sticky top-0 z-50">
                <div className="flex items-center">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}><H1Icon /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><H2Icon /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}><H3Icon /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} active={editor.isActive('heading', { level: 4 })}><H4Icon /></ToolbarButton>
                </div>

                <div className="h-6 w-[1px] bg-border/80 mx-2" />

                <div className="flex items-center">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold size={18} strokeWidth={3} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic size={18} strokeWidth={3} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}><Strikethrough size={18} strokeWidth={2.5} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}><Code size={18} strokeWidth={2.5} /></ToolbarButton>
                </div>

                <div className="h-6 w-[1px] bg-border/80 mx-2" />

                <div className="flex items-center">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List size={18} strokeWidth={2.5} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered size={18} strokeWidth={2.5} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote size={18} strokeWidth={2.5} /></ToolbarButton>
                </div>

                <div className="h-6 w-[1px] bg-border/80 mx-2" />

                <div className="flex items-center">
                    <ToolbarButton onClick={addImage}><ImageIcon size={18} strokeWidth={2.5} /></ToolbarButton>
                    <ToolbarButton onClick={setLink} active={editor.isActive('link')}><LinkIcon size={18} strokeWidth={2.5} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={18} strokeWidth={2.5} /></ToolbarButton>
                    <ToolbarButton onClick={addYoutubeVideo}><YoutubeIcon size={18} strokeWidth={2.5} /></ToolbarButton>
                </div>
            </div>

            {/* Editor Area */}
            <div className="bg-white">
                <EditorContent editor={editor} className="cursor-text" />
            </div>
        </div>
    );
};
