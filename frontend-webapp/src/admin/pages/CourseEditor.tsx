import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Plus,
    ChevronLeft,
    GripVertical,
    FolderPlus,
    Eye,
    Folder,
    FileText,
    Settings,
    PlayCircle,
    MoreVertical,
    Trash2,
    Video,
    Type
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
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import api from '../../api/client';

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
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
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
                    className="p-2 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors shrink-0"
                >
                    <GripVertical size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const CourseEditor: React.FC = () => {
    const { courseId } = useParams();
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

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const editor = useEditor({
        extensions: [
            StarterKit,
            Image,
            Link,
            Youtube.configure({ width: 480, height: 270 })
        ],
        content: '',
        onUpdate: ({ editor }) => {
            setLessonForm(prev => ({ ...prev, content: editor.getHTML() }));
        },
    });

    useEffect(() => {
        fetchCourseData();
    }, [courseId]);

    const fetchCourseData = async () => {
        try {
            setIsLoading(true);
            const res = await api.get(`/admin/courses/${courseId}/edit`);
            setCourse(res.data.course);
            setModules(res.data.modules);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = modules.findIndex(m => m.id === active.id);
            const newIndex = modules.findIndex(m => m.id === over.id);
            const newModules = arrayMove(modules, oldIndex, newIndex);
            setModules(newModules);

            try {
                await api.post(`/admin/courses/${courseId}/modules/reorder`, {
                    module_ids: newModules.map(m => m.id)
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
                await api.post(`/admin/modules/${moduleId}/lessons/reorder`, {
                    lesson_ids: newLessons.map((l: any) => l.id)
                });
            } catch (err) {
                console.error('Lesson reorder failed:', err);
            }
        }
    };

    const saveModule = async () => {
        try {
            if (editingModule) {
                const res = await api.patch(`/admin/modules/${editingModule.id}`, moduleForm);
                setModules(modules.map(m => m.id === editingModule.id ? { ...m, ...res.data } : m));
            } else {
                const res = await api.post(`/admin/courses/${courseId}/modules`, moduleForm);
                setModules([...modules, { ...res.data, lessons: [] }]);
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
                const res = await api.patch(`/admin/lessons/${editingLesson.id}`, lessonForm);
                setModules(modules.map(m => ({
                    ...m,
                    lessons: m.lessons.map((l: any) => l.id === editingLesson.id ? { ...l, ...res.data } : l)
                })));
            } else {
                const res = await api.post(`/admin/modules/${editingModule.id}/lessons`, lessonForm);
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
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b px-4 h-16 flex items-center justify-between gap-4 max-w-4xl mx-auto w-full shadow-sm">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/courses')}>
                        <ChevronLeft size={24} />
                    </Button>
                    <h1 className="font-bold text-lg truncate">{course?.title || 'Course Editor'}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => window.open(`/#/course/${courseId}`, '_blank')}>
                        <Eye size={20} className="text-muted-foreground" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setIsModuleModalOpen(true)} className="rounded-full shadow-sm border font-bold text-[10px] uppercase tracking-widest px-4">
                        <FolderPlus size={16} className="mr-2" />
                        Add Module
                    </Button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 md:p-10 space-y-12">
                {modules.length === 0 ? (
                    <Card className="border-2 border-dashed bg-transparent p-20 text-center flex flex-col items-center justify-center space-y-4 opacity-50">
                        <Folder size={64} className="text-muted-foreground/20" />
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg">Your course is empty</h3>
                            <p className="text-sm">Create a module to start adding lessons.</p>
                        </div>
                        <Button variant="outline" onClick={() => setIsModuleModalOpen(true)}>
                            Create Module
                        </Button>
                    </Card>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-8">
                                {modules.map((module) => (
                                    <div key={module.id} className="space-y-4">
                                        <SortableItem id={module.id} isModule>
                                            <div className="flex items-center justify-between gap-4 group/module">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary/5 rounded-lg text-primary">
                                                        <Folder size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-lg text-foreground">{module.title}</h3>
                                                        <Badge variant="outline" className="text-[9px] uppercase tracking-widest px-1.5 h-4 opacity-60">
                                                            {module.unlock_type.replace('_', ' ')}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover/module:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => {
                                                        setEditingModule(module);
                                                        setModuleForm({ title: module.title, unlock_type: module.unlock_type, unlock_value: module.unlock_value || '' });
                                                        setIsModuleModalOpen(true);
                                                    }}>
                                                        <Settings size={14} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setEditingModule(module); setIsLessonModalOpen(true); }}>
                                                        <Plus size={16} />
                                                    </Button>
                                                </div>
                                            </div>
                                        </SortableItem>

                                        <div className="ml-10 space-y-2">
                                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleLessonDragEnd(module.id, e)}>
                                                <SortableContext items={module.lessons.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
                                                    {module.lessons.map((lesson: any) => (
                                                        <SortableItem key={lesson.id} id={lesson.id}>
                                                            <Card
                                                                className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer bg-card overflow-hidden"
                                                                onClick={() => {
                                                                    setEditingLesson(lesson);
                                                                    setLessonForm({
                                                                        title: lesson.title,
                                                                        video_provider: lesson.video_provider || 'youtube_unlisted',
                                                                        video_id: lesson.video_id || '',
                                                                        content: lesson.content || ''
                                                                    });
                                                                    if (editor) editor.commands.setContent(lesson.content || '');
                                                                    setIsPageEditorOpen(true);
                                                                }}
                                                            >
                                                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-4 min-w-0">
                                                                        <div className="p-2 bg-muted rounded-full text-muted-foreground shrink-0">
                                                                            {lesson.video_id ? <PlayCircle size={16} /> : <FileText size={16} />}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <h4 className="font-bold text-sm truncate">{lesson.title}</h4>
                                                                            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-bold mt-0.5">
                                                                                {lesson.video_id ? 'Video + Content' : 'Page Only'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <MoreVertical size={16} className="text-muted-foreground/30" />
                                                                </CardContent>
                                                            </Card>
                                                        </SortableItem>
                                                    ))}
                                                </SortableContext>
                                            </DndContext>

                                            {module.lessons.length === 0 && (
                                                <div className="py-2 px-1 text-xs text-muted-foreground italic opacity-50">
                                                    No lessons in this module.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Module Dialog */}
            <Dialog open={isModuleModalOpen} onOpenChange={(open) => { if (!open) { setIsModuleModalOpen(false); setEditingModule(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingModule ? 'Module Settings' : 'New Module'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Module Title</Label>
                            <Input
                                placeholder="e.g. Introduction"
                                value={moduleForm.title}
                                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Unlock Rule</Label>
                            <Select
                                value={moduleForm.unlock_type}
                                onValueChange={(v) => setModuleForm({ ...moduleForm, unlock_type: v })}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="immediate">Immediate</SelectItem>
                                    <SelectItem value="level_based">Level-based</SelectItem>
                                    <SelectItem value="time_relative">Time-based (Drip)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {moduleForm.unlock_type !== 'immediate' && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                    {moduleForm.unlock_type === 'level_based' ? 'Required Level' : 'Days after joining'}
                                </Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 1"
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
                                    if (confirm('Delete module and all its lessons?')) {
                                        await api.delete(`/admin/modules/${editingModule.id}`);
                                        setModules(modules.filter(m => m.id !== editingModule.id));
                                        setIsModuleModalOpen(false);
                                    }
                                }}
                            >
                                <Trash2 size={16} className="mr-2" /> Delete
                            </Button>
                        )}
                        <Button variant="ghost" onClick={() => setIsModuleModalOpen(false)}>Cancel</Button>
                        <Button onClick={saveModule} disabled={!moduleForm.title}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lesson Dialog (Quick Add) */}
            <Dialog open={isLessonModalOpen} onOpenChange={setIsLessonModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Lesson</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-6">
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Lesson Title</Label>
                        <Input
                            placeholder="e.g. Lesson 1. Getting Started"
                            value={lessonForm.title}
                            onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsLessonModalOpen(false)}>Cancel</Button>
                        <Button onClick={saveLesson} disabled={!lessonForm.title}>Add & Open Editor</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Page Editor Dialog (Large) */}
            <Dialog open={isPageEditorOpen} onOpenChange={setIsPageEditorOpen}>
                <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl">
                    <DialogHeader className="p-6 border-b flex flex-row items-center justify-between space-y-0 h-16 shrink-0">
                        <DialogTitle className="truncate flex-1 font-bold text-xl">{editingLesson?.title}</DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={saveLesson} className="font-bold text-[10px] uppercase tracking-widest shadow-sm">Save Changes</Button>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto bg-muted/20">
                        <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-10">
                            <Tabs defaultValue="content" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-8 rounded-full h-12">
                                    <TabsTrigger value="content" className="rounded-full flex gap-2"><Type size={14} /> Content</TabsTrigger>
                                    <TabsTrigger value="video" className="rounded-full flex gap-2"><Video size={14} /> Video</TabsTrigger>
                                </TabsList>

                                <TabsContent value="content" className="space-y-4">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1">Page Text</Label>
                                    <Card className="border-none shadow-sm bg-background">
                                        <CardContent className="p-0">
                                            <div className="prose prose-slate max-w-none min-h-[400px] p-6 focus-within:ring-1 focus-within:ring-primary/20 rounded-xl transition-all">
                                                <EditorContent editor={editor} className="outline-none" />
                                            </div>
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
                                            <p className="text-[10px] text-muted-foreground italic px-1">Tip: Use an Unlisted video for your courses.</p>
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
                                        if (confirm('Delete this lesson?')) {
                                            await api.delete(`/admin/lessons/${editingLesson.id}`);
                                            setModules(modules.map(m => ({
                                                ...m,
                                                lessons: m.lessons.filter((l: any) => l.id !== editingLesson.id)
                                            })));
                                            setIsPageEditorOpen(false);
                                        }
                                    }}
                                >
                                    <Trash2 size={14} className="mr-2" /> Delete Lesson
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
