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
    Youtube as YoutubeIcon,
    Heading1,
    Heading2,
    Heading3
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

interface Props {
    title?: string;
    content: string;
    onChange: (content: string) => void;
}

const ToolbarButton = React.memo(({ onClick, active = false, children, title }: any) => (
    <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={onClick}
        title={title}
        className={cn(
            "h-9 w-9 rounded-lg transition-all",
            active
                ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                : "text-muted-foreground hover:bg-muted font-bold"
        )}
    >
        {children}
    </Button>
));

export const RichTextEditor: React.FC<Props> = ({ title, content, onChange }) => {
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
                    class: 'text-primary underline cursor-pointer hover:text-primary/80 transition-colors font-bold',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-2xl border border-muted shadow-sm my-8 max-w-full h-auto',
                },
            }),
            Youtube.configure({
                width: 800,
                height: 450,
                HTMLAttributes: {
                    class: 'rounded-[32px] border-4 border-muted shadow-lg my-10 aspect-video w-full max-w-3xl mx-auto overflow-hidden',
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
                class: 'prose prose-sm md:prose-base max-w-none focus:outline-none min-h-[500px] px-8 py-10 text-foreground leading-relaxed'
            }
        }
    });

    useEffect(() => {
        return () => {
            if (editor && (editor as any)._changeTimer) {
                clearTimeout((editor as any)._changeTimer);
            }
        };
    }, [editor]);

    const addImage = useCallback(() => {
        fileInputRef.current?.click();
    }, [fileInputRef]);

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
        <div className="bg-card border-none rounded-[32px] overflow-hidden shadow-sm animate-in fade-in duration-500">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
            />

            {/* Toolbar */}
            <div className="bg-muted/30 border-b border-border p-2.5 flex flex-wrap gap-1 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center border-r border-border pr-2 mr-1 gap-1">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}><Heading1 size={18} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><Heading2 size={18} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}><Heading3 size={18} /></ToolbarButton>
                </div>

                <div className="flex items-center border-r border-border pr-2 mr-1 gap-1">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold size={18} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic size={18} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}><Strikethrough size={18} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}><Code size={18} /></ToolbarButton>
                </div>

                <div className="flex items-center border-r border-border pr-2 mr-1 gap-1">
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List size={18} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered size={18} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote size={18} /></ToolbarButton>
                </div>

                <div className="flex items-center gap-1">
                    <ToolbarButton onClick={addImage}><ImageIcon size={18} /></ToolbarButton>
                    <ToolbarButton onClick={setLink} active={editor.isActive('link')}><LinkIcon size={18} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={18} /></ToolbarButton>
                    <ToolbarButton onClick={addYoutubeVideo}><YoutubeIcon size={18} /></ToolbarButton>
                </div>
            </div>

            {/* Title Display */}
            {title && (
                <div className="px-10 pt-10">
                    <h1 className="text-3xl font-black text-foreground tracking-tight opacity-50 underline decoration-primary decoration-4 underline-offset-8 decoration-skip-ink-none">{title}</h1>
                </div>
            )}

            {/* Editor Area */}
            <div className="bg-card min-h-[600px]">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};
