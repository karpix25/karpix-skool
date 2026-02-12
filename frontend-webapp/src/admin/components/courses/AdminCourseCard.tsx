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
import { Copy, Trash2, Settings } from 'lucide-react';

interface AdminCourseCardProps {
    course: {
        id: string;
        title: string;
        description: string;
        cover_url?: string;
        is_published: boolean;
        modules_count?: number;
    };
    onToggleStatus: (id: string, published: boolean) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
    onEdit: (course: any) => void;
    onClick: (id: string) => void;
}

export const AdminCourseCard: React.FC<AdminCourseCardProps> = ({
    course,
    onToggleStatus,
    onDelete,
    onDuplicate,
    onEdit,
    onClick
}) => {
    const isDraft = !course.is_published;

    return (
        <div
            className={cn(
                "bg-card rounded-2xl overflow-hidden shadow-sm border border-border transition-all duration-300 hover:shadow-md group flex flex-col h-full",
                !course.is_published && "opacity-90"
            )}
        >
            {/* Cover Image Section */}
            <div
                className="aspect-video w-full bg-muted relative overflow-hidden cursor-pointer"
                onClick={() => onClick(course.id)}
            >
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
                    <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                        <BookOpen size={48} />
                    </div>
                )}

                {/* Actions Overlay */}
                <div className="absolute top-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition-colors border border-white/10 outline-none">
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
                            <DropdownMenuItem onClick={() => onDelete(course.id)} className="gap-2 text-destructive focus:text-destructive">
                                <Trash2 className="w-4 h-4" /> Удалить
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {isDraft && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="bg-black/60 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-md border border-white/20 shadow-2xl">
                            Черновик
                        </span>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2 gap-3">
                    <h3
                        className="font-bold text-lg leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary cursor-pointer line-clamp-1"
                        onClick={() => onClick(course.id)}
                    >
                        {course.title}
                    </h3>
                    <span className="text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider bg-secondary text-muted-foreground shrink-0 border border-border/50">
                        {course.modules_count || 0} Modules
                    </span>
                </div>

                <p className="text-xs text-muted-foreground mb-6 line-clamp-2 leading-relaxed flex-1">
                    {course.description || "Описание отсутствует."}
                </p>

                {/* Status Toggle Bar */}
                <div className="bg-secondary/50 rounded-xl px-4 py-3 flex items-center justify-between border border-border/40">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.15em]">
                            STATUS:
                        </span>
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-[0.15em] transition-colors duration-300",
                            course.is_published ? "text-primary" : "text-muted-foreground"
                        )}>
                            {course.is_published ? 'Published' : 'Draft'}
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
