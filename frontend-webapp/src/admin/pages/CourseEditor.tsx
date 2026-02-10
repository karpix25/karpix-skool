import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    List,
    Section,
    Cell,
    Button,
    Input,
    Text,
    Placeholder,
    Modal,
    Tappable,
    IconButton,
    FixedLayout,
    Headline,
    Select
} from '@telegram-apps/telegram-ui';
import {
    Plus,
    ChevronLeft,
    GripVertical,
    FolderPlus,
    Eye,
    Folder,
    FileText,
    Settings,
    ArrowLeft,
    PlayCircle
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

// --- Sortable Item Wrapper ---
const SortableItem = ({ id, children }: { id: string, children: React.ReactNode }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: 'none',
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Cell
                before={
                    <div {...attributes} {...listeners} style={{ cursor: 'grab', padding: '8px 0' }}>
                        <GripVertical size={20} style={{ opacity: 0.2 }} />
                    </div>
                }
            >
                {children}
            </Cell>
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
        useSensor(PointerSensor),
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

    if (isLoading) return <Placeholder description="Загрузка курсов..."> <div style={{ animation: 'spin 1s linear infinite' }}><Folder size={32} /></div> </Placeholder>;

    return (
        <>
            <List>
                <FixedLayout vertical="top" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', borderBottom: '1px solid rgba(0,0,0,0.1)', zIndex: 50 }}>
                    <div style={{ padding: '4px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Tappable onClick={() => navigate('/admin/courses')} style={{ padding: 8 }}>
                                <ArrowLeft size={24} />
                            </Tappable>
                            <Headline weight="2" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {course?.title || 'Редактор'}
                            </Headline>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <Tappable onClick={() => window.open(`/#/course/${courseId}`, '_blank')} style={{ padding: 8, opacity: 0.6 }}>
                                <Eye size={20} />
                            </Tappable>
                            <Tappable onClick={() => setIsModuleModalOpen(true)} style={{ padding: 8, color: 'var(--tg-theme-link-color)' }}>
                                <FolderPlus size={20} />
                            </Tappable>
                        </div>
                    </div>
                </FixedLayout>

                <div style={{ marginTop: 56, paddingBottom: 100 }}>
                    {modules.length === 0 ? (
                        <Placeholder
                            header="Пусто"
                            description="Создайте первый раздел (папку), чтобы добавить уроки"
                            action={<Button size="l" mode="bezeled" onClick={() => setIsModuleModalOpen(true)}>Добавить раздел</Button>}
                        >
                            <Folder size={48} style={{ opacity: 0.1 }} />
                        </Placeholder>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                                {modules.map((module) => (
                                    <Section
                                        key={module.id}
                                        header={
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Folder size={16} />
                                                    <span>{module.title}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <Tappable onClick={() => {
                                                        setEditingModule(module);
                                                        setModuleForm({ title: module.title, unlock_type: module.unlock_type, unlock_value: module.unlock_value });
                                                        setIsModuleModalOpen(true);
                                                    }} style={{ padding: 4, opacity: 0.4 }}>
                                                        <Settings size={14} />
                                                    </Tappable>
                                                    <Tappable onClick={() => { setEditingModule(module); setIsLessonModalOpen(true); }} style={{ padding: 4, color: 'var(--tg-theme-link-color)' }}>
                                                        <Plus size={16} />
                                                    </Tappable>
                                                </div>
                                            </div>
                                        }
                                    >
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleLessonDragEnd(module.id, e)}>
                                            <SortableContext items={module.lessons.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
                                                {module.lessons.map((lesson: any) => (
                                                    <SortableItem key={lesson.id} id={lesson.id}>
                                                        <div
                                                            style={{ flex: 1, cursor: 'pointer' }}
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
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                <Text weight="2">{lesson.title}</Text>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0.4, fontSize: 11 }}>
                                                                    {lesson.video_id ? <PlayCircle size={10} /> : <FileText size={10} />}
                                                                    <span>{lesson.video_id ? 'Видео + Страница' : 'Только страница'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </SortableItem>
                                                ))}
                                            </SortableContext>
                                        </DndContext>
                                    </Section>
                                ))}
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </List>

            {/* Folder Modal */}
            <Modal
                header={<Modal.Header>{editingModule ? 'Настройки раздела' : 'Новый раздел'}</Modal.Header>}
                open={isModuleModalOpen}
                onOpenChange={(open) => { if (!open) { setIsModuleModalOpen(false); setEditingModule(null); } }}
            >
                <List style={{ paddingBottom: 20 }}>
                    <Section header="Основные настройки">
                        <Input
                            header="Название"
                            placeholder="Напр., Введение"
                            value={moduleForm.title}
                            onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                        />
                        <Select
                            header="Тип доступа"
                            value={moduleForm.unlock_type}
                            onChange={(e) => setModuleForm({ ...moduleForm, unlock_type: e.target.value })}
                        >
                            <option value="immediate">Сразу</option>
                            <option value="level_based">По рейтингу (Level)</option>
                            <option value="time_relative">Через время (Drip)</option>
                        </Select>
                    </Section>

                    {(moduleForm.unlock_type === 'level_based' || moduleForm.unlock_type === 'time_relative') && (
                        <Section header="Настройка ограничения">
                            {moduleForm.unlock_type === 'level_based' && (
                                <Input
                                    header="Нужен уровень"
                                    type="number"
                                    placeholder="Напр., 2"
                                    value={moduleForm.unlock_value}
                                    onChange={(e) => setModuleForm({ ...moduleForm, unlock_value: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            )}

                            {moduleForm.unlock_type === 'time_relative' && (
                                <Input
                                    header="Доступ через (дней)"
                                    type="number"
                                    placeholder="Напр., 1"
                                    value={moduleForm.unlock_value}
                                    onChange={(e) => setModuleForm({ ...moduleForm, unlock_value: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            )}
                        </Section>
                    )}

                    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                        <Button size="l" stretched onClick={saveModule} disabled={!moduleForm.title}>Сохранить</Button>
                        {editingModule && (
                            <Button
                                mode="plain"
                                color="critical"
                                onClick={async () => {
                                    if (confirm('Удалить раздел и все уроки в нем?')) {
                                        await api.delete(`/admin/modules/${editingModule.id}`);
                                        setModules(modules.filter(m => m.id !== editingModule.id));
                                        setIsModuleModalOpen(false);
                                    }
                                }}
                            >
                                Удалить раздел
                            </Button>
                        )}
                    </div>
                </List>
            </Modal>

            {/* Quick Add Page Modal */}
            <Modal
                header={<Modal.Header>Новый урок</Modal.Header>}
                open={isLessonModalOpen}
                onOpenChange={setIsLessonModalOpen}
            >
                <List style={{ paddingBottom: 20 }}>
                    <Section>
                        <Input
                            header="Название урока"
                            placeholder="Напр., Урок 1. Основы"
                            value={lessonForm.title}
                            onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                        />
                    </Section>
                    <div style={{ padding: '0 16px', marginTop: 12 }}>
                        <Button size="l" stretched onClick={saveLesson} disabled={!lessonForm.title}>Добавить и открыть редактор</Button>
                    </div>
                </List>
            </Modal>

            {/* Full Page Editor Modal */}
            <Modal
                header={
                    <Modal.Header
                        before={<IconButton mode="plain" onClick={() => setIsPageEditorOpen(false)}><ChevronLeft /></IconButton>}
                        after={<Button size="s" mode="filled" onClick={saveLesson}>Готово</Button>}
                    >
                        {editingLesson?.title}
                    </Modal.Header>
                }
                open={isPageEditorOpen}
                onOpenChange={setIsPageEditorOpen}
            >
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20, minHeight: '100vh', backgroundColor: 'var(--tg-theme-bg-color)' }}>
                    <Input
                        header="ID Видео (YouTube Unlisted)"
                        placeholder="abcdef123"
                        value={lessonForm.video_id}
                        onChange={(e) => setLessonForm({ ...lessonForm, video_id: e.target.value })}
                    />

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Текст страницы</label>
                        <div style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)', borderRadius: 16, padding: 16, minHeight: 300, border: '1px solid rgba(0,0,0,0.05)' }}>
                            <EditorContent editor={editor} style={{ minHeight: 200 }} />
                        </div>
                    </div>

                    <Button
                        mode="plain"
                        color="critical"
                        onClick={async () => {
                            if (confirm('Удалить урок?')) {
                                await api.delete(`/admin/lessons/${editingLesson.id}`);
                                setModules(modules.map(m => ({
                                    ...m,
                                    lessons: m.lessons.filter((l: any) => l.id !== editingLesson.id)
                                })));
                                setIsPageEditorOpen(false);
                            }
                        }}
                    >
                        Удалить урок
                    </Button>
                </div>
            </Modal>
        </>
    );
};
