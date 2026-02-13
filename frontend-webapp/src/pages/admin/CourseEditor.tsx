import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Plus,
    ChevronRight,
    Settings,
    MoreVertical,
    Trash2,
    Sparkles
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../api/client';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import { Label } from "../../components/ui/label";
import { Skeleton } from '../../components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { cn } from '../../lib/utils';

// --- Sub-components (Exact Mockup Port) ---

const SortableModule = ({
    module,
    isExpanded,
    onToggle,
    onAddLesson,
    onEditSettings,
    onTogglePublish,
    courseId
}: {
    module: any,
    isExpanded: boolean,
    onToggle: () => void,
    onAddLesson: () => void,
    onEditSettings: () => void,
    onTogglePublish: (id: string, published: boolean) => void,
    courseId: string
}) => {

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: module.id });

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
                    "cursor-grab active:cursor-grabbing transition-all duration-200 rounded-xl p-4 flex items-center justify-between border",
                    isExpanded
                        ? "bg-card border-slate-200 dark:border-slate-700 shadow-sm z-10 relative"
                        : "bg-muted/50 dark:bg-slate-800/50 border-transparent opacity-80"
                )}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                    <span className={cn("material-symbols-outlined text-2xl", isExpanded ? "text-primary" : "text-slate-500")} style={isExpanded ? { fontVariationSettings: "'FILL' 1" } : {}}>
                        {isExpanded ? 'folder_open' : 'folder'}
                    </span>
                    <h3 className={cn("font-bold text-sm tracking-tight truncate", !isExpanded && "text-slate-600 dark:text-slate-400")}>
                        {module.title}
                    </h3>
                    {module.is_vip && (
                        <span className="flex items-center gap-1 bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-indigo-500/20 tracking-widest">
                            <Sparkles size={8} /> VIP
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded transition-colors",
                        isExpanded ? "text-primary bg-primary/10" : "text-slate-500 bg-slate-300 dark:bg-slate-700"
                    )}>
                        {module.lessons?.length || 0} Lessons
                    </span>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
                                <MoreVertical size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-card border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2">
                            <DropdownMenuItem onClick={onEditSettings} className="rounded-lg gap-3 py-2 cursor-pointer">
                                <Settings size={14} className="text-slate-400" />
                                <span className="font-bold text-[11px] uppercase tracking-wider">Settings</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onAddLesson} className="rounded-lg gap-3 py-2 cursor-pointer">
                                <Plus size={14} className="text-slate-400" />
                                <span className="font-bold text-[11px] uppercase tracking-wider">Add Page</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <span
                        onClick={onToggle}
                        className={cn("material-symbols-outlined text-slate-400 transition-all duration-300", isExpanded && "rotate-180")}
                    >
                        expand_more
                    </span>
                </div>
            </div>

            {isExpanded && (
                <div className="ml-8 pt-1.5 pb-2 space-y-1.5 border-l-2 border-slate-200 dark:border-slate-800 pl-4 animate-in slide-in-from-top-2 duration-300">
                    <SortableContext
                        items={module.lessons?.map((l: any) => l.id) || []}
                        strategy={verticalListSortingStrategy}
                    >
                        {module.lessons?.map((lesson: any) => (
                            <SortableLesson
                                key={lesson.id}
                                lesson={lesson}
                                courseId={courseId}
                                onTogglePublish={onTogglePublish}
                            />
                        ))}
                    </SortableContext>

                    <div className="flex gap-2 pt-1 pr-2">
                        <button
                            onClick={onAddLesson}
                            className="flex-1 py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-400 flex items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            ADD LESSON
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

import { Switch } from '../../components/ui/switch';

const SortableLesson = ({ lesson, courseId, onTogglePublish }: { lesson: any, courseId: string, onTogglePublish: (id: string, published: boolean) => void }) => {
    const navigate = useNavigate();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: lesson.id });

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
                        {!lesson.is_published && <span className="ml-2 text-[9px] uppercase tracking-widest text-muted-foreground font-black">Draft</span>}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <Switch
                        checked={lesson.is_published}
                        onCheckedChange={(checked) => onTogglePublish(lesson.id, checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="scale-75 data-[state=checked]:bg-blue-500"
                    />
                    <ChevronRight size={14} className="text-slate-300" />
                </div>
            </div>
        </div>
    );
};

export const CourseEditor: React.FC = () => {
    const { id: courseId } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState<any>(null);
    const [modules, setModules] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
    const [editingModule, setEditingModule] = useState<any>(null);
    const [moduleForm, setModuleForm] = useState({ title: '', unlock_type: 'immediate', unlock_value: '', is_vip: false });

    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchCourseData();
        // Guard background color against Telegram theme overrides
        const originalBg = document.body.style.backgroundColor;

        // Use the same appearance detection as in App.tsx
        const isDark = document.documentElement.classList.contains('dark') ||
            (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        document.body.style.backgroundColor = isDark ? '#101622' : '#f6f6f8';

        return () => {
            document.body.style.backgroundColor = originalBg;
        };
    }, [courseId]);

    const fetchCourseData = async () => {
        try {
            setIsLoading(true);
            const res = await api.get(`/courses/${courseId}/edit`);
            setCourse(res.data.course);
            setModules(res.data.modules);
            if (res.data.modules) {
                // Expand the first module by default
                if (res.data.modules.length > 0) {
                    setExpandedModules(new Set([res.data.modules[0].id]));
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleModule = (id: string) => {
        const newExpanded = new Set(expandedModules);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedModules(newExpanded);
    };

    const findContainer = (id: string) => {
        if (modules.find(m => m.id === id)) return id;
        return modules.find(m => m.lessons.some((l: any) => l.id === id))?.id;
    };

    const handleDragOver = (event: any) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        // Find the containers
        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        // If we're dragging a lesson into another module
        const activeModuleIdx = modules.findIndex(m => m.id === activeContainer);
        const overModuleIdx = modules.findIndex(m => m.id === overContainer);

        if (activeModuleIdx === -1 || overModuleIdx === -1) return;

        // Check if it's a lesson we're dragging (not a module)
        const isLesson = modules[activeModuleIdx].lessons.find((l: any) => l.id === activeId);
        if (!isLesson) return;

        setModules((prev) => {
            const activeLessons = prev[activeModuleIdx].lessons;
            const overLessons = prev[overModuleIdx].lessons;

            const activeIndex = activeLessons.findIndex((l: any) => l.id === activeId);
            let overIndex = overLessons.findIndex((l: any) => l.id === overId);

            if (overIndex === -1) overIndex = overLessons.length;

            const newModules = [...prev];
            const [movedItem] = newModules[activeModuleIdx].lessons.splice(activeIndex, 1);
            newModules[overModuleIdx].lessons.splice(overIndex, 0, { ...movedItem, module_id: overContainer });

            return newModules;
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer) return;

        if (activeId !== overId) {
            // Case 1: Reordering Modules
            if (activeId === activeContainer && overId === overContainer) {
                const oldIndex = modules.findIndex(m => m.id === activeId);
                const newIndex = modules.findIndex(m => m.id === overId);
                const newModules = arrayMove(modules, oldIndex, newIndex);
                setModules(newModules);

                try {
                    await api.post(`/courses/reorder/modules`, {
                        items: newModules.map((m, idx: number) => ({ id: m.id, order_index: idx }))
                    });
                } catch (err) {
                    console.error('Reorder modules failed:', err);
                    fetchCourseData();
                }
                return;
            }

            // Case 2: Reordering Lessons (Same or Cross Module)
            const activeModuleIdx = modules.findIndex(m => m.id === activeContainer);
            const overModuleIdx = modules.findIndex(m => m.id === overContainer);

            if (activeModuleIdx === -1 || overModuleIdx === -1) return;

            const oldIndex = modules[activeModuleIdx].lessons.findIndex((l: any) => l.id === activeId);
            const newIndex = modules[overModuleIdx].lessons.findIndex((l: any) => l.id === overId);

            if (activeContainer === overContainer) {
                // Same module reorder
                const newLessons = arrayMove(modules[activeModuleIdx].lessons, oldIndex, newIndex);
                const newModules = [...modules];
                newModules[activeModuleIdx].lessons = newLessons;
                setModules(newModules);

                try {
                    await api.post(`/courses/reorder/lessons`, {
                        items: newLessons.map((l: any, idx: number) => ({ id: l.id, order_index: idx }))
                    });
                } catch (err) {
                    console.error('Lesson reorder failed:', err);
                    fetchCourseData();
                }
            } else {
                // Cross-module reorder (handled by onDragOver for state, just sync here)
                const movedLesson = modules[overModuleIdx].lessons.find((l: any) => l.id === activeId);
                if (!movedLesson) return;

                try {
                    // Update the module_id of the moved lesson
                    await api.patch(`/courses/lessons/${activeId}`, { module_id: overContainer });

                    // Reorder lessons in the target module
                    await api.post(`/courses/reorder/lessons`, {
                        items: modules[overModuleIdx].lessons.map((l: any, idx: number) => ({ id: l.id, order_index: idx }))
                    });
                } catch (err) {
                    console.error('Cross-module move failed:', err);
                    fetchCourseData();
                }
            }
        }
    };

    const saveModule = async () => {
        try {
            if (editingModule) {
                const res = await api.patch(`/courses/modules/${editingModule.id}`, moduleForm);
                setModules(modules.map(m => m.id === editingModule.id ? { ...m, ...res.data, lessons: m.lessons } : m));
            } else {
                const res = await api.post(`/courses/${courseId}/modules`, moduleForm);
                setModules([...modules, { ...res.data, lessons: [] }]);
                setExpandedModules(prev => new Set([...Array.from(prev), res.data.id]));
            }
            setIsModuleModalOpen(false);
            setEditingModule(null);
            setModuleForm({ title: '', unlock_type: 'immediate', unlock_value: '', is_vip: false });
        } catch (err) {
            console.error(err);
        }
    };

    const handleTogglePublish = async (lessonId: string, isPublished: boolean) => {
        try {
            // Optimistic update
            const updatedModules = modules.map(m => ({
                ...m,
                lessons: m.lessons.map((l: any) => l.id === lessonId ? { ...l, is_published: isPublished } : l)
            }));
            setModules(updatedModules);

            await api.patch(`/courses/lessons/${lessonId}`, { is_published: isPublished });
        } catch (err) {
            console.error('Failed to toggle publish:', err);
            // Revert on error
            fetchCourseData();
        }
    };

    if (isLoading) return (
        <div className="min-h-screen bg-background p-6 space-y-8 max-w-xl mx-auto">
            <div className="flex items-center gap-4 pb-8 border-b ios-blur">
                <Skeleton className="h-10 w-10 btn-rounded" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl opacity-60" />
                <Skeleton className="h-16 w-full rounded-xl opacity-30" />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-500">
            {/* Header Sticky (Mockup Style) */}
            <header className="sticky top-0 z-50 bg-background/80 ios-blur border-b border-slate-200 dark:border-slate-800 px-4 pt-6 pb-4">
                <div className="max-w-xl mx-auto flex items-center gap-3">
                    <button
                        onClick={() => navigate('/courses')}
                        className="p-1 -ml-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold tracking-tight truncate">{course?.title || 'Course Editor'}</h1>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Course Curriculum</p>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 py-6 space-y-3">

                {modules.length === 0 ? (
                    <div className="py-24 text-center flex flex-col items-center justify-center space-y-6 bg-slate-50 dark:bg-slate-900/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-4xl">folder_off</span>
                        </div>
                        <div className="space-y-1 max-w-[240px]">
                            <p className="text-sm font-bold">Curriculum is Empty</p>
                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Add your first module manually to start building your course.</p>
                        </div>
                        <Button
                            onClick={() => setIsModuleModalOpen(true)}
                            variant="secondary"
                            className="rounded-xl h-10 px-6 font-bold text-xs uppercase tracking-widest"
                        >
                            <Plus size={14} className="mr-2" /> New Module
                        </Button>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {modules.map((module) => (
                                    <SortableModule
                                        key={module.id}
                                        module={module}
                                        courseId={courseId!}
                                        isExpanded={expandedModules.has(module.id)}
                                        onToggle={() => toggleModule(module.id)}
                                        onAddLesson={() => navigate(`/courses/${courseId}/lessons/new?moduleId=${module.id}`)}
                                        onTogglePublish={handleTogglePublish}
                                        onEditSettings={() => {
                                            setEditingModule(module);
                                            setModuleForm({ title: module.title, unlock_type: module.unlock_type, unlock_value: module.unlock_value?.toString() || '', is_vip: module.is_vip || false });
                                            setIsModuleModalOpen(true);
                                        }}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}

                <button
                    onClick={() => setIsModuleModalOpen(true)}
                    className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/20 hover:border-slate-400 dark:hover:border-slate-600 transition-all active:scale-[0.98] mt-4"
                >
                    <span className="material-symbols-outlined">create_new_folder</span>
                    ADD NEW MODULE
                </button>
            </main>


            <Dialog open={isModuleModalOpen} onOpenChange={(open) => { if (!open) { setIsModuleModalOpen(false); setEditingModule(null); } }}>
                <DialogContent className="max-w-md p-0 overflow-hidden rounded-[32px] border border-border/50 shadow-2xl bg-card text-foreground">
                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black uppercase tracking-widest">
                                {editingModule ? 'Edit Module' : 'New Module'}
                            </h3>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Title</Label>
                                <Input
                                    placeholder="Enter title..."
                                    className="h-12 bg-muted/30 border-border rounded-xl p-4 text-sm font-medium focus:ring-1 focus:ring-primary transition-all"
                                    value={moduleForm.title}
                                    onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/50">
                                <div className="space-y-0.5">
                                    <Label className="text-[10px] uppercase font-black tracking-widest text-foreground">VIP Access Only</Label>
                                    <p className="text-[10px] text-muted-foreground">Restrict content to VIP group members</p>
                                </div>
                                <Switch
                                    checked={moduleForm.is_vip}
                                    onCheckedChange={(checked) => setModuleForm({ ...moduleForm, is_vip: checked })}
                                />
                            </div>

                            <div className="space-y-4 p-4 bg-muted/20 rounded-2xl border border-border/50">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Unlock Strategy</Label>
                                    <select
                                        value={moduleForm.unlock_type}
                                        onChange={(e) => setModuleForm({ ...moduleForm, unlock_type: e.target.value })}
                                        className="w-full h-10 bg-background border border-border rounded-lg px-3 text-xs font-bold"
                                    >
                                        <option value="immediate">Immediate Availability</option>
                                        <option value="level_based">Level Requirement</option>
                                        <option value="time_relative">Time Delay (Days)</option>
                                    </select>
                                </div>

                                {moduleForm.unlock_type !== 'immediate' && (
                                    <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
                                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">
                                            {moduleForm.unlock_type === 'level_based' ? 'Required Level' : 'Days after Joining'}
                                        </Label>
                                        <Input
                                            type="number"
                                            placeholder="Enter value..."
                                            className="h-10 bg-background border-border rounded-lg p-3 text-xs font-bold"
                                            value={moduleForm.unlock_value}
                                            onChange={(e) => setModuleForm({ ...moduleForm, unlock_value: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-4">
                            <Button
                                onClick={saveModule}
                                disabled={!moduleForm.title}
                                className="h-12 bg-primary text-white hover:bg-primary/90 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                            >
                                {editingModule ? 'Save Changes' : 'Create Module'}
                            </Button>

                            {editingModule && (
                                <Button
                                    variant="ghost"
                                    className="h-12 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl font-bold uppercase text-[9px] tracking-widest"
                                    onClick={async () => {
                                        if (!confirm('Delete module and all lessons inside?')) return;
                                        await api.delete(`/courses/modules/${editingModule.id}`);
                                        setModules(modules.filter(m => m.id !== editingModule.id));
                                        setIsModuleModalOpen(false);
                                    }}
                                >
                                    <Trash2 size={14} className="mr-2" /> Delete Permanently
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                onClick={() => setIsModuleModalOpen(false)}
                                className="h-10 text-muted-foreground/60 hover:text-foreground font-bold uppercase text-[10px] tracking-widest transition-colors"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
