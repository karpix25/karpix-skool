import { useNavigate } from 'react-router-dom';
import { ChevronRight, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Switch } from '../../../components/ui/switch';
import { cn } from '../../../lib/utils';
import type { AdminLesson } from '../../../types/admin';

interface SortableLessonProps {
    lesson: AdminLesson;
    courseId: string;
    onTogglePublish: (id: string, published: boolean) => void;
    onDelete: () => void;
}

export const SortableLesson = ({ lesson, courseId, onTogglePublish, onDelete }: SortableLessonProps) => {
    const navigate = useNavigate();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        position: 'relative' as const,
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("flex items-center gap-2", isDragging && "opacity-50")}>
            <div
                {...attributes}
                {...listeners}
                onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.id}`)}
                className="flex-1 p-3 rounded-lg flex items-center justify-between transition-all bg-card border border-border/50 shadow-sm hover:translate-x-1 cursor-grab active:cursor-grabbing"
            >
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg text-slate-400">
                        {lesson.icon || 'description'}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                        {lesson.title}
                        {lesson.is_vip && (
                            <span className="ml-2 inline-flex items-center bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-indigo-500/20 tracking-widest">
                                💎 VIP
                            </span>
                        )}
                        {!lesson.is_published && <span className="ml-2 text-[9px] uppercase tracking-widest text-muted-foreground font-black">Черновик</span>}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <Switch
                        checked={lesson.is_published}
                        onCheckedChange={(checked) => onTogglePublish(lesson.id, checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="scale-75 data-[state=checked]:bg-blue-500"
                    />
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Удалить этот урок?')) onDelete();
                        }}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-300 hover:text-rose-500 rounded transition-colors"
                    >
                        <Trash2 size={14} />
                    </div>
                    <ChevronRight size={14} className="text-slate-300" />
                </div>
            </div>
        </div>
    );
};
