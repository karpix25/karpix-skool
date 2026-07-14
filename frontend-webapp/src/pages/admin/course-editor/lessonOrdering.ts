import type { AdminModule } from '../../../types/admin';

export interface LessonOrderItem {
    id: string;
    module_id: string;
    order_index: number;
}

export const findLessonContainerId = (modules: AdminModule[], itemId: string) => {
    if (modules.some((module) => module.id === itemId)) return itemId;
    return modules.find((module) => module.lessons.some((lesson) => lesson.id === itemId))?.id;
};

export const moveLesson = (
    modules: AdminModule[],
    lessonId: string,
    sourceModuleId: string,
    targetModuleId: string,
    targetItemId: string,
): AdminModule[] => {
    const sourceModule = modules.find((module) => module.id === sourceModuleId);
    const targetModule = modules.find((module) => module.id === targetModuleId);
    const sourceIndex = sourceModule?.lessons.findIndex((lesson) => lesson.id === lessonId) ?? -1;
    if (!sourceModule || !targetModule || sourceIndex < 0) return modules;

    if (sourceModuleId === targetModuleId) {
        const targetIndex = sourceModule.lessons.findIndex((lesson) => lesson.id === targetItemId);
        const resolvedTargetIndex = targetIndex >= 0 ? targetIndex : sourceModule.lessons.length - 1;
        if (sourceIndex === resolvedTargetIndex) return modules;

        const lessons = [...sourceModule.lessons];
        const [lesson] = lessons.splice(sourceIndex, 1);
        lessons.splice(resolvedTargetIndex, 0, lesson);
        return modules.map((module) => module.id === sourceModuleId ? { ...module, lessons } : module);
    }

    const sourceLessons = [...sourceModule.lessons];
    const [lesson] = sourceLessons.splice(sourceIndex, 1);
    const targetLessons = [...targetModule.lessons];
    const targetIndex = targetLessons.findIndex((item) => item.id === targetItemId);
    targetLessons.splice(targetIndex >= 0 ? targetIndex : targetLessons.length, 0, {
        ...lesson,
        module_id: targetModuleId,
    });

    return modules.map((module) => {
        if (module.id === sourceModuleId) return { ...module, lessons: sourceLessons };
        if (module.id === targetModuleId) return { ...module, lessons: targetLessons };
        return module;
    });
};

export const buildLessonOrderItems = (
    modules: AdminModule[],
    moduleIds: Iterable<string>,
): LessonOrderItem[] => {
    const includedModuleIds = new Set(moduleIds);
    return modules.flatMap((module) => (
        includedModuleIds.has(module.id)
            ? module.lessons.map((lesson, orderIndex) => ({
                id: lesson.id,
                module_id: module.id,
                order_index: orderIndex,
            }))
            : []
    ));
};
