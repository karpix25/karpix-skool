import { describe, expect, it } from 'vitest';

import { fetchSuperAdminLeads, SUPER_ADMIN_LEAD_ENDPOINTS } from './superAdminLeads';

describe('fetchSuperAdminLeads', () => {
    it('loads and normalizes leads from the primary endpoint', async () => {
        const calls: string[] = [];
        const leads = await fetchSuperAdminLeads(async (endpoint) => {
            calls.push(endpoint);
            return {
                data: {
                    leads: [{
                        id: 'lead-1',
                        name: 'Иван',
                        telegram_username: '@ivan',
                        school_name: 'Маркетинг',
                        details: 'Хочу школу по рекламе',
                        status: 'NEW',
                        created_at: '2026-07-04T10:00:00Z',
                    }],
                },
            };
        });

        expect(calls).toEqual([SUPER_ADMIN_LEAD_ENDPOINTS[0]]);
        expect(leads).toEqual([{
            id: 'lead-1',
            name: 'Иван',
            telegram: '@ivan',
            schoolName: 'Маркетинг',
            description: 'Хочу школу по рекламе',
            status: 'new',
            adminNote: null,
            createdAt: '2026-07-04T10:00:00Z',
            handledAt: null,
            source: null,
        }]);
    });

    it('falls back to the legacy admin endpoint only when the primary endpoint is missing', async () => {
        const calls: string[] = [];
        const leads = await fetchSuperAdminLeads(async (endpoint) => {
            calls.push(endpoint);
            if (endpoint === SUPER_ADMIN_LEAD_ENDPOINTS[0]) {
                throw { response: { status: 404 } };
            }

            return {
                data: [{
                    _id: 'legacy-1',
                    contact_name: 'Анна',
                    handle: '@anna',
                    school: 'Дизайн',
                    message: 'Нужна платформа',
                    state: 'pending',
                    channel: 'landing',
                }],
            };
        });

        expect(calls).toEqual([...SUPER_ADMIN_LEAD_ENDPOINTS]);
        expect(leads[0]).toMatchObject({
            id: 'legacy-1',
            name: 'Анна',
            telegram: '@anna',
            schoolName: 'Дизайн',
            description: 'Нужна платформа',
            status: 'pending',
            source: 'landing',
        });
    });

    it('does not hide permission errors behind endpoint fallback', async () => {
        const calls: string[] = [];

        await expect(fetchSuperAdminLeads(async (endpoint) => {
            calls.push(endpoint);
            throw { response: { status: 403 } };
        })).rejects.toMatchObject({
            response: { status: 403 },
        });

        expect(calls).toEqual([SUPER_ADMIN_LEAD_ENDPOINTS[0]]);
    });
});
