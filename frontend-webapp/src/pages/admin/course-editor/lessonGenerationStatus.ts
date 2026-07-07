import type { LessonGenerationJobStatus } from './lessonGenerationTypes';

export const activeLessonGenerationStatuses: LessonGenerationJobStatus[] = [
    'queued',
    'running',
];

export const isActiveLessonGenerationStatus = (status: LessonGenerationJobStatus) => (
    activeLessonGenerationStatuses.includes(status)
);

export const getLessonGenerationStatusLabel = (status: LessonGenerationJobStatus) => {
    if (status === 'starting') return 'Запускаем генерацию';
    if (status === 'queued') return 'Задача в очереди';
    if (status === 'running') return 'Генерируем уроки';
    if (status === 'completed') return 'Уроки готовы';
    if (status === 'failed') return 'Генерация не удалась';
    return 'Готово к запуску';
};
