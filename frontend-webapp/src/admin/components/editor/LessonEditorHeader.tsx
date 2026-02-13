import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';

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
    isSaving,
}) => {
    const navigate = useNavigate();

    return (
        <header className="sticky top-0 z-50 flex-none bg-white/70 dark:bg-black/70 backdrop-blur-md border-b border-slate-200/40 dark:border-slate-800/40 px-4 py-3 h-[58px] flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden flex-1 mr-4 min-w-0">
                <button
                    onClick={() => navigate(`/courses/${courseId}`)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex flex-col overflow-hidden min-w-0">
                    <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-slate-400">Editor</span>
                    <h1 className="text-xs font-medium leading-tight truncate opacity-60">
                        {title || "Untitled Lesson"}
                    </h1>
                </div>
            </div>


            <div className="flex items-center gap-4 shrink-0">
                <div className="hidden sm:flex items-center gap-3 text-muted-foreground mr-1">
                    {isSaving ? (
                        <div className="flex items-center gap-2 opacity-40">
                            <Loader2 size={14} className="animate-spin" />
                            <span className="text-[9px] uppercase tracking-tighter font-bold">Saving</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-300 dark:text-slate-700 select-none">
                            <span className="material-symbols-outlined text-[16px]">cloud_done</span>
                            <span className="text-[9px] uppercase tracking-tighter font-bold">Saved</span>
                        </div>
                    )}
                </div>

                <button
                    onClick={onPreview}
                    className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                    Preview
                </button>

                <button
                    onClick={onPublish}
                    disabled={isSaving}
                    className="px-5 py-1.5 text-sm font-semibold bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-full active:scale-95 hover:shadow-lg transition-all disabled:opacity-50"
                >
                    {isSaving ? '...' : 'Publish'}
                </button>
            </div>
        </header>
    );
};

export default LessonEditorHeader;
