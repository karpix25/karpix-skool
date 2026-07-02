import React from 'react';
import { BookOpen, MoreVertical } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Switch } from '../../../components/ui/switch';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { Copy, Trash2, Settings, Megaphone } from 'lucide-react';
import type { AdminCourse } from '../../../types/admin';

interface AdminCourseCardProps {
    course: AdminCourse;
    onToggleStatus: (id: string, published: boolean) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
    onEdit: (course: AdminCourse) => void;
    onClick: (id: string) => void;
    onAnnounce: (course: AdminCourse) => void;
}

export const AdminCourseCard: React.FC<AdminCourseCardProps> = ({
    course,
    onToggleStatus,
    onDelete,
    onDuplicate,
    onEdit,
    onClick,
    onAnnounce
}) => {
    const isDraft = !course.is_published;

    return (
        <div
            className={cn(
                "bg-card rounded-lg overflow-hidden shadow-sm border border-border transition-colors duration-200 hover:border-primary/25 group flex flex-col h-full",
                !course.is_published && "opacity-90"
            )}
        >
            {/* Cover Image Section */}
            <div className="aspect-video w-full bg-muted relative overflow-hidden">
                {course.cover_url ? (
                    <img
                        className={cn(
                            "w-full h-full object-cover transition-transform duration-700 group-hover:scale-105",
                            isDraft && "opacity-70 grayscale-[0.3]"
                        )}
                        src={course.cover_url}
                        alt={course.title}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/25">
                        <BookOpen size={48} />
                    </div>
                )}
                <button
                    type="button"
                    aria-label={`Открыть курс: ${course.title}`}
                    onClick={() => onClick(course.id)}
                    className="absolute inset-0 z-[1] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                    <span className="sr-only">Открыть курс</span>
                </button>

                {/* Actions Overlay */}
                <div className="absolute top-4 right-4 z-20" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label={`Действия курса: ${course.title}`}
                                className="min-h-11 min-w-11 rounded-lg border border-border bg-card/95 p-2 text-foreground shadow-sm outline-none backdrop-blur-md transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring/25"
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => onEdit(course)} className="gap-2">
                                <Settings className="w-4 h-4" /> Параметры
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDuplicate(course.id)} className="gap-2">
                                <Copy className="w-4 h-4" /> Дублировать
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAnnounce(course)} className="gap-2">
                                <Megaphone className="w-4 h-4" /> Анонсировать
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(course.id)} className="gap-2 text-destructive focus:text-destructive">
                                <Trash2 className="w-4 h-4" /> Удалить
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {isDraft && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                        <span className="bg-card/95 text-muted-foreground px-4 py-2 rounded-md text-[10px] font-bold backdrop-blur-md border border-border shadow-sm">
                            Черновик
                        </span>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2 gap-3">
                    <h3 className="min-w-0 flex-1">
                        <button
                            type="button"
                            onClick={() => onClick(course.id)}
                            className="w-full text-left font-bold text-lg leading-tight text-foreground transition-colors group-hover:text-primary cursor-pointer line-clamp-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                            {course.title}
                        </button>
                    </h3>
                    <span className="text-[10px] px-2.5 py-1 rounded-md font-bold bg-secondary text-muted-foreground shrink-0 border border-border/50">
                        {course.lessons_count || 0} Уроков
                    </span>
                </div>

                <p className="text-xs text-muted-foreground mb-6 line-clamp-2 leading-relaxed flex-1">
                    {course.description || "Описание отсутствует."}
                </p>

                {/* Status Toggle Bar */}
                <div className="bg-secondary/50 rounded-lg px-4 py-3 flex items-center justify-between border border-border/40">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-muted-foreground/60">
                            STATUS:
                        </span>
                        <span className={cn(
                            "text-[10px] font-black transition-colors duration-300",
                            course.is_published ? "text-success" : "text-muted-foreground"
                        )}>
                            {course.is_published ? 'Опубликован' : 'Черновик'}
                        </span>
                    </div>

                    <Switch
                        checked={course.is_published}
                        onCheckedChange={(checked) => onToggleStatus(course.id, checked)}
                        className="data-[state=checked]:bg-primary"
                    />
                </div>
            </div>
        </div>
    );
};
