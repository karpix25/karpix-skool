import type { CourseFormState, CourseUnlockType } from '../../../types/admin';
import type { FilterType } from './types';

export const filters: FilterType[] = ['All', 'Published', 'Draft', 'Archived'];

export const courseUnlockOptions: Array<{ id: CourseUnlockType; label: string }> = [
    { id: 'open', label: 'Открытый' },
    { id: 'level_based', label: 'Уровень' },
    { id: 'time_relative', label: 'Время' },
];

export const createEmptyCourseForm = (): CourseFormState => ({
    title: '',
    description: '',
    cover_url: '',
    unlock_type: 'open',
    unlock_value: '1',
    is_published: false,
    is_vip: false,
});

export const getFilterLabel = (filter: FilterType) => {
    if (filter === 'All') return 'Все курсы';
    if (filter === 'Published') return 'Опубликованные';
    if (filter === 'Draft') return 'Черновики';
    return 'Архив';
};
