import api from '../api/client';

const LESSON_PREFIX = 'lesson_';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface LessonDeepLink {
    type: 'lesson';
    lessonId: string;
}

export interface DeepLinkResolveResponse {
    type: 'lesson';
    lesson_id: string;
    course_id: string;
    tenant_id: string;
    target_path: string;
    is_locked: boolean;
    lock_reason?: string | null;
}

export interface LessonShareLinkResponse {
    url: string;
    start_param: string;
}

export const parseStartParamDeepLink = (startParam?: string | null): LessonDeepLink | null => {
    const normalized = startParam?.trim();
    if (!normalized?.startsWith(LESSON_PREFIX)) return null;

    const lessonId = normalized.slice(LESSON_PREFIX.length);
    if (!UUID_PATTERN.test(lessonId)) return null;

    return { type: 'lesson', lessonId };
};

export const getSchoolRefFromStartParam = (startParam?: string | null) => {
    const normalized = startParam?.trim();
    if (!normalized || normalized.startsWith(LESSON_PREFIX)) return undefined;
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
