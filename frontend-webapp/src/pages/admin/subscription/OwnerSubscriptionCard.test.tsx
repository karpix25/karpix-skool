import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OwnerSubscriptionCard } from './OwnerSubscriptionCard';
import { useOwnerSubscription } from './useOwnerSubscription';

vi.mock('./useOwnerSubscription', () => ({ useOwnerSubscription: vi.fn() }));

const subscriptionHook = vi.mocked(useOwnerSubscription);
const subscription = {
    tenant_id: 'tenant-1',
    status: 'past_due' as const,
    plan: {
        code: 'pilot',
        name: 'Пилот',
        max_courses: 5,
        max_students: 100,
        max_ai_jobs_per_month: 40,
        max_storage_bytes: 1_073_741_824,
    },
    current_period_end: '2026-07-20T00:00:00Z',
    trial_ends_at: null,
    is_write_allowed: false,
    blocking_reason: 'subscription_past_due',
    usage: {
        courses_used: 2,
        students_used: 25,
        ai_jobs_used: 7,
        storage_bytes_used: 536_870_912,
    },
};

describe('OwnerSubscriptionCard', () => {
    beforeEach(() => {
        subscriptionHook.mockReturnValue({
            subscription,
            isLoading: false,
            error: null,
            reload: vi.fn(),
        });
    });

    it('shows plan, usage, read-only recovery and manual support action', () => {
        render(<OwnerSubscriptionCard tenantId="tenant-1" supportUrl="https://t.me/karpix_support" />);

        expect(screen.getByText('Пилот')).toBeInTheDocument();
        expect(screen.getByText('Школа работает только для чтения')).toBeInTheDocument();
        expect(screen.getByText('2 / 5')).toBeInTheDocument();
        expect(screen.getByText('25 / 100')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /связаться с поддержкой/i })).toHaveAttribute('href', 'https://t.me/karpix_support');
    });
});
