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
import GeminiSuggestionModal from '../components/courses/GeminiSuggestionModal';
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
import { Progress } from '../../components/ui/progress';
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
    onAddAISuggestion,
    onEditSettings,
    onLessonDragEnd,
    courseId
}: {
    module: any,
    isExpanded: boolean,
    onToggle: () => void,
    onAddLesson: () => void,
    onAddAISuggestion: () => void,
    onEditSettings: () => void,
    onLessonDragEnd: (event: DragEndEvent) => void,
    courseId: string
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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
                        ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm z-10 relative"
                        : "bg-slate-200 dark:bg-slate-800/10 border-transparent opacity-80"
                )}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                    <span className={cn("material-symbols-outlined text-2xl", isExpanded ? "text-primary" : "text-slate-500")} style={isExpanded ? { fontVariationSettings: "'FILL' 1" } : {}}>
                        {isExpanded ? 'folder_open' : 'folder'}
                    </span>
                    <h3 className={cn("font-bold text-sm tracking-tight truncate", !isExpanded && "text-slate-600 dark:text-slate-400")}>
                        {module.title}
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded transition-colors",
                        isExpanded ? "text-primary bg-primary/10" : "text-slate-500 bg-slate-300 dark:bg-slate-800"
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
                            <DropdownMenuItem onClick={onAddAISuggestion} className="rounded-lg gap-3 py-2 cursor-pointer text-primary">
                                <Sparkles size={14} />
                                <span className="font-bold text-[11px] uppercase tracking-wider">Gemini Suggest</span>
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
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onLessonDragEnd}>
                        <SortableContext
                            items={module.lessons?.map((l: any) => l.id) || []}
                            strategy={verticalListSortingStrategy}
                        >
                            {module.lessons?.map((lesson: any) => (
                                <SortableLesson key={lesson.id} lesson={lesson} courseId={courseId} />
                            ))}
                        </SortableContext>
                    </DndContext>

                    <div className="flex gap-2 pt-1 pr-2">
                        <button
                            onClick={onAddLesson}
                            className="flex-1 py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            ADD LESSON
                        </button>
                        <button
                            onClick={onAddAISuggestion}
                            className="w-10 py-2 border border-dashed border-primary/20 rounded-lg text-primary flex items-center justify-center hover:bg-primary/5 transition-all"
                        >
                            <Sparkles size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const SortableLesson = ({ lesson, courseId }: { lesson: any, courseId: string }) => {
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

    const getBadgeStyles = (type: string) => {
        switch (type) {
            case 'FREE': return 'bg-green-500/10 text-green-500';
            case 'LEVEL_BASED': return 'bg-primary/20 text-primary';
            case 'TIME_RELATIVE': return 'bg-amber-500/10 text-amber-500';
            default: return 'hidden';
        }
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("flex items-center gap-2", isDragging && "opacity-50")}>
            <div
                {...attributes}
                {...listeners}
                onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.id}`)}
                className="flex-1 p-3 rounded-lg flex items-center justify-between transition-all bg-white dark:bg-[#192233] border border-slate-100 dark:border-slate-800 shadow-sm hover:translate-x-1 cursor-grab active:cursor-grabbing"
            >
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg text-slate-400">
                        {lesson.icon || 'description'}
                    </span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {lesson.title}
                        {!lesson.is_published && <span className="ml-2 text-[9px] uppercase tracking-widest opacity-40 font-black">Draft</span>}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {lesson.type && lesson.type !== 'STANDARD' && (
                        <span className={cn("text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded", getBadgeStyles(lesson.type))}>
                            {lesson.type}
                        </span>
                    )}
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
    const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
    const [targetModuleId, setTargetModuleId] = useState<string | null>(null);

    const [editingModule, setEditingModule] = useState<any>(null);
    const [moduleForm, setModuleForm] = useState({ title: '', unlock_type: 'immediate', unlock_value: '' });

    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchCourseData();
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

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = modules.findIndex(m => m.id === active.id);
            const newIndex = modules.findIndex(m => m.id === over.id);
            const newModules = arrayMove(modules, oldIndex, newIndex);
            setModules(newModules);

            try {
                await api.post(`/courses/reorder/modules`, {
                    items: newModules.map((m, idx) => ({ id: m.id, order_index: idx }))
                });
            } catch (err) {
                console.error('Reorder failed:', err);
            }
        }
    };

    const handleLessonDragEnd = async (moduleId: string, event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const moduleIdx = modules.findIndex(m => m.id === moduleId);
            const lessons = modules[moduleIdx].lessons;
            const oldIndex = lessons.findIndex((l: any) => l.id === active.id);
            const newIndex = lessons.findIndex((l: any) => l.id === over.id);
            const newLessons = arrayMove(lessons, oldIndex, newIndex);

            const newModules = [...modules];
            newModules[moduleIdx].lessons = newLessons;
            setModules(newModules);

            try {
                await api.post(`/courses/reorder/lessons`, {
                    items: newLessons.map((l: any, idx) => ({ id: l.id, order_index: idx }))
                });
            } catch (err) {
                console.error('Lesson reorder failed:', err);
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
            setModuleForm({ title: '', unlock_type: 'immediate', unlock_value: '' });
        } catch (err) {
            console.error(err);
        }
    };

    const handleAISuggestion = (moduleId: string) => {
        setTargetModuleId(moduleId);
        setIsSuggestionModalOpen(true);
    };

    const handleAddAISuggestion = async (suggestion: { title: string; type: any; icon: string }) => {
        if (!targetModuleId || !courseId) return;
        try {
            await api.post(`/courses/modules/${targetModuleId}/lessons`, {
                title: suggestion.title,
                content: '<h1>' + suggestion.title + '</h1><p>Lesson content generated via AI suggestion.</p>',
                is_published: false
            });

            fetchCourseData();
            setIsSuggestionModalOpen(false);
        } catch (err) {
            console.error(err);
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
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 pt-6 pb-4">
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
                    <button
                        onClick={() => setIsModuleModalOpen(true)}
                        className="bg-primary/10 text-primary p-2 rounded-full hover:bg-primary/20 transition-all active:scale-95 flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined">add</span>
                    </button>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 py-6 space-y-3">
                {/* Course Health (Simplified Mockup style integration) */}
                <div className="px-1 pb-4">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Global Progress</span>
                        <span className="text-[10px] font-black text-primary">{course?.progress_percent || 0}%</span>
                    </div>
                    <Progress value={course?.progress_percent || 0} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
                </div>

                {modules.length === 0 ? (
                    <div className="py-24 text-center flex flex-col items-center justify-center space-y-6 bg-slate-50 dark:bg-slate-900/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-4xl">folder_off</span>
                        </div>
                        <div className="space-y-1 max-w-[240px]">
                            <p className="text-sm font-bold">Curriculum is Empty</p>
                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Add your first module manually or use Gemini AI to generate a structure.</p>
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
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                                        onAddAISuggestion={() => handleAISuggestion(module.id)}
                                        onEditSettings={() => {
                                            setEditingModule(module);
                                            setModuleForm({ title: module.title, unlock_type: module.unlock_type, unlock_value: module.unlock_value?.toString() || '' });
                                            setIsModuleModalOpen(true);
                                        }}
                                        onLessonDragEnd={(event) => handleLessonDragEnd(module.id, event)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}

                <button
                    onClick={() => setIsModuleModalOpen(true)}
                    className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-[11px] font-black uppercase text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/20 hover:border-slate-400 dark:hover:border-slate-600 transition-all active:scale-[0.98] mt-4"
                >
                    <span className="material-symbols-outlined">create_new_folder</span>
                    ADD NEW MODULE
                </button>
            </main>

            {/* AI Suggestion Modal */}
            {isSuggestionModalOpen && (
                <GeminiSuggestionModal
                    onClose={() => setIsSuggestionModalOpen(false)}
                    onAdd={handleAddAISuggestion}
                />
            )}

            {/* Module Dialog - Redesigned to match brand */}
            <Dialog open={isModuleModalOpen} onOpenChange={(open) => { if (!open) { setIsModuleModalOpen(false); setEditingModule(null); } }}>
                <DialogContent className="max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl bg-white dark:bg-slate-900">
                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black uppercase tracking-widest">
                                {editingModule ? 'Edit Module' : 'New Module'}
                            </h3>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Title</Label>
                                <Input
                                    placeholder="Enter title..."
                                    className="h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm font-medium focus:ring-1 focus:ring-primary"
                                    value={moduleForm.title}
                                    onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                                />
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
                                className="h-10 text-slate-400 font-bold uppercase text-[10px] tracking-widest"
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
