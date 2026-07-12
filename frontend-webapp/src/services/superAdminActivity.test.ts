import { describe, expect, it } from 'vitest';

import { fetchSuperAdminActivity, normalizeSuperAdminActivity } from './superAdminActivity';

describe('superAdminActivity', () => {
    it('loads and normalizes activity rows', async () => {
        const calls: string[] = [];
        const items = await fetchSuperAdminActivity(async (endpoint) => {
            calls.push(endpoint);
            return {
                data: [{
                    id: 'audit-1',
                    occurred_at: '2026-07-12T10:00:00Z',
                    type: 'author',
                    event_type: 'author.requested',
                    tone: 'warning',
                    title: 'Новая заявка автора',
                    message: 'karlo запросил доступ к школе.',
                    actor: { username: 'karlo' },
                }],
            };
        });

        expect(calls).toEqual(['/super/activity?limit=30']);
        expect(items[0]).toMatchObject({
            id: 'audit-1',
            occurredAt: '2026-07-12T10:00:00Z',
            type: 'author',
            eventType: 'author.requested',
            tone: 'warning',
            actorName: 'karlo',
        });
    });

    it('falls back to safe display values for unknown types and tones', () => {
        const items = normalizeSuperAdminActivity([{ id: 'x', type: 'unknown', tone: 'loud' }]);

        expect(items[0]).toMatchObject({
            type: 'system',
            tone: 'info',
            title: 'Событие',
            message: '',
        });
    });
});
