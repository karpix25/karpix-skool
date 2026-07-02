import React, { lazy, Suspense, useState } from 'react';
import { Editor } from '@tiptap/react';
import { LinkModal } from './MediaModals';

const VideoModal = lazy(() =>
    import('./VideoModal').then((module) => ({
        default: module.VideoModal,
    }))
);

interface FloatingToolbarProps {
    editor: Editor | null;
    onAddImage: () => void;
    hasVideo?: boolean;
    lessonId?: string;
    onAddVideo?: (url: string, type?: 'youtube' | 'mux', playbackId?: string) => void;
}

type ToolbarTab = 'style' | 'insert' | 'media';

const LessonEditorFloatingToolbar: React.FC<FloatingToolbarProps> = ({
    editor,
    onAddImage,
    hasVideo = false,
    lessonId,
    onAddVideo
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
                    label: '', command: 'insertVideo', icon: 'smart_display', tooltip: hasVideo ? 'Video already added' : 'Video', action: () => {
                        if (!hasVideo) setIsVideoModalOpen(true);
                    }, isActive: () => hasVideo
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
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 active:scale-[0.98] group focus:outline-none focus:ring-2 focus:ring-ring/25 ${isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                title={tool.tooltip}
                aria-label={tool.tooltip || tool.label || tool.command}
                aria-pressed={isActive}
            >
                {tool.label ? (
                    <span className="font-bold text-xs">{tool.label}</span>
                ) : (
                    <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
                )}

                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-[10px] rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[110]">
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
            {isVideoModalOpen && (
                <Suspense fallback={null}>
                    <VideoModal
                        isOpen={isVideoModalOpen}
                        onClose={() => setIsVideoModalOpen(false)}
                        lessonId={lessonId}
                        onConfirm={(url, type, playbackId) => {
                            if (onAddVideo) onAddVideo(url, type, playbackId!);
                        }}
                    />
                </Suspense>
            )}

            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-4 w-full sm:w-auto animate-in slide-in-from-bottom-6 duration-500 ease-out">
                {/* Mobile: Tabbed View */}
                <div className="sm:hidden bg-card/95 backdrop-blur-xl shadow-md rounded-2xl border border-border p-1.5 flex items-center overflow-hidden">
                    <div className="flex bg-muted rounded-lg p-1 mr-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setActiveTab(tab.id);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors duration-200 shrink-0 ${activeTab === tab.id
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                            </button>
                        ))}
                    </div>
                    <div className="w-[1px] h-6 bg-border mr-2" />
                    <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                        {allGroups.find(g => g.id === activeTab)?.tools.map(renderButton)}
                    </div>
                </div>

                {/* Desktop: Full Row View */}
                <div className="hidden sm:flex bg-card/95 backdrop-blur-xl shadow-md rounded-2xl border border-border p-1.5 items-center gap-1">
                    {allGroups.map((group, gIdx) => (
                        <React.Fragment key={group.id}>
                            <div className="flex items-center gap-1 px-1">
                                {group.tools.map(renderButton)}
                            </div>
                            {gIdx < allGroups.length - 1 && (
                                <div className="w-[1px] h-6 bg-border mx-1" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </>
    );
};

export default LessonEditorFloatingToolbar;
