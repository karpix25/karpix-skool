import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import {
    Bold, Italic, Strikethrough, Code,
    List, ListOrdered, Quote,
    Image as ImageIcon, Link as LinkIcon, Minus,
    Youtube as YoutubeIcon, AlertCircle, Plus,
    Heading1, Heading2
} from 'lucide-react';

interface Props {
    title?: string;
    content: string;
    onChange: (content: string) => void;
}

// --- Optimized Sub-components ---
const Btn = React.memo(({ onClick, active = false, children, title }: any) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors duration-200 ${active
            ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100'
            : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900 hover:scale-105'
            }`}
    >
        {children}
    </button>
));

const HeadingBtn = React.memo(({ level, active, onClick }: { level: any, active: boolean, onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors duration-200 text-[15px] font-medium tracking-tight h-btn ${active
            ? 'bg-gray-100 text-gray-900 border border-gray-200'
            : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
            }`}
    >
        <span style={{ fontFamily: 'serif' }}>H<sub>{level}</sub></span>
    </button>
));

export const RichTextEditor: React.FC<Props> = ({ title, content, onChange }) => {
    const onChangeRef = useRef(onChange);

    // Update ref when onChange changes
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3, 4],
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline cursor-pointer hover:text-blue-800 transition-colors',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-2xl border border-gray-100 shadow-xl my-8 max-w-full h-auto',
                },
            }),
            Youtube.configure({
                width: 800,
                height: 450,
                HTMLAttributes: {
                    class: 'rounded-3xl border-8 border-white shadow-2xl my-10 aspect-video w-full max-w-3xl mx-auto overflow-hidden',
                },
            }),
        ],
        content: content || '',
        onUpdate: ({ editor }) => {
            // Debounced sync to parent
            const timer = (editor as any)._changeTimer;
            if (timer) clearTimeout(timer);
            (editor as any)._changeTimer = setTimeout(() => {
                onChangeRef.current(editor.getHTML());
            }, 1000); // 1s debounce to keep parent quiet
        },
        editorProps: {
            attributes: {
                class: 'prose prose-xl max-w-none focus:outline-none min-h-[500px] px-12 py-10 text-gray-800 leading-relaxed'
            }
        }
    });

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (editor && (editor as any)._changeTimer) {
                clearTimeout((editor as any)._changeTimer);
            }
        };
    }, [editor]);

    const addImage = useCallback(() => {
        const url = window.prompt('Введите URL изображения');
        if (url) {
            editor?.chain().focus().setImage({ src: url }).run();
        }
    }, [editor]);

    const setLink = useCallback(() => {
        const previousUrl = editor?.getAttributes('link').href;
        const url = window.prompt('Введите URL', previousUrl);

        if (url === null) {
            return;
        }

        if (url === '') {
            editor?.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const addYoutubeVideo = useCallback(() => {
        const url = window.prompt('Введите URL YouTube');

        if (url) {
            editor?.commands.setYoutubeVideo({
                src: url,
                width: 800,
                height: 450,
            });
        }
    }, [editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className="bg-transparent space-y-0">
            {/* Toolbar - Optimized for 2 Rows */}
            <div className="bg-[#F8F8F8] border-b border-gray-100 p-1 flex flex-col sticky top-0 z-50">
                {/* Row 1 */}
                <div className="flex items-center flex-wrap">
                    <div className="flex items-center border-r border-gray-200 pr-1 mr-1">
                        <HeadingBtn level={1} active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
                        <HeadingBtn level={2} active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
                        <HeadingBtn level={3} active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
                        <HeadingBtn level={4} active={editor.isActive('heading', { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} />
                    </div>
                    <div className="flex items-center border-r border-gray-200 pr-1 mr-1">
                        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold size={18} /></Btn>
                        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic size={18} /></Btn>
                        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}><Strikethrough size={18} /></Btn>
                        <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}><Code size={18} /></Btn>
                    </div>
                    <div className="flex items-center">
                        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List size={18} /></Btn>
                    </div>
                </div>

                {/* Row 2 */}
                <div className="flex items-center flex-wrap mt-0.5">
                    <div className="flex items-center border-r border-gray-200 pr-1 mr-1">
                        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered size={18} /></Btn>
                        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote size={18} /></Btn>
                        <Btn title="Code Block" onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}><Code size={18} /></Btn>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <Btn onClick={addImage}><ImageIcon size={18} /></Btn>
                        <Btn onClick={setLink} active={editor.isActive('link')}><LinkIcon size={18} /></Btn>
                        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={18} /></Btn>
                        <Btn onClick={addYoutubeVideo}><YoutubeIcon size={18} /></Btn>
                    </div>
                </div>
            </div>

            {/* Title with Red Underline - Matches Screenshot */}
            {title && (
                <div className="px-6 pt-10 pb-2">
                    <div className="border-b-2 border-red-500 pb-2">
                        <h1 className="text-3xl font-bold text-gray-400">{title}</h1>
                    </div>
                </div>
            )}

            {/* Bubble Menu */}
            {editor && (
                <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex items-center gap-1 bg-gray-900 text-white rounded-2xl p-1.5 shadow-2xl border border-white/10 overflow-hidden backdrop-blur-xl bg-opacity-95 animate-in fade-in zoom-in-95 duration-200">
                    <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded-xl transition-colors hover:bg-white/10 ${editor.isActive('bold') ? 'text-[#F3D382]' : ''}`}><Bold size={16} /></button>
                    <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded-xl transition-colors hover:bg-white/10 ${editor.isActive('italic') ? 'text-[#F3D382]' : ''}`}><Italic size={16} /></button>
                    <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-2 rounded-xl transition-colors hover:bg-white/10 ${editor.isActive('strike') ? 'text-[#F3D382]' : ''}`}><Strikethrough size={16} /></button>
                    <button onClick={setLink} className={`p-2 rounded-xl transition-colors hover:bg-white/10 ${editor.isActive('link') ? 'text-[#F3D382]' : ''}`}><LinkIcon size={16} /></button>
                </BubbleMenu>
            )}

            {/* Floating Menu */}
            {editor && (
                <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex flex-col gap-1 bg-white border border-gray-100 rounded-2xl p-2 shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200">
                    <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-700">
                        <Heading1 size={16} className="text-gray-400" />
                        <span className="text-xs font-bold uppercase tracking-widest">Заголовок 1</span>
                    </button>
                    <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-700">
                        <Heading2 size={16} className="text-gray-400" />
                        <span className="text-xs font-bold uppercase tracking-widest">Заголовок 2</span>
                    </button>
                    <button onClick={addImage} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-700">
                        <ImageIcon size={16} className="text-gray-400" />
                        <span className="text-xs font-bold uppercase tracking-widest">Добавить фото</span>
                    </button>
                    <button onClick={addYoutubeVideo} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-700">
                        <Plus size={16} className="text-gray-400" />
                        <span className="text-xs font-bold uppercase tracking-widest">Добавить видео</span>
                    </button>
                </FloatingMenu>
            )}

            {/* Editor Area */}
            <div className="bg-white min-h-[600px] md:px-6 py-2">
                <EditorContent editor={editor} />
            </div>

            {/* Hint */}
            <div className="flex items-center gap-4 px-10 text-gray-300">
                <div className="flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span className="text-[11px] font-bold uppercase tracking-widest italic opacity-50">Выделите текст для опций</span>
                </div>
                <div className="flex items-center gap-2">
                    <Plus size={14} />
                    <span className="text-[11px] font-bold uppercase tracking-widest italic opacity-50">Нажмите Enter для меню</span>
                </div>
            </div>
        </div>
    );
};
