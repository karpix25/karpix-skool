import { useRef } from 'react';
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { Dispatch, SetStateAction } from 'react';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import api from '../../../api/client';
import type { AdminModule } from '../../../types/admin';
import { buildLessonOrderItems, findLessonContainerId, moveLesson } from './lessonOrdering';

interface UseCourseEditorOrderingOptions {
    modules: AdminModule[];
    setModules: Dispatch<SetStateAction<AdminModule[]>>;
}

export const useCourseEditorOrdering = ({ modules, setModules }: UseCourseEditorOrderingOptions) => {
    const activeLessonOriginModuleId = useRef<string | null>(null);
    const dragModules = useRef<AdminModule[] | null>(null);
    const dragSnapshot = useRef<AdminModule[] | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const clearDragState = () => {
        activeLessonOriginModuleId.current = null;
        dragModules.current = null;
        dragSnapshot.current = null;
    };

    const restoreDragSnapshot = () => {
        if (dragSnapshot.current) setModules(dragSnapshot.current);
        clearDragState();
    };

    const handleDragStart = (event: DragStartEvent) => {
        const activeId = String(event.active.id);
        dragModules.current = modules;
        dragSnapshot.current = modules;
        activeLessonOriginModuleId.current = modules
            .find((module) => module.lessons.some((lesson) => lesson.id === activeId))?.id || null;
    };

    const handleDragOver = (event: DragOverEvent) => {
        if (!event.over || !activeLessonOriginModuleId.current) return;
        const activeId = String(event.active.id);
        const overId = String(event.over.id);
        const currentModules = dragModules.current || modules;
        const sourceModuleId = findLessonContainerId(currentModules, activeId);
        const targetModuleId = findLessonContainerId(currentModules, overId);
        if (!sourceModuleId || !targetModuleId || sourceModuleId === targetModuleId) return;

        const nextModules = moveLesson(currentModules, activeId, sourceModuleId, targetModuleId, overId);
        dragModules.current = nextModules;
        setModules(nextModules);
    };

    const reorderModules = async (activeId: string, overId: string) => {
        const oldIndex = modules.findIndex((module) => module.id === activeId);
        const newIndex = modules.findIndex((module) => module.id === overId);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

        const nextModules = arrayMove(modules, oldIndex, newIndex);
        setModules(nextModules);
        try {
            await api.post('/courses/reorder/modules', {
                items: nextModules.map((module, orderIndex) => ({ id: module.id, order_index: orderIndex })),
            });
        } catch (error) {
            console.error('Reorder modules failed:', error);
            setModules(modules);
            alert('Не удалось сохранить порядок модулей. Попробуйте еще раз.');
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const activeId = String(event.active.id);
        const overId = event.over ? String(event.over.id) : null;
        const originModuleId = activeLessonOriginModuleId.current;

        if (!originModuleId) {
            clearDragState();
            const targetModuleId = overId ? findLessonContainerId(modules, overId) : null;
            if (targetModuleId) await reorderModules(activeId, targetModuleId);
            return;
        }
        if (!overId) {
            restoreDragSnapshot();
            return;
        }

        const currentModules = dragModules.current || modules;
        const currentModuleId = findLessonContainerId(currentModules, activeId);
        const targetModuleId = findLessonContainerId(currentModules, overId);
        if (!currentModuleId || !targetModuleId) {
            restoreDragSnapshot();
            return;
        }

        const nextModules = moveLesson(currentModules, activeId, currentModuleId, targetModuleId, overId);
        const snapshot = dragSnapshot.current || modules;
        const affectedModuleIds = new Set([originModuleId, targetModuleId]);
        const items = buildLessonOrderItems(nextModules, affectedModuleIds);
        setModules(nextModules);
        clearDragState();

        try {
            await api.post('/courses/reorder/lessons', { items });
        } catch (error) {
            console.error('Lesson reorder failed:', error);
            setModules(snapshot);
            alert('Не удалось сохранить порядок уроков. Попробуйте еще раз.');
        }
    };

    const handleDragCancel = () => {
        restoreDragSnapshot();
    };

    return { sensors, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel };
};
