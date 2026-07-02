import { useNavigate } from 'react-router-dom';
import { ChevronRight, Gem, GripVertical, Trash2 } from 'lucide-react';
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
    const {
        attributes,
        listeners,
        setActivatorNodeRef,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lesson.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        position: 'relative' as const,
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("flex items-center gap-2", isDragging && "opacity-50")}>
            <div className="flex-1 p-3 rounded-lg flex items-center gap-3 transition-colors bg-card border border-border/70 shadow-sm">
                <button
                    type="button"
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    aria-label={`Перетащить урок: ${lesson.title}`}
                    className="min-h-11 min-w-11 -ml-1 inline-flex items-center justify-center rounded-lg text-muted-foreground transition-colors cursor-grab active:cursor-grabbing hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <GripVertical size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.id}`)}
                    className="min-w-0 flex-1 flex items-center justify-between gap-3 rounded-lg text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <span className="min-w-0 flex items-center gap-3">
                        <span className="material-symbols-outlined text-lg text-muted-foreground">
                            {lesson.icon || 'description'}
                        </span>
                        <span className="min-w-0 text-sm font-medium text-foreground">
                            <span className="truncate align-middle">{lesson.title}</span>
                            {lesson.is_vip && (
                                <span className="ml-2 inline-flex items-center bg-amber-500/10 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-500/20">
                                    <Gem size={10} className="mr-1" />
                                    VIP
                                </span>
                            )}
                            {!lesson.is_published && <span className="ml-2 text-[9px] text-muted-foreground font-black">Черновик</span>}
                        </span>
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-muted-foreground/50" />
                </button>
                <div className="flex items-center gap-3">
                    <Switch
                        checked={lesson.is_published}
                        onCheckedChange={(checked) => onTogglePublish(lesson.id, checked)}
                        className="scale-75 data-[state=checked]:bg-primary"
                    />
                    <button
                        type="button"
                        aria-label={`Удалить урок: ${lesson.title}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Удалить этот урок?')) onDelete();
                        }}
                        className="min-h-11 min-w-11 p-1.5 hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
