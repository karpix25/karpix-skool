import api from '../api/client';
import type { SuperActivityItem } from '../pages/super-admin/super-admin/types';

interface ApiResponse {
    data: unknown;
}

type ActivityRequest = (endpoint: string) => Promise<ApiResponse>;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const pickString = (record: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim().length > 0) return value.trim();
        if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    }
    return null;
};

const extractRows = (payload: unknown): unknown[] => {
    if (Array.isArray(payload)) return payload;
    if (!isRecord(payload)) return [];

    for (const key of ['items', 'activity', 'events', 'data', 'results']) {
        const value = payload[key];
        if (Array.isArray(value)) return value;
    }

    return [];
};

const normalizeType = (value: string | null): SuperActivityItem['type'] => {
    const allowed: SuperActivityItem['type'][] = ['school', 'lead', 'author', 'student', 'learning', 'generation', 'system'];
    return allowed.includes(value as SuperActivityItem['type']) ? value as SuperActivityItem['type'] : 'system';
};

const normalizeTone = (value: string | null): SuperActivityItem['tone'] => {
    const allowed: SuperActivityItem['tone'][] = ['success', 'info', 'warning', 'danger'];
    return allowed.includes(value as SuperActivityItem['tone']) ? value as SuperActivityItem['tone'] : 'info';
};

const normalizeActivity = (item: unknown, index: number): SuperActivityItem | null => {
    if (!isRecord(item)) return null;
    const tenant = isRecord(item.tenant) ? item.tenant : null;
    const actor = isRecord(item.actor) ? item.actor : null;

    return {
        id: pickString(item, ['id', '_id']) || `activity-${index}`,
        occurredAt: pickString(item, ['occurredAt', 'occurred_at', 'timestamp', 'created_at']),
        type: normalizeType(pickString(item, ['type', 'category'])),
        eventType: pickString(item, ['eventType', 'event_type']) || 'system.event',
        tone: normalizeTone(pickString(item, ['tone', 'severity'])),
        title: pickString(item, ['title', 'headline']) || 'Событие',
        message: pickString(item, ['message', 'description', 'text']) || '',
        tenantName: tenant ? pickString(tenant, ['name', 'title']) : null,
        actorName: actor ? pickString(actor, ['username', 'name', 'telegram']) : null,
        meta: isRecord(item.meta) ? item.meta : null,
    };
};

export const normalizeSuperAdminActivity = (payload: unknown) => (
    extractRows(payload)
        .map(normalizeActivity)
        .filter((item): item is SuperActivityItem => item !== null)
);

export const fetchSuperAdminActivity = async (
    request: ActivityRequest = (endpoint) => api.get(endpoint),
): Promise<SuperActivityItem[]> => {
    const response = await request('/super/activity?limit=30');
    return normalizeSuperAdminActivity(response.data);
};
