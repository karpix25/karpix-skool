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
        <div ref={setNodeRef} style={style} className="space-y-1">
            <div
                {...attributes}
                {...listeners}
                className={cn(
                    "cursor-grab active:cursor-grabbing transition-colors duration-200 rounded-lg p-4 flex items-center justify-between border",
                    isExpanded
                        ? "bg-card border-border shadow-sm z-10 relative"
                        : "bg-muted/50 border-border/60 opacity-90"
                )}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                    <span className={cn("material-symbols-outlined text-2xl", isExpanded ? "text-primary" : "text-muted-foreground")} style={isExpanded ? { fontVariationSettings: "'FILL' 1" } : {}}>
                        {isExpanded ? 'folder_open' : 'folder'}
                    </span>
                    <h3 className={cn("font-bold text-sm truncate", !isExpanded && "text-muted-foreground")}>
                        {module.title}
                    </h3>
                    {module.is_vip && (
                        <span className="flex items-center gap-1 bg-amber-500/10 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-md border border-amber-500/20">
                            <Sparkles size={8} /> VIP
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded transition-colors",
                        isExpanded ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"
                    )}>
                        {module.lessons?.length || 0} Уроков
                    </span>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground transition-all rounded-lg">
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

                    <span onClick={onToggle} className={cn("material-symbols-outlined text-muted-foreground transition-all duration-300", isExpanded && "rotate-180")}>
                        expand_more
                    </span>
                </div>
            </div>

            {isExpanded && (
                <div className="ml-6 pt-1.5 pb-2 space-y-1.5 border-l border-border pl-4 animate-in slide-in-from-top-2 duration-300">
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

                    <div className="flex gap-2 pt-1 pr-2">
                        <button
                            onClick={onAddLesson}
                            className="flex-1 py-2 border border-dashed border-border rounded-lg text-[11px] font-bold text-muted-foreground flex items-center justify-center gap-1 hover:bg-muted/50 hover:border-primary/25 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            ДОБАВИТЬ УРОК
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
