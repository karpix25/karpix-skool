import type { CourseStructureGenerationJobStatus } from './courseStructureGenerationTypes';

export const activeCourseStructureGenerationStatuses: CourseStructureGenerationJobStatus[] = [
    'queued',
    'running',
];

export const isActiveCourseStructureGenerationStatus = (status: CourseStructureGenerationJobStatus) => (
    activeCourseStructureGenerationStatuses.includes(status)
);

export const getCourseStructureGenerationStatusLabel = (status: CourseStructureGenerationJobStatus) => {
    if (status === 'starting') return 'Запускаем генерацию';
    if (status === 'queued') return 'Задача в очереди';
    if (status === 'running') return 'Генерируем папки и уроки';
    if (status === 'partial_drafts') return 'Часть уроков готова';
    if (status === 'needs_attention') return 'Нужна проверка';
    if (status === 'completed') return 'Структура готова';
    if (status === 'failed') return 'Генерация не удалась';
    return 'Готово к запуску';
};
