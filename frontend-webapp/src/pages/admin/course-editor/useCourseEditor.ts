import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import api from '../../../api/client';
import type { AdminCourse, AdminModule, CourseEditResponse, ModuleFormState } from '../../../types/admin';
import { createEmptyModuleForm, toModuleUnlockType } from './moduleOptions';
import { useCourseEditorOrdering } from './useCourseEditorOrdering';

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
    const ordering = useCourseEditorOrdering({ modules, setModules });

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
        document.body.style.backgroundColor = 'var(--color-background)';

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
        sensors: ordering.sensors,
        setModuleForm,
        setIsModuleModalOpen,
        closeModuleModal,
        openNewModuleModal,
        openEditModuleModal,
        toggleModule,
        handleDragStart: ordering.handleDragStart,
        handleDragOver: ordering.handleDragOver,
        handleDragEnd: ordering.handleDragEnd,
        handleDragCancel: ordering.handleDragCancel,
        saveModule,
        handleTogglePublish,
        handleDeleteModule,
        handleDeleteLesson,
        refreshCourseData: fetchCourseData,
    };
};
