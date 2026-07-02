import { Plus, Settings, MoreVertical, Trash2, Sparkles } from 'lucide-react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '../../../components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { cn } from '../../../lib/utils';
import type { AdminModule } from '../../../types/admin';
import { SortableLesson } from './SortableLesson';

interface SortableModuleProps {
    module: AdminModule;
    isExpanded: boolean;
    onToggle: () => void;
    onAddLesson: () => void;
    onEditSettings: () => void;
    onDeleteModule: (id: string) => void;
    onDeleteLesson: (id: string) => void;
    onTogglePublish: (id: string, published: boolean) => void;
    courseId: string;
}

export const SortableModule = ({
    module,
    isExpanded,
    onToggle,
    onAddLesson,
    onEditSettings,
    onDeleteModule,
    onDeleteLesson,
    onTogglePublish,
    courseId
}: SortableModuleProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: module.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        position: 'relative' as const,
    };

    return (
        <div ref={setNodeRef} style={style} className="min-w-0 space-y-1">
            <div
                {...attributes}
                {...listeners}
                className={cn(
                    "flex min-w-0 cursor-grab items-center justify-between gap-3 rounded-xl border p-3 transition-colors duration-200 active:cursor-grabbing sm:p-4",
                    isExpanded
                        ? "bg-card border-border shadow-sm z-10 relative"
                        : "bg-muted/50 border-border/60 opacity-90"
                )}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                    <span className={cn("material-symbols-outlined shrink-0 text-2xl", isExpanded ? "text-primary" : "text-muted-foreground")} style={isExpanded ? { fontVariationSettings: "'FILL' 1" } : {}}>
                        {isExpanded ? 'folder_open' : 'folder'}
                    </span>
                    <h3 className={cn("min-w-0 truncate text-base font-semibold", !isExpanded && "text-muted-foreground")}>
                        {module.title}
                    </h3>
                    {module.is_vip && (
                        <span className="hidden shrink-0 items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 min-[420px]:flex">
                            <Sparkles size={10} /> VIP
                        </span>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    <span className={cn(
                        "whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                        isExpanded ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"
                    )}>
                        {module.lessons?.length || 0} Уроков
                    </span>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-lg text-muted-foreground transition-all hover:text-foreground">
                                <MoreVertical size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-card border-border rounded-lg shadow-md p-2">
                            <DropdownMenuItem onClick={onEditSettings} className="rounded-lg gap-3 py-2 cursor-pointer">
                                <Settings size={14} className="text-muted-foreground" />
                                <span className="font-bold text-[11px]">Настройки</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onAddLesson} className="rounded-lg gap-3 py-2 cursor-pointer">
                                <Plus size={14} className="text-muted-foreground" />
                                <span className="font-bold text-[11px]">Добавить страницу</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDeleteModule(module.id)} className="rounded-lg gap-3 py-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 size={14} />
                                <span className="font-bold text-[11px]">Удалить модуль</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onToggle();
                        }}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                        aria-label={isExpanded ? 'Свернуть модуль' : 'Развернуть модуль'}
                    >
                        <span className={cn("material-symbols-outlined transition-all duration-300", isExpanded && "rotate-180")}>
                            expand_more
                        </span>
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="ml-2 min-w-0 space-y-1.5 border-l border-border pb-2 pl-2 pt-1.5 animate-in slide-in-from-top-2 duration-300 sm:ml-6 sm:pl-4">
                    <SortableContext items={module.lessons?.map((l) => l.id) || []} strategy={verticalListSortingStrategy}>
                        {module.lessons?.map((lesson) => (
                            <SortableLesson
                                key={lesson.id}
                                lesson={lesson}
                                courseId={courseId}
                                onTogglePublish={onTogglePublish}
                                onDelete={() => onDeleteLesson(lesson.id)}
                            />
                        ))}
                    </SortableContext>

                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={onAddLesson}
                            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors hover:border-primary/25 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                        >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            Добавить урок
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
