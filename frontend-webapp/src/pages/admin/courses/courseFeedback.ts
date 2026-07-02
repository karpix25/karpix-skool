import axios from 'axios';

export type CourseFeedbackScope = 'page' | 'announce';
export type CourseFeedbackVariant = 'success' | 'error';

export interface CourseFeedback {
    id: number;
    scope: CourseFeedbackScope;
    variant: CourseFeedbackVariant;
    title: string;
    description?: string;
}

interface ApiErrorResponse {
    detail?: unknown;
    message?: unknown;
    error?: unknown;
}

const pickMessage = (value: unknown) => (
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
);

export const getCourseErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        const data = error.response?.data;
        const responseMessage = pickMessage(data?.detail) || pickMessage(data?.message) || pickMessage(data?.error);
        return responseMessage || pickMessage(error.message) || fallback;
    }

    if (error instanceof Error) {
        return pickMessage(error.message) || fallback;
    }

    return fallback;
};
