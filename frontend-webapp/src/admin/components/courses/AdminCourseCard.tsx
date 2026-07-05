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
                "group flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-colors duration-200 hover:border-primary/25",
                !course.is_published && "opacity-90"
            )}
        >
            {/* Cover Image Section */}
            <div className="relative aspect-square w-full overflow-hidden bg-muted min-[520px]:aspect-video">
                {course.cover_url ? (
                    <img
                        className={cn(
                            "h-full w-full object-cover transition-transform duration-700 group-hover:scale-105",
                            isDraft && "opacity-70 grayscale-[0.3]"
                        )}
                        src={course.cover_url}
                        alt={course.title}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary/5 text-primary/25">
                        <BookOpen className="h-7 w-7 min-[520px]:h-12 min-[520px]:w-12" />
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
                <div className="absolute right-1.5 top-1.5 z-20 min-[520px]:right-4 min-[520px]:top-4" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label={`Действия курса: ${course.title}`}
                                className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card/95 text-foreground shadow-sm outline-none backdrop-blur-md transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring/25 min-[520px]:h-11 min-[520px]:w-11"
                            >
                                <MoreVertical className="h-4 w-4 min-[520px]:h-5 min-[520px]:w-5" />
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
                    <div className="pointer-events-none absolute inset-x-1.5 bottom-1.5 z-10 flex items-center justify-start min-[520px]:inset-0 min-[520px]:justify-center">
                        <span className="rounded-md border border-border bg-card/95 px-1.5 py-1 text-[9px] font-bold text-muted-foreground shadow-sm backdrop-blur-md min-[520px]:px-4 min-[520px]:py-2 min-[520px]:text-[10px]">
                            Черновик
                        </span>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="flex flex-1 flex-col p-2 min-[520px]:p-5">
                <div className="mb-2 flex items-start justify-between gap-2 min-[520px]:gap-3">
                    <h3 className="min-w-0 flex-1">
                        <button
                            type="button"
                            onClick={() => onClick(course.id)}
                            className="line-clamp-2 w-full cursor-pointer rounded-sm text-left text-[11px] font-semibold leading-4 text-foreground transition-colors group-hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-[520px]:text-lg min-[520px]:font-bold min-[520px]:leading-tight"
                        >
                            {course.title}
                        </button>
                    </h3>
                    <span className="shrink-0 rounded-md border border-border/50 bg-secondary px-1.5 py-1 text-[9px] font-bold text-muted-foreground min-[520px]:px-2.5 min-[520px]:text-[10px]">
                        {course.lessons_count || 0}
                        <span className="hidden min-[520px]:inline"> Уроков</span>
                    </span>
                </div>

                <p className="mb-4 hidden flex-1 text-xs leading-relaxed text-muted-foreground min-[520px]:line-clamp-2">
                    {course.description || "Описание отсутствует."}
                </p>

                {/* Status Toggle Bar */}
                <div className="mt-auto flex items-center justify-end gap-1 rounded-lg border border-border/40 bg-secondary/50 px-1 py-1.5 min-[360px]:justify-between min-[520px]:px-4 min-[520px]:py-3">
                    <div className="hidden min-w-0 min-[360px]:block">
                        <span className="hidden text-[10px] font-black text-muted-foreground/60 min-[520px]:inline">
                            STATUS:
                        </span>
                        <span className={cn(
                            "block truncate text-[9px] font-black transition-colors duration-300 min-[520px]:inline min-[520px]:text-[10px]",
                            course.is_published ? "text-success" : "text-muted-foreground"
                        )}>
                            <span className="min-[520px]:hidden">{course.is_published ? 'Опуб.' : 'Черн.'}</span>
                            <span className="hidden min-[520px]:inline">{course.is_published ? 'Опубликован' : 'Черновик'}</span>
                        </span>
                    </div>

                    <span className="flex h-8 w-10 shrink-0 items-center justify-end overflow-visible min-[520px]:h-11 min-[520px]:w-[52px]">
                        <Switch
                            checked={course.is_published}
                            onCheckedChange={(checked) => onToggleStatus(course.id, checked)}
                            aria-label={course.is_published ? `Снять курс с публикации: ${course.title}` : `Опубликовать курс: ${course.title}`}
                            className="origin-right scale-75 data-[state=checked]:bg-primary min-[520px]:scale-100"
                        />
                    </span>
                </div>
            </div>
        </div>
    );
};
