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
    const hasEmojiIcon = Boolean(lesson.icon_emoji);
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
        <div ref={setNodeRef} style={style} className={cn("w-full min-w-0", isDragging && "opacity-50")}>
            <div className="grid w-full min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border/70 bg-card p-2 shadow-sm transition-colors sm:p-3">
                <button
                    type="button"
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    aria-label={`Перетащить урок: ${lesson.title}`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors cursor-grab active:cursor-grabbing hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <GripVertical size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.id}`)}
                    className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <span className={cn("shrink-0 text-lg text-muted-foreground", !hasEmojiIcon && "material-symbols-outlined")}>
                        {lesson.icon_emoji || lesson.icon || 'description'}
                    </span>
                    <span className="min-w-0 flex-1 text-foreground">
                        <span className="line-clamp-2 block min-w-0 break-words text-sm font-medium leading-5">{lesson.title}</span>
                        {(lesson.is_vip || !lesson.is_published) && (
                            <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                                {lesson.is_vip && (
                                    <span className="inline-flex shrink-0 items-center rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                                        <Gem size={10} className="mr-1" />
                                        VIP
                                    </span>
                                )}
                                {!lesson.is_published && <span className="text-[11px] font-medium text-muted-foreground">Черновик</span>}
                            </span>
                        )}
                    </span>
                    <ChevronRight size={14} className="hidden shrink-0 text-muted-foreground/50 min-[380px]:block" />
                </button>
                <div className="flex shrink-0 items-center gap-1">
                    <span className="flex h-11 w-12 items-center justify-center">
                        <Switch
                            checked={lesson.is_published}
                            onCheckedChange={(checked) => onTogglePublish(lesson.id, checked)}
                        />
                    </span>
                    <button
                        type="button"
                        aria-label={`Удалить урок: ${lesson.title}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Удалить этот урок?')) onDelete();
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
