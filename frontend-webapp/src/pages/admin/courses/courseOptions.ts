import type { CourseContentType, CourseFormState, CourseUnlockType } from '../../../types/admin';
import type { FilterType } from './types';

export const filters: FilterType[] = ['All', 'Published', 'Draft'];

export const courseUnlockOptions: Array<{ id: CourseUnlockType; label: string }> = [
    { id: 'open', label: 'Открытый' },
    { id: 'level_based', label: 'Уровень' },
    { id: 'time_relative', label: 'Время' },
];

export const courseContentTypeOptions: Array<{ id: CourseContentType; label: string }> = [
    { id: 'course', label: 'Курс' },
    { id: 'guide', label: 'Гайд' },
    { id: 'prompt', label: 'Промпт' },
    { id: 'checklist', label: 'Чек-лист' },
];

export const createEmptyCourseForm = (): CourseFormState => ({
    title: '',
    description: '',
    cover_url: '',
    unlock_type: 'open',
    unlock_value: '1',
    is_published: false,
    is_vip: false,
    content_type: 'course',
    category: '',
    tags: [],
});

export const getFilterLabel = (filter: FilterType) => {
    if (filter === 'All') return 'Все курсы';
    if (filter === 'Published') return 'Опубликованные';
    return 'Черновики';
};
