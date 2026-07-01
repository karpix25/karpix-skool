import axios from 'axios';

interface ApiErrorBody {
    detail?: string;
}

export function getApiErrorMessage(error: unknown, fallback = 'Неизвестная ошибка'): string {
    if (axios.isAxiosError<ApiErrorBody>(error)) {
        return error.response?.data?.detail || error.message || fallback;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
}
