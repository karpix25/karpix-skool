import api from '../api/client';

export interface CourseSubscriptionState {
    course_id: string;
    is_subscribed: boolean;
    updated_at?: string | null;
}

interface ApiResponse {
    data: unknown;
}

type SubscriptionRequest = (endpoint: string) => Promise<ApiResponse>;

export const getCourseSubscriptionEndpoint = (courseId: string) => (
    `/webapp/courses/${courseId}/subscription`
);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const pickString = (record: Record<string, unknown>, key: string) => {
    const value = record[key];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const pickBoolean = (record: Record<string, unknown>, key: string) => {
    const value = record[key];
    return typeof value === 'boolean' ? value : null;
};

export const normalizeCourseSubscription = (
    payload: unknown,
    fallbackCourseId: string,
    fallbackSubscribed: boolean,
): CourseSubscriptionState => {
    if (!isRecord(payload)) {
        return {
            course_id: fallbackCourseId,
            is_subscribed: fallbackSubscribed,
            updated_at: null,
        };
    }

    return {
        course_id: pickString(payload, 'course_id') || pickString(payload, 'courseId') || fallbackCourseId,
        is_subscribed:
            pickBoolean(payload, 'is_subscribed') ??
            pickBoolean(payload, 'is_active') ??
            fallbackSubscribed,
        updated_at: pickString(payload, 'updated_at'),
    };
};

export const getCourseSubscription = async (
    courseId: string,
    request: SubscriptionRequest = (endpoint) => api.get(endpoint),
) => {
    const response = await request(getCourseSubscriptionEndpoint(courseId));
    return normalizeCourseSubscription(response.data, courseId, false);
};

export const subscribeToCourse = async (
    courseId: string,
    request: SubscriptionRequest = (endpoint) => api.post(endpoint),
) => {
    const response = await request(getCourseSubscriptionEndpoint(courseId));
    return normalizeCourseSubscription(response.data, courseId, true);
};

export const unsubscribeFromCourse = async (
    courseId: string,
    request: SubscriptionRequest = (endpoint) => api.delete(endpoint),
) => {
    const response = await request(getCourseSubscriptionEndpoint(courseId));
    return normalizeCourseSubscription(response.data, courseId, false);
};
