import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, UniqueIdentifier } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import api from '../../../api/client';
import type { AdminCourse, AdminModule, CourseEditResponse, ModuleFormState } from '../../../types/admin';
import { createEmptyModuleForm, toModuleUnlockType } from './moduleOptions';

export const useCourseEditor = () => {
    const { id: courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState<AdminCourse | null>(null);
    const [modules, setModules] = useState<AdminModule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
    const [editingModule, setEditingModule] = useState<AdminModule | null>(null);
    const [moduleForm, setModuleForm] = useState<ModuleFormState>(createEmptyModuleForm());
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchCourseData = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await api.get<CourseEditResponse>(`/courses/${courseId}/edit`);
            setCourse(res.data.course);
            setModules(res.data.modules);
            if (res.data.modules?.length > 0) {
                const moduleIds = new Set(res.data.modules.map((module) => module.id));
                setExpandedModules((prev) => {
                    const stillExpanded = Array.from(prev).filter((moduleId) => moduleIds.has(moduleId));
                    return new Set(stillExpanded.length > 0 ? stillExpanded : [res.data.modules[0].id]);
                });
            } else {
                setExpandedModules(new Set());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        fetchCourseData();
        const originalBg = document.body.style.backgroundColor;
        const isDark = document.documentElement.classList.contains('dark') ||
            (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.body.style.backgroundColor = isDark ? '#101622' : '#f6f6f8';

        return () => {
            document.body.style.backgroundColor = originalBg;
        };
    }, [fetchCourseData]);

    const closeModuleModal = () => {
        setIsModuleModalOpen(false);
        setEditingModule(null);
    };

    const openNewModuleModal = () => {
        setEditingModule(null);
        setModuleForm(createEmptyModuleForm());
        setIsModuleModalOpen(true);
    };

    const openEditModuleModal = (module: AdminModule) => {
        setEditingModule(module);
        setModuleForm({
            title: module.title,
            unlock_type: toModuleUnlockType(module.unlock_type),
            unlock_value: module.unlock_value?.toString() || '',
            is_vip: module.is_vip || false,
        });
        setIsModuleModalOpen(true);
    };

    const toggleModule = (id: string) => {
        const newExpanded = new Set(expandedModules);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedModules(newExpanded);
    };

    const findContainer = useCallback((id: UniqueIdentifier) => {
        const normalizedId = String(id);
        if (modules.find(m => m.id === normalizedId)) return normalizedId;
        return modules.find(m => m.lessons.some((l) => l.id === normalizedId))?.id;
    }, [modules]);

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;
        const activeId = String(active.id);
        const overId = String(over.id);
        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);
        if (!activeContainer || !overContainer || activeContainer === overContainer) return;

        const activeModuleIdx = modules.findIndex(m => m.id === activeContainer);
        const overModuleIdx = modules.findIndex(m => m.id === overContainer);
        if (activeModuleIdx === -1 || overModuleIdx === -1) return;
        if (!modules[activeModuleIdx].lessons.find((l) => l.id === activeId)) return;

        setModules((prev) => {
            const activeLessons = prev[activeModuleIdx].lessons;
            const overLessons = prev[overModuleIdx].lessons;
            const activeIndex = activeLessons.findIndex((l) => l.id === activeId);
            let overIndex = overLessons.findIndex((l) => l.id === overId);
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
        if (!activeContainer || !overContainer || activeId === overId) return;

        if (activeId === activeContainer && overId === overContainer) {
            await reorderModules(activeId, overId);
            return;
        }
        await reorderLessons(activeId, overId, activeContainer, overContainer);
    };

    const reorderModules = async (activeId: string, overId: string) => {
        const oldIndex = modules.findIndex(m => m.id === activeId);
        const newIndex = modules.findIndex(m => m.id === overId);
        const newModules = arrayMove(modules, oldIndex, newIndex);
        setModules(newModules);
        try {
            await api.post('/courses/reorder/modules', {
                items: newModules.map((m, idx) => ({ id: m.id, order_index: idx }))
            });
        } catch (err) {
            console.error('Reorder modules failed:', err);
            fetchCourseData();
        }
    };

    const reorderLessons = async (activeId: string, overId: string, activeContainer: string, overContainer: string) => {
        const activeModuleIdx = modules.findIndex(m => m.id === activeContainer);
        const overModuleIdx = modules.findIndex(m => m.id === overContainer);
        if (activeModuleIdx === -1 || overModuleIdx === -1) return;

        if (activeContainer === overContainer) {
            const oldIndex = modules[activeModuleIdx].lessons.findIndex((l) => l.id === activeId);
            const newIndex = modules[overModuleIdx].lessons.findIndex((l) => l.id === overId);
            const newLessons = arrayMove(modules[activeModuleIdx].lessons, oldIndex, newIndex);
            const newModules = [...modules];
            newModules[activeModuleIdx].lessons = newLessons;
            setModules(newModules);
            try {
                await api.post('/courses/reorder/lessons', {
                    items: newLessons.map((l, idx) => ({ id: l.id, order_index: idx }))
                });
            } catch (err) {
                console.error('Lesson reorder failed:', err);
                fetchCourseData();
            }
            return;
        }

        try {
            await api.patch(`/courses/lessons/${activeId}`, { module_id: overContainer });
            await api.post('/courses/reorder/lessons', {
                items: modules[overModuleIdx].lessons.map((l, idx) => ({ id: l.id, order_index: idx }))
            });
        } catch (err) {
            console.error('Cross-module move failed:', err);
            fetchCourseData();
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
            setModuleForm(createEmptyModuleForm());
        } catch (err) {
            console.error(err);
        }
    };

    const handleTogglePublish = async (lessonId: string, isPublished: boolean) => {
        try {
            setModules(modules.map(m => ({
                ...m,
                lessons: m.lessons.map((l) => l.id === lessonId ? { ...l, is_published: isPublished } : l)
            })));
            await api.patch(`/courses/lessons/${lessonId}`, { is_published: isPublished });
        } catch (err) {
            console.error('Failed to toggle publish:', err);
            fetchCourseData();
        }
    };

    const handleDeleteModule = async (moduleId: string) => {
        if (!confirm('Удалить модуль и все уроки внутри?')) return;
        try {
            await api.delete(`/courses/modules/${moduleId}`);
            setModules(modules.filter(m => m.id !== moduleId));
            closeModuleModal();
        } catch (err) {
            console.error('Failed to delete module:', err);
            alert('Не удалось удалить модуль. Пожалуйста, попробуйте еще раз.');
            fetchCourseData();
        }
    };

    const handleDeleteLesson = async (lessonId: string) => {
        try {
            await api.delete(`/courses/lessons/${lessonId}`);
            setModules(modules.map(m => ({ ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) })));
        } catch (err) {
            console.error('Failed to delete lesson:', err);
            alert('Не удалось удалить урок. Пожалуйста, попробуйте еще раз.');
            fetchCourseData();
        }
    };

    return {
        courseId,
        navigate,
        course,
        modules,
        isLoading,
        isModuleModalOpen,
        editingModule,
        moduleForm,
        expandedModules,
        sensors,
        setModuleForm,
        setIsModuleModalOpen,
        closeModuleModal,
        openNewModuleModal,
        openEditModuleModal,
        toggleModule,
        handleDragOver,
        handleDragEnd,
        saveModule,
        handleTogglePublish,
        handleDeleteModule,
        handleDeleteLesson,
        refreshCourseData: fetchCourseData,
    };
};
