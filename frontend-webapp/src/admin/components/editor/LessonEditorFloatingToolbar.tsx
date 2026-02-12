
import React from 'react';
import {
    Bold,
    Italic,
    List,
    Link as LinkIcon,
    Image as ImageIcon,
    Youtube as YoutubeIcon,
    Code
} from 'lucide-react';
import { Editor } from '@tiptap/react';
import { cn } from '../../../lib/utils';

interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, isActive, children }) => (
    <button
        onClick={(e) => {
            e.preventDefault();
            onClick();
        }}
        className={cn(
            "w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90",
            isActive
                ? "text-primary bg-primary/10"
                : "text-white/60 hover:text-white hover:bg-white/10"
        )}
    >
        {children}
    </button>
);

interface FloatingToolbarProps {
    editor: Editor | null;
    onAddImage: () => void;
    onAddYoutube: () => void;
}

const LessonEditorFloatingToolbar: React.FC<FloatingToolbarProps> = ({
    editor,
    onAddImage,
    onAddYoutube
}) => {
    if (!editor) return null;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#101622]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-[28px] px-5 py-2.5 flex items-center gap-2 border border-white/5 mx-auto">
                <div className="flex items-center gap-1">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive('bold')}
                    >
                        <Bold size={18} strokeWidth={3} />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive('italic')}
                    >
                        <Italic size={18} strokeWidth={3} />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive('bulletList')}
                    >
                        <List size={18} strokeWidth={2.5} />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => {
                            const url = window.prompt('Enter URL');
                            if (url) editor.chain().focus().setLink({ href: url }).run();
                            else if (url === '') editor.chain().focus().unsetLink().run();
                        }}
                        isActive={editor.isActive('link')}
                    >
                        <LinkIcon size={18} strokeWidth={2.5} />
                    </ToolbarButton>
                </div>

                <div className="w-[1px] h-6 bg-white/10 mx-1.5" />

                <div className="flex items-center gap-1">
                    <ToolbarButton
                        onClick={onAddImage}
                    >
                        <ImageIcon size={18} strokeWidth={2.5} />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={onAddYoutube}
                    >
                        <YoutubeIcon size={18} strokeWidth={2.5} />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        isActive={editor.isActive('code')}
                    >
                        <Code size={18} strokeWidth={2.5} />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        isActive={editor.isActive('heading', { level: 2 })}
                    >
                        <div className="font-black text-sm uppercase tracking-tighter">Tt</div>
                    </ToolbarButton>
                </div>
            </div>
        </div>
    );
};

export default LessonEditorFloatingToolbar;
