import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';

interface LessonEditorHeaderProps {
    title: string;
    courseId: string;
    lessonId?: string;
    onPublish: () => void;
    onDelete?: () => void;
    updatedAt?: string;
    isSaving?: boolean;
}

const LessonEditorHeader: React.FC<LessonEditorHeaderProps> = ({
    title,
    courseId,
    lessonId,
    onPublish,
    onDelete,
    updatedAt,
    isSaving,
}) => {
    const navigate = useNavigate();

    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <header className="sticky top-0 z-50 flex-none bg-background/90 backdrop-blur-md border-b border-border px-4 py-3 h-[58px] flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                <button
                    onClick={() => navigate(`/courses/${courseId}`)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors shrink-0 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex flex-col overflow-hidden min-w-0">
                    <h1 className="text-xs font-bold leading-tight truncate">
                        {title || "Без названия"}
                    </h1>
                    {updatedAt && !isSaving && (
                        <span className="text-[9px] text-muted-foreground/60 font-medium">
                            Изменено: {formatTime(updatedAt)}
                        </span>
                    )}
                </div>
            </div>


            <div className="flex items-center gap-3 shrink-0">
                <div className="hidden xs:flex items-center gap-3 text-muted-foreground mr-1">
                    {isSaving ? (
                        <div className="flex items-center gap-2 opacity-40">
                            <Loader2 size={12} className="animate-spin" />
                            <span className="text-[8px] font-bold">Сохранение</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-muted-foreground/50 select-none">
                            <span className="material-symbols-outlined text-[14px]">cloud_done</span>
                        </div>
                    )}
                </div>

                {lessonId && lessonId !== 'new' && onDelete && (
                    <button
                        onClick={() => {
                            if (confirm('Удалить этот урок?')) onDelete();
                        }}
                        disabled={isSaving}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/15 transition-all active:scale-[0.99] disabled:opacity-50"
                        title="Удалить урок"
                    >
                        <Trash2 size={16} />
                    </button>
                )}

                <button
                    onClick={onPublish}
                    disabled={isSaving}
                    className="px-4 py-1.5 text-xs font-bold bg-primary text-white rounded-lg active:scale-[0.99] shadow-sm transition-all disabled:opacity-50"
                >
                    {isSaving ? '...' : 'ОК'}
                </button>
            </div>
        </header>
    );
};

export default LessonEditorHeader;
