import { describe, expect, it } from 'vitest';

import {
    getCourseSubscription,
    getCourseSubscriptionEndpoint,
    normalizeCourseSubscription,
    subscribeToCourse,
    unsubscribeFromCourse,
} from './courseSubscriptions';

const courseId = 'course-1';

describe('courseSubscriptions service', () => {
    it('loads and normalizes the current subscription state', async () => {
        const calls: string[] = [];
        const state = await getCourseSubscription(courseId, async (endpoint) => {
            calls.push(endpoint);
            return {
                data: {
                    course_id: courseId,
                    is_subscribed: true,
                    updated_at: '2026-07-04T10:00:00Z',
                },
            };
        });

        expect(calls).toEqual([getCourseSubscriptionEndpoint(courseId)]);
        expect(state).toEqual({
            course_id: courseId,
            is_subscribed: true,
            updated_at: '2026-07-04T10:00:00Z',
        });
    });

    it('treats empty subscribe and unsubscribe responses as successful target states', async () => {
        await expect(subscribeToCourse(courseId, async () => ({ data: null }))).resolves.toMatchObject({
            is_subscribed: true,
        });

        await expect(unsubscribeFromCourse(courseId, async () => ({ data: null }))).resolves.toMatchObject({
            is_subscribed: false,
        });
    });

    it('accepts backend is_active as a subscription flag fallback', () => {
        expect(normalizeCourseSubscription({ is_active: true }, courseId, false)).toEqual({
            course_id: courseId,
            is_subscribed: true,
            updated_at: null,
        });
    });
});
