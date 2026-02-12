
import React from 'react';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LessonEditorHeaderProps {
    title: string;
    courseId: string;
    onPublish: () => void;
    onPreview: () => void;
    isSaving?: boolean;
}

const LessonEditorHeader: React.FC<LessonEditorHeaderProps> = ({
    title,
    courseId,
    onPublish,
    onPreview,
    isSaving
}) => {
    const navigate = useNavigate();

    return (
        <header className="sticky top-0 z-50 flex-none bg-background/80 backdrop-blur-md border-b border-border/40 px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden flex-1 mr-4">
                <button
                    onClick={() => navigate(`/courses/${courseId}`)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors shrink-0 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex flex-col overflow-hidden">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-primary/60">Editor</span>
                    <h1 className="text-xs font-bold leading-tight truncate opacity-60">
                        {title || "Untitled Lesson"}
                    </h1>
                </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
                <div className="hidden sm:flex items-center gap-2 text-muted-foreground mr-2">
                    {isSaving ? (
                        <div className="flex items-center gap-2 opacity-40">
                            <Loader2 size={14} className="animate-spin" />
                            <span className="text-[9px] uppercase tracking-tighter font-bold">Saving</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-primary/40">
                            <span className="material-symbols-outlined text-[16px]">cloud_done</span>
                            <span className="text-[9px] uppercase tracking-tighter font-bold">Autosaved</span>
                        </div>
                    )}
                </div>

                <button
                    onClick={onPreview}
                    className="text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors px-2"
                >
                    Preview
                </button>

                <button
                    onClick={onPublish}
                    disabled={isSaving}
                    className="h-10 px-6 text-[11px] font-black uppercase tracking-widest bg-foreground text-background dark:bg-foreground dark:text-background rounded-full active:scale-95 hover:shadow-lg hover:shadow-primary/5 transition-all disabled:opacity-50"
                >
                    {isSaving ? '...' : 'Publish'}
                </button>
            </div>
        </header>
    );
};

export default LessonEditorHeader;
