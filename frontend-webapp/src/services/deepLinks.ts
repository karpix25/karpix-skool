import api from '../api/client';

const LESSON_PREFIX = 'lesson_';
const COURSE_PREFIX = 'course_';
const MODULE_PREFIX = 'module_';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface LessonDeepLink {
    type: 'lesson';
    lessonId: string;
}

export interface CourseDeepLink {
    type: 'course';
    courseId: string;
}

export interface ModuleDeepLink {
    type: 'module';
    moduleId: string;
}

export interface DeepLinkResolveResponse {
    type: 'course' | 'module' | 'lesson';
    lesson_id?: string;
    lesson_title?: string;
    module_id?: string;
    course_id: string;
    course_title?: string;
    tenant_id: string;
    tenant_name?: string;
    target_path: string;
    is_locked: boolean;
    lock_reason?: string | null;
    requires_group_join?: boolean;
    access_status?: 'group_required' | string;
    free_group_link?: string | null;
}

export interface LessonShareLinkResponse {
    url: string;
    start_param: string;
}

export const parseStartParamDeepLink = (startParam?: string | null): CourseDeepLink | ModuleDeepLink | LessonDeepLink | null => {
    const normalized = startParam?.trim();
    if (!normalized) return null;

    if (normalized.startsWith(LESSON_PREFIX)) {
        const lessonId = normalized.slice(LESSON_PREFIX.length);
        return UUID_PATTERN.test(lessonId) ? { type: 'lesson', lessonId } : null;
    }

    if (normalized.startsWith(COURSE_PREFIX)) {
        const courseId = normalized.slice(COURSE_PREFIX.length);
        return UUID_PATTERN.test(courseId) ? { type: 'course', courseId } : null;
    }

    if (normalized.startsWith(MODULE_PREFIX)) {
        const moduleId = normalized.slice(MODULE_PREFIX.length);
        return UUID_PATTERN.test(moduleId) ? { type: 'module', moduleId } : null;
    }

    return null;
};

export const getSchoolRefFromStartParam = (startParam?: string | null) => {
    const normalized = startParam?.trim();
    if (
        !normalized ||
        normalized.startsWith(LESSON_PREFIX) ||
        normalized.startsWith(COURSE_PREFIX) ||
        normalized.startsWith(MODULE_PREFIX)
    ) return undefined;
    return normalized;
};

export const resolveDeepLink = async (startParam: string): Promise<DeepLinkResolveResponse> => {
    const response = await api.get<DeepLinkResolveResponse>('/webapp/deeplink/resolve', {
        params: { start_param: startParam },
    });
    return response.data;
};

export const getLessonShareLink = async (lessonId: string): Promise<LessonShareLinkResponse> => {
    const response = await api.get<LessonShareLinkResponse>(`/courses/lessons/${lessonId}/share-link`);
    return response.data;
};

export const getModuleShareLink = async (moduleId: string): Promise<LessonShareLinkResponse> => {
    const response = await api.get<LessonShareLinkResponse>(`/courses/modules/${moduleId}/share-link`);
    return response.data;
};
