import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { LinkModal, VideoModal } from './MediaModals';

interface FloatingToolbarProps {
    editor: Editor | null;
    onAddImage: () => void;
}

type ToolbarTab = 'style' | 'insert' | 'media';

const LessonEditorFloatingToolbar: React.FC<FloatingToolbarProps> = ({
    editor,
    onAddImage,
}) => {
    const [activeTab, setActiveTab] = useState<ToolbarTab>('style');
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

    if (!editor) return null;

    const tabs: { id: ToolbarTab; icon: string; label: string }[] = [
        { id: 'style', icon: 'format_size', label: 'Style' },
        { id: 'insert', icon: 'view_quilt', label: 'Blocks' },
        { id: 'media', icon: 'add_circle', label: 'Media' },
    ];

    const allGroups = [
        {
            id: 'style',
            tools: [
                { label: 'H1', command: 'h1', icon: '', tooltip: 'Heading 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => editor.isActive('heading', { level: 1 }) },
                { label: 'H2', command: 'h2', icon: '', tooltip: 'Heading 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor.isActive('heading', { level: 2 }) },
                { label: 'H3', command: 'h3', icon: '', tooltip: 'Heading 3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => editor.isActive('heading', { level: 3 }) },
                { label: 'B', command: 'bold', icon: '', tooltip: 'Bold', action: () => editor.chain().focus().toggleBold().run(), isActive: () => editor.isActive('bold') },
                { label: 'I', command: 'italic', icon: '', tooltip: 'Italic', action: () => editor.chain().focus().toggleItalic().run(), isActive: () => editor.isActive('italic') },
                { label: '', command: 'strikeThrough', icon: 'strikethrough_s', tooltip: 'Strikethrough', action: () => editor.chain().focus().toggleStrike().run(), isActive: () => editor.isActive('strike') },
                { label: '', command: 'code', icon: 'code', tooltip: 'Inline Code', action: () => editor.chain().focus().toggleCode().run(), isActive: () => editor.isActive('code') },
            ]
        },
        {
            id: 'insert',
            tools: [
                { label: '', command: 'insertUnorderedList', icon: 'format_list_bulleted', tooltip: 'Bullet List', action: () => editor.chain().focus().toggleBulletList().run(), isActive: () => editor.isActive('bulletList') },
                { label: '', command: 'insertOrderedList', icon: 'format_list_numbered', tooltip: 'Numbered List', action: () => editor.chain().focus().toggleOrderedList().run(), isActive: () => editor.isActive('orderedList') },
                { label: '', command: 'blockquote', icon: 'format_quote', tooltip: 'Quote', action: () => editor.chain().focus().toggleBlockquote().run(), isActive: () => editor.isActive('blockquote') },
                { label: '', command: 'formatBlock:pre', icon: 'terminal', tooltip: 'Code Block', action: () => editor.chain().focus().toggleCodeBlock().run(), isActive: () => editor.isActive('codeBlock') },
                { label: '', command: 'insertHorizontalRule', icon: 'horizontal_rule', tooltip: 'Divider', action: () => editor.chain().focus().setHorizontalRule().run(), isActive: () => false },
            ]
        },
        {
            id: 'media',
            tools: [
                { label: '', command: 'insertImage', icon: 'image', tooltip: 'Image', action: onAddImage, isActive: () => false },
                {
                    label: '', command: 'createLink', icon: 'link', tooltip: 'Link', action: () => {
                        setIsLinkModalOpen(true);
                    }, isActive: () => editor.isActive('link')
                },
                {
                    label: '', command: 'insertVideo', icon: 'smart_display', tooltip: 'Video', action: () => {
                        setIsVideoModalOpen(true);
                    }, isActive: () => false
                },
            ]
        }
    ];

    const renderButton = (tool: { label: string; command: string; icon: string; tooltip?: string; action: () => void; isActive: () => boolean }) => {
        const isActive = tool.isActive();
        return (
            <button
                key={tool.command}
                onClick={(e) => {
                    e.preventDefault();
                    tool.action();
                }}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-90 shrink-0 group relative ${isActive
                    ? 'text-blue-500 bg-blue-500/15'
                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                title={tool.tooltip}
            >
                {tool.label ? (
                    <span className="font-bold text-xs tracking-tighter">{tool.label}</span>
                ) : (
                    <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
                )}

                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[110]">
                    {tool.tooltip}
                </span>
            </button>
        );
    };

    return (
        <>
            <LinkModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                onConfirm={(url) => {
                    if (url) editor.chain().focus().setLink({ href: url }).run();
                    else editor.chain().focus().unsetLink().run();
                }}
                initialUrl={editor.getAttributes('link').href}
            />
            <VideoModal
                isOpen={isVideoModalOpen}
                onClose={() => setIsVideoModalOpen(false)}
                onConfirm={(url) => {
                    if (url) {
                        editor.commands.setYoutubeVideo({
                            src: url,
                        });
                    }
                }}
            />

            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-4 w-full sm:w-auto animate-in slide-in-from-bottom-6 duration-700 ease-out">
                {/* Mobile: Tabbed View */}
                <div className="sm:hidden bg-white/80 dark:bg-[#0f172a]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[24px] border border-slate-200 dark:border-white/10 p-1.5 flex items-center overflow-hidden">
                    <div className="flex bg-slate-100 dark:bg-white/5 rounded-[18px] p-1 mr-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setActiveTab(tab.id);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-300 shrink-0 ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                            </button>
                        ))}
                    </div>
                    <div className="w-[1px] h-6 bg-slate-200 dark:bg-white/10 mr-2" />
                    <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                        {allGroups.find(g => g.id === activeTab)?.tools.map(renderButton)}
                    </div>
                </div>

                {/* Desktop: Full Row View */}
                <div className="hidden sm:flex bg-white/80 dark:bg-[#0f172a]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-[24px] border border-slate-200 dark:border-white/10 p-1.5 items-center gap-1">
                    {allGroups.map((group, gIdx) => (
                        <React.Fragment key={group.id}>
                            <div className="flex items-center gap-1 px-1">
                                {group.tools.map(renderButton)}
                            </div>
                            {gIdx < allGroups.length - 1 && (
                                <div className="w-[1px] h-6 bg-slate-200 dark:bg-white/10 mx-1" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </>
    );
};

export default LessonEditorFloatingToolbar;
