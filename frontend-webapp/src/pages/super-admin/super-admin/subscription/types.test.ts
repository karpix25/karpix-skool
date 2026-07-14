import { describe, expect, it } from 'vitest';

import {
    ALLOWED_SUBSCRIPTION_TRANSITIONS,
    SUBSCRIPTION_STATUS_LABELS,
} from './types';

describe('subscription lifecycle presentation', () => {
    it('has a visible label for every lifecycle status', () => {
        expect(SUBSCRIPTION_STATUS_LABELS).toEqual({
            draft: 'Черновик',
            trialing: 'Пробный период',
            active: 'Активна',
            past_due: 'Просрочена',
            suspended: 'Приостановлена',
            canceled: 'Отменена',
        });
    });

    it('does not offer a direct canceled-to-active transition', () => {
        expect(ALLOWED_SUBSCRIPTION_TRANSITIONS.canceled).toEqual(['draft']);
        expect(ALLOWED_SUBSCRIPTION_TRANSITIONS.active).toEqual([
            'past_due',
            'suspended',
            'canceled',
        ]);
    });
});
