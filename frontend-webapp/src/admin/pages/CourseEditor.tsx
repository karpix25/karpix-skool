import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Plus,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    GripVertical,
    FolderPlus,
    Folder,
    FileText,
    Settings,
    MoreVertical,
    Trash2,
    Video,
    Type,
    Search,
    Copy
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
import { RichTextEditor } from '../components/RichTextEditor';

import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Label } from "../../components/ui/label";
import { Skeleton } from '../../components/ui/skeleton';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Progress } from '../../components/ui/progress';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { cn } from '../../lib/utils';

// --- Sortable Item Wrapper ---
const SortableItem = ({ id, children }: { id: string, children: React.ReactNode, isModule?: boolean }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        position: 'relative' as const,
    };

    return (
        <div ref={setNodeRef} style={style} className={cn(isDragging && "shadow-2xl opacity-80")}>
            <div className="flex items-center gap-2 group">
                <div
                    {...attributes}
                    {...listeners}
                    className="p-1 text-muted-foreground/20 hover:text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <GripVertical size={14} />
                </div>
                <div className="flex-1">
                    {children}
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

    // Modals
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [isPageEditorOpen, setIsPageEditorOpen] = useState(false);

    // Form States
    const [editingModule, setEditingModule] = useState<any>(null);
    const [moduleForm, setModuleForm] = useState({ title: '', unlock_type: 'immediate', unlock_value: '' });

    const [editingLesson, setEditingLesson] = useState<any>(null);
    const [lessonForm, setLessonForm] = useState({
        title: '',
        video_provider: 'youtube_unlisted',
        video_id: '',
        content: ''
    });

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
            // Default expand all modules on load
            if (res.data.modules) {
                setExpandedModules(new Set(res.data.modules.map((m: any) => m.id)));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleModule = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
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
                setModules(modules.map(m => m.id === editingModule.id ? { ...m, ...res.data } : m));
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

    const saveLesson = async () => {
        try {
            if (editingLesson) {
                const res = await api.patch(`/courses/lessons/${editingLesson.id}`, lessonForm);
                setModules(modules.map(m => ({
                    ...m,
                    lessons: m.lessons.map((l: any) => l.id === editingLesson.id ? { ...l, ...res.data } : l)
                })));
            } else {
                const res = await api.post(`/courses/modules/${editingModule.id}/lessons`, lessonForm);
                setModules(modules.map(m => m.id === editingModule.id ? { ...m, lessons: [...m.lessons, res.data] } : m));
            }
            setIsLessonModalOpen(false);
            setIsPageEditorOpen(false);
            setEditingLesson(null);
            setLessonForm({ title: '', video_provider: 'youtube_unlisted', video_id: '', content: '' });
        } catch (err) {
            console.error(err);
        }
    };

    if (isLoading) return (
        <div className="p-6 md:p-10 space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-8 w-64" />
            </div>
            <div className="space-y-4 pt-10">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-500">
            {/* Header Sticky */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b px-4 h-16 flex items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/courses')} className="text-muted-foreground">
                        <ChevronLeft size={24} />
                    </Button>
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 rounded-lg bg-red-500 text-white font-bold">
                            <AvatarFallback className="bg-red-500 text-white">K</AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-sm">karl</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="text-muted-foreground group">
                        <Search size={20} className="group-hover:text-foreground transition-colors" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground group">
                                <MoreVertical size={20} className="group-hover:text-foreground transition-colors" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/#/course/${courseId}`);
                                alert('Ссылка скопирована!');
                            }}>
                                <Copy size={16} className="mr-2" /> Копировать ссылку
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                                if (modules.length > 0) {
                                    setEditingModule(modules[0]);
                                    setIsLessonModalOpen(true);
                                } else {
                                    alert('Сначала создайте модуль.');
                                }
                            }}>
                                <Plus size={16} className="mr-2" /> Создать страницу
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                                setIsModuleModalOpen(true);
                            }}>
                                <FolderPlus size={16} className="mr-2" /> Создать папку
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="max-w-xl mx-auto p-6 md:p-10 space-y-10">
                {/* Course Info Section */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black text-foreground">{course?.title || 'Курс 1'}</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                            <span className="bg-muted px-2 py-0.5 rounded text-[8px]">{course?.progress_percent || 0}%</span>
                        </div>
                        <Progress value={course?.progress_percent || 0} className="h-8 bg-muted border-none rounded-xl" />
                    </div>
                </div>

                {/* Content List */}
                <div className="space-y-4">
                    {modules.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center justify-center space-y-4 opacity-50 border-2 border-dashed rounded-2xl">
                            <Folder size={48} className="text-muted-foreground/20" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Контент отсутствует</p>
                                <Button variant="link" className="text-xs" onClick={() => setIsModuleModalOpen(true)}>
                                    Создать папку
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-6">
                                    {modules.map((module) => (
                                        <div key={module.id} className="space-y-2">
                                            <SortableItem id={module.id} isModule>
                                                <div className="flex items-center group/module">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground/40 hover:text-foreground shrink-0"
                                                        onClick={() => toggleModule(module.id)}
                                                    >
                                                        {expandedModules.has(module.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                    </Button>
                                                    <div className="flex-1 flex items-center justify-between min-w-0 pr-2">
                                                        <h3
                                                            className="font-black text-base text-foreground truncate cursor-pointer ml-1"
                                                            onClick={() => toggleModule(module.id)}
                                                        >
                                                            {module.title}
                                                        </h3>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/30 opacity-0 group-hover/module:opacity-100 transition-opacity">
                                                                    <MoreVertical size={16} />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => {
                                                                    setEditingModule(module);
                                                                    setModuleForm({ title: module.title, unlock_type: module.unlock_type, unlock_value: module.unlock_value || '' });
                                                                    setIsModuleModalOpen(true);
                                                                }}>
                                                                    <Settings size={14} className="mr-2" /> Настройки
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => { setEditingModule(module); setIsLessonModalOpen(true); }}>
                                                                    <Plus size={14} className="mr-2" /> Добавить страницу
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            </SortableItem>

                                            {expandedModules.has(module.id) && (
                                                <div className="ml-8 space-y-1 animate-in slide-in-from-top-2 duration-300">
                                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleLessonDragEnd(module.id, e)}>
                                                        <SortableContext items={module.lessons.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
                                                            {module.lessons.map((lesson: any) => (
                                                                <SortableItem key={lesson.id} id={lesson.id}>
                                                                    <div className="flex items-center group/lesson py-1 pr-2">
                                                                        <div className="flex-1 flex items-center justify-between min-w-0 transition-all hover:translate-x-1">
                                                                            <div
                                                                                className="flex-1 min-w-0 cursor-pointer"
                                                                                onClick={() => {
                                                                                    setEditingLesson(lesson);
                                                                                    setLessonForm({
                                                                                        title: lesson.title,
                                                                                        video_provider: lesson.video_provider || 'youtube_unlisted',
                                                                                        video_id: lesson.video_id || '',
                                                                                        content: lesson.content || ''
                                                                                    });
                                                                                    setIsPageEditorOpen(true);
                                                                                }}
                                                                            >
                                                                                <h4 className="text-sm font-medium text-foreground/80 truncate">
                                                                                    {lesson.is_published ? '' : '(Draft) '}{lesson.title}
                                                                                </h4>
                                                                            </div>
                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger asChild>
                                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/20 opacity-0 group-hover/lesson:opacity-100 transition-opacity">
                                                                                        <MoreVertical size={14} />
                                                                                    </Button>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="end">
                                                                                    <DropdownMenuItem onClick={() => {
                                                                                        setEditingLesson(lesson);
                                                                                        setLessonForm({
                                                                                            title: lesson.title,
                                                                                            video_provider: lesson.video_provider || 'youtube_unlisted',
                                                                                            video_id: lesson.video_id || '',
                                                                                            content: lesson.content || ''
                                                                                        });
                                                                                        setIsPageEditorOpen(true);
                                                                                    }}>
                                                                                        <FileText size={14} className="mr-2" /> Редактировать
                                                                                    </DropdownMenuItem>
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>
                                                                        </div>
                                                                    </div>
                                                                </SortableItem>
                                                            ))}
                                                        </SortableContext>
                                                    </DndContext>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </div>

            {/* Module Dialog */}
            <Dialog open={isModuleModalOpen} onOpenChange={(open) => { if (!open) { setIsModuleModalOpen(false); setEditingModule(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingModule ? 'Настройки модуля' : 'Новая папка'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Название папки</Label>
                            <Input
                                placeholder="Например: Введение"
                                value={moduleForm.title}
                                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Правило открытия</Label>
                            <Select
                                value={moduleForm.unlock_type}
                                onValueChange={(v) => setModuleForm({ ...moduleForm, unlock_type: v })}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Выберите тип" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="immediate">Сразу</SelectItem>
                                    <SelectItem value="level_based">По уровню</SelectItem>
                                    <SelectItem value="time_relative">По времени (Drip)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {moduleForm.unlock_type !== 'immediate' && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                    {moduleForm.unlock_type === 'level_based' ? 'Требуемый уровень' : 'Дней после вступления'}
                                </Label>
                                <Input
                                    type="number"
                                    placeholder="Например: 1"
                                    value={moduleForm.unlock_value}
                                    onChange={(e) => setModuleForm({ ...moduleForm, unlock_value: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        {editingModule && (
                            <Button
                                variant="destructive"
                                className="mr-auto"
                                onClick={async () => {
                                    if (!confirm('Удалить эту папку и все уроки внутри?')) return;
                                    await api.delete(`/courses/modules/${editingModule.id}`);
                                    setModules(modules.filter(m => m.id !== editingModule.id));
                                    setIsModuleModalOpen(false);
                                }}
                            >
                                <Trash2 size={16} className="mr-2" /> Удалить
                            </Button>
                        )}
                        <Button variant="ghost" onClick={() => setIsModuleModalOpen(false)}>Отмена</Button>
                        <Button onClick={saveModule} disabled={!moduleForm.title}>Сохранить</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lesson Dialog (Quick Add) */}
            <Dialog open={isLessonModalOpen} onOpenChange={setIsLessonModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Новая страница ({editingModule?.title})</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-6">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Название страницы</Label>
                        <Input
                            placeholder="Например: Урок 1. Начало работы"
                            value={lessonForm.title}
                            onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsLessonModalOpen(false)}>Отмена</Button>
                        <Button onClick={saveLesson} disabled={!lessonForm.title}>Создать</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Page Editor Dialog (Large) */}
            <Dialog open={isPageEditorOpen} onOpenChange={setIsPageEditorOpen}>
                <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl">
                    <DialogHeader className="p-6 border-b flex flex-row items-center justify-between space-y-0 h-16 shrink-0">
                        <DialogTitle className="truncate flex-1 font-bold text-xl">{editingLesson?.title}</DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={saveLesson} className="font-bold text-[10px] uppercase tracking-widest shadow-sm">Сохранить</Button>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto bg-muted/20">
                        <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-10">
                            <Tabs defaultValue="content" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-8 rounded-full h-12">
                                    <TabsTrigger value="content" className="rounded-full flex gap-2"><Type size={14} /> Контент</TabsTrigger>
                                    <TabsTrigger value="video" className="rounded-full flex gap-2"><Video size={14} /> Видео</TabsTrigger>
                                </TabsList>

                                <TabsContent value="content" className="space-y-4">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1">Текст страницы</Label>
                                    <Card className="border-none shadow-sm bg-background">
                                        <CardContent className="p-0">
                                            <RichTextEditor
                                                content={lessonForm.content}
                                                onChange={(content) => setLessonForm(prev => ({ ...prev, content }))}
                                            />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="video" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1">YouTube Video ID</Label>
                                            <Input
                                                placeholder="e.g. dQw4w9WgXcQ"
                                                value={lessonForm.video_id}
                                                onChange={(e) => setLessonForm({ ...lessonForm, video_id: e.target.value })}
                                                className="h-12 border-none shadow-sm bg-background"
                                            />
                                            <p className="text-[10px] text-muted-foreground italic px-1">Tip: Используйте Unlisted видео для ваших курсов.</p>
                                        </div>

                                        {lessonForm.video_id && (
                                            <div className="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-xl border">
                                                <iframe
                                                    className="w-full h-full"
                                                    src={`https://www.youtube.com/embed/${lessonForm.video_id}`}
                                                    title="Preview"
                                                    frameBorder="0"
                                                ></iframe>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <div className="pt-10 border-t">
                                <Button
                                    variant="ghost"
                                    className="text-destructive hover:bg-destructive/5 font-bold uppercase tracking-widest text-[9px]"
                                    onClick={async () => {
                                        if (!confirm('Удалить этот урок?')) return;
                                        await api.delete(`/courses/lessons/${editingLesson.id}`);
                                        setModules(modules.map(m => ({
                                            ...m,
                                            lessons: m.lessons.filter((l: any) => l.id !== editingLesson.id)
                                        })));
                                        setIsPageEditorOpen(false);
                                    }}
                                >
                                    <Trash2 size={14} className="mr-2" /> Удалить урок
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
