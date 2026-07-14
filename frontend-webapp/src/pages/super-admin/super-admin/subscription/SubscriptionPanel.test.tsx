import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../../../../api/client';
import type { Tenant } from '../types';
import { SubscriptionPanel } from './SubscriptionPanel';

vi.mock('../../../../api/client', () => ({
    default: { get: vi.fn(), patch: vi.fn() },
}));

const tenant: Tenant = {
    id: 'tenant-1',
    name: 'Школа ремонта',
    owner_email: null,
    owner_username: 'owner',
    owner_telegram_id: null,
    subscription_status: 'active',
    expires_at: null,
    member_count: 18,
    course_count: 2,
    onboarding_stage: 'launched',
    has_telegram_group: true,
    has_published_lesson: true,
    student_count: 16,
};

const plan = {
    id: 'plan-1',
    code: 'start',
    name: 'Старт',
    max_courses: 3,
    max_students: 100,
    max_ai_jobs_per_month: 40,
    max_storage_bytes: 2_147_483_648,
    trial_days: 14,
};

const subscription = {
    tenant_id: tenant.id,
    status: 'active' as const,
    plan,
    current_period_start: '2026-07-01T00:00:00Z',
    current_period_end: '2026-08-01T00:00:00Z',
    trial_ends_at: null,
    is_write_allowed: true,
    is_ai_allowed: true,
    blocking_reason: null,
    usage: {
        courses_used: 2,
        students_used: 18,
        ai_jobs_used: 7,
        storage_bytes_used: 1_073_741_824,
    },
};

describe('SubscriptionPanel', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.patch).mockReset();
        vi.mocked(api.get).mockImplementation(async (url) => ({
            data: url === '/super/plans' ? [plan] : subscription,
        }));
        vi.mocked(api.patch).mockResolvedValue({ data: subscription });
    });

    it('shows limits and requires a reason for manual changes', async () => {
        const user = userEvent.setup();
        render(<SubscriptionPanel tenant={tenant} />);

        expect(await screen.findByText('Старт')).toBeInTheDocument();
        expect(screen.getByText('18 / 100')).toBeInTheDocument();
        expect(screen.getByText('1 ГБ / 2 ГБ')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Изменить вручную' }));
        await user.click(screen.getByRole('button', { name: 'Сохранить изменения' }));

        expect(screen.getByText(/Укажите причину изменения/i)).toBeInTheDocument();
        expect(api.patch).not.toHaveBeenCalled();

        await user.type(screen.getByLabelText('Причина изменения'), 'Продление после оплаты');
        await user.click(screen.getByRole('button', { name: 'Сохранить изменения' }));

        await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
            '/super/tenants/tenant-1/subscription',
            expect.objectContaining({
                plan_code: 'start',
                status: 'active',
                reason: 'Продление после оплаты',
            })
        ));
    });
});
