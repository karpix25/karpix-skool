import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import LessonShareLinkButton from './LessonShareLinkButton';

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
        <header className="sticky top-0 z-50 flex h-16 flex-none items-center justify-between border-b border-border bg-background/90 px-3 py-2 backdrop-blur-md sm:px-4">
            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                <button
                    onClick={() => navigate(`/courses/${courseId}`)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                    aria-label="Вернуться к курсу"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex flex-col overflow-hidden min-w-0">
                    <h1 className="text-xs font-bold leading-tight truncate">
                        {title || "Без названия"}
                    </h1>
                    {updatedAt && !isSaving && (
                        <span className="text-[11px] font-medium text-muted-foreground/70">
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
                            <span className="text-[11px] font-medium">Сохранение</span>
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
                        className="flex h-11 w-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition-all hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 active:scale-[0.99] disabled:opacity-50"
                        title="Удалить урок"
                        aria-label="Удалить урок"
                    >
                        <Trash2 size={16} />
                    </button>
                )}

                <LessonShareLinkButton lessonId={lessonId} disabled={isSaving} />

                <button
                    onClick={onPublish}
                    disabled={isSaving}
                    className="flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 active:scale-[0.99] disabled:opacity-50"
                >
                    {isSaving ? '...' : 'ОК'}
                </button>
            </div>
        </header>
    );
};

export default LessonEditorHeader;
