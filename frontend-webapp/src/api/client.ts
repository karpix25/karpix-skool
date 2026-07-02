import axios from 'axios';

interface ApiErrorBody {
    detail?: unknown;
    message?: unknown;
    error?: unknown;
}

const knownForbiddenMessages: Record<string, string> = {
    'Admin access not approved':
        'Сервер отклонил admin-mode: для этого endpoint все еще требуется author approval. Если вы менеджер школы, проверьте выбранный tenant или попросите super admin обновить доступ.',
    'Access denied to this school':
        'Нет доступа к выбранной школе. Для admin-mode нужна роль owner, admin или moderator именно в этом tenant.',
    'Forbidden: You do not have management access to this school.':
        'Нет управленческого доступа к выбранной школе. Проверьте активный tenant и вашу membership role.',
    'Tenant ID required':
        'Выберите активную школу перед открытием admin-раздела.',
};

const getErrorText = (value: unknown) => (
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
);

const getForbiddenDetail = (data: unknown) => {
    if (!data || typeof data !== 'object') return null;
    const body = data as ApiErrorBody;
    return getErrorText(body.detail) || getErrorText(body.message) || getErrorText(body.error);
};

const normalizeForbiddenError = (data: unknown) => {
    const detail = getForbiddenDetail(data);
    const nextDetail = detail
        ? knownForbiddenMessages[detail] || detail
        : 'Нет доступа к этой операции. Проверьте выбранную школу и роль owner/admin/moderator.';

    return typeof data === 'object' && data !== null ? { ...data, detail: nextDetail } : { detail: nextDetail };
};

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    },
});

// Add Interceptor for Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    const activeTenantId = localStorage.getItem('activeTenantId');
    if (activeTenantId) {
        config.headers['X-Tenant-ID'] = activeTenantId;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            error.response.data = normalizeForbiddenError(error.response.data);
        }
        return Promise.reject(error);
    }
);

export default api;
