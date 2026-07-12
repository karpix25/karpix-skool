import api from '../api/client';
import type { SuperAdminLead } from '../pages/super-admin/super-admin/types';

export const SUPER_ADMIN_LEAD_ENDPOINTS = ['/super/applications', '/super/leads', '/leads/admin'] as const;

interface ApiResponse {
    data: unknown;
}

type LeadRequest = (endpoint: string) => Promise<ApiResponse>;

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

const extractLeadRows = (payload: unknown): unknown[] => {
    if (Array.isArray(payload)) return payload;
    if (!isRecord(payload)) return [];

    for (const key of ['leads', 'items', 'results', 'data']) {
        const value = payload[key];
        if (Array.isArray(value)) return value;
    }

    return [];
};

const normalizeLead = (lead: unknown, index: number): SuperAdminLead | null => {
    if (!isRecord(lead)) return null;
    const kind = pickString(lead, ['kind', 'type']) === 'author_request' ? 'author_request' : 'platform_lead';
    const id = pickString(lead, ['id', '_id', 'lead_id', 'user_id']) || `${kind}-${index}`;

    return {
        id,
        kind,
        name: pickString(lead, ['name', 'full_name', 'contact_name']),
        telegram: pickString(lead, ['telegram', 'telegram_username', 'username', 'handle']),
        schoolName: pickString(lead, ['schoolName', 'school_name', 'school']),
        description: pickString(lead, ['description', 'details', 'message', 'comment']),
        status: (pickString(lead, ['status', 'state']) || 'pending').toLowerCase(),
        adminNote: pickString(lead, ['adminNote', 'admin_note', 'note']),
        createdAt: pickString(lead, ['createdAt', 'created_at', 'submitted_at']),
        handledAt: pickString(lead, ['handledAt', 'handled_at']),
        source: pickString(lead, ['source', 'channel']) || (kind === 'author_request' ? 'Mini App' : 'Форма сайта'),
        userId: pickString(lead, ['userId', 'user_id']) || (kind === 'author_request' ? id.replace(/^author:/, '') : null),
        leadId: pickString(lead, ['leadId', 'lead_id']) || (kind === 'platform_lead' ? id.replace(/^lead:/, '') : null),
    };
};

const normalizeLeadList = (payload: unknown) => (
    extractLeadRows(payload)
        .map(normalizeLead)
        .filter((lead): lead is SuperAdminLead => lead !== null)
);

const isMissingEndpointError = (error: unknown) => {
    const status = isRecord(error) && isRecord(error.response) ? error.response.status : null;
    return status === 404 || status === 405;
};

export const fetchSuperAdminLeads = async (
    request: LeadRequest = (endpoint) => api.get(endpoint),
) => {
    let lastError: unknown = null;

    for (const endpoint of SUPER_ADMIN_LEAD_ENDPOINTS) {
        try {
            const response = await request(endpoint);
            return normalizeLeadList(response.data);
        } catch (error) {
            lastError = error;
            if (!isMissingEndpointError(error)) break;
        }
    }

    throw lastError;
};

export const updateSuperAdminLead = async (
    leadId: string,
    updates: { status?: string; admin_note?: string | null },
) => {
    const response = await api.patch(`/super/leads/${leadId}`, updates);
    return normalizeLead(response.data, 0);
};
