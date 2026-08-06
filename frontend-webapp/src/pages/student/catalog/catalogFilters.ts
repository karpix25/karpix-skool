import type { StudentCourse, CourseContentType } from '../../../types/course';

export type CatalogContentType = CourseContentType | 'all';
export type CatalogAccess = 'all' | 'in-progress' | 'open' | 'vip' | 'locked' | 'completed';
export type CatalogSort = 'newest' | 'title';

export const courseContentTypeLabels: Record<CourseContentType, string> = {
    course: 'Курс',
    guide: 'Гайд',
    prompt: 'Промпт',
    checklist: 'Чек-лист',
};

export interface CatalogFilters {
    query: string;
    contentType: CatalogContentType;
    category: string;
    tag: string;
    access: CatalogAccess;
    sort: CatalogSort;
}

export const defaultCatalogFilters: CatalogFilters = {
    query: '',
    contentType: 'all',
    category: 'all',
    tag: 'all',
    access: 'all',
    sort: 'newest',
};

const normalize = (value: unknown) => String(value || '').trim().toLocaleLowerCase();

export const filterStudentCourses = (courses: StudentCourse[], filters: CatalogFilters): StudentCourse[] => {
    const query = normalize(filters.query);
    const filtered = courses.filter((course) => {
        const searchable = [course.title, course.description, course.category, ...(course.tags || [])].map(normalize).join(' ');
        const progress = Number(course.progress_percent || 0);
        const unlocked = course.is_unlocked !== false;

        if (query && !searchable.includes(query)) return false;
        if (filters.contentType !== 'all' && course.content_type !== filters.contentType) return false;
        if (filters.category !== 'all' && normalize(course.category) !== normalize(filters.category)) return false;
        if (filters.tag !== 'all' && !(course.tags || []).some((tag) => normalize(tag) === normalize(filters.tag))) return false;
        if (filters.access === 'in-progress' && !(progress > 0 && progress < 100)) return false;
        if (filters.access === 'completed' && progress < 100) return false;
        if (filters.access === 'open' && !(unlocked && !course.is_vip)) return false;
        if (filters.access === 'vip' && !course.is_vip) return false;
        if (filters.access === 'locked' && unlocked) return false;
        return true;
    });

    return [...filtered].sort((a, b) => {
        if (filters.sort === 'title') return a.title.localeCompare(b.title, 'ru');
        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
};

export const getCourseCategories = (courses: StudentCourse[]) => (
    [...new Set(courses.map((course) => course.category?.trim()).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'ru'))
);

export const getCourseTags = (courses: StudentCourse[]) => (
    [...new Set(courses.flatMap((course) => course.tags || []).map((tag) => tag.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'))
);

export const groupCoursesByCategory = (courses: StudentCourse[]) => {
    const grouped = new Map<string, StudentCourse[]>();
    courses.forEach((course) => {
        const category = course.category?.trim() || 'Без категории';
        grouped.set(category, [...(grouped.get(category) || []), course]);
    });
    return [...grouped.entries()];
};
