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
            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                <button
                    onClick={() => navigate(`/courses/${courseId}`)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex flex-col overflow-hidden min-w-0">
                    <h1 className="text-xs font-bold leading-tight truncate">
                        {title || "Без названия"}
                    </h1>
                </div>
            </div>


            <div className="flex items-center gap-3 shrink-0">
                <div className="hidden xs:flex items-center gap-3 text-muted-foreground mr-1">
                    {isSaving ? (
                        <div className="flex items-center gap-2 opacity-40">
                            <Loader2 size={12} className="animate-spin" />
                            <span className="text-[8px] uppercase tracking-tighter font-bold">Сохранение</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-300 dark:text-slate-700 select-none">
                            <span className="material-symbols-outlined text-[14px]">cloud_done</span>
                        </div>
                    )}
                </div>

                <button
                    onClick={onPreview}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                    <span className="material-symbols-outlined text-xl sm:hidden">visibility</span>
                    <span className="hidden sm:inline">Предпросмотр</span>
                </button>

                <button
                    onClick={onPublish}
                    disabled={isSaving}
                    className="px-4 py-1.5 text-xs font-black uppercase tracking-widest bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl active:scale-95 hover:shadow-lg transition-all disabled:opacity-50"
                >
                    {isSaving ? '...' : 'ОК'}
                </button>
            </div>
        </header>
    );
};

export default LessonEditorHeader;
