import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../../api/client';
import { AdminOnboarding } from './AdminOnboarding';
import { useOnboardingProgress } from './onboarding/useOnboardingProgress';

vi.mock('../../api/client', () => ({
    default: { post: vi.fn() },
}));

vi.mock('./onboarding/useOnboardingProgress', () => ({
    useOnboardingProgress: vi.fn(),
}));

const apiPost = vi.mocked(api.post);
const progressHook = vi.mocked(useOnboardingProgress);
const refresh = vi.fn();

describe('AdminOnboarding', () => {
    beforeEach(() => {
        apiPost.mockReset();
        refresh.mockReset();
        progressHook.mockReturnValue({
            snapshot: {
                hasSchoolProfile: true,
                hasServingSubscription: true,
                coursesCount: 1,
                publishedCourseId: 'course-1',
                studentsCount: 1,
                hasStudentPreview: true,
                isCompleted: false,
            },
            isLoading: false,
            error: null,
            refresh,
            confirmStudentPreview: vi.fn(),
        });
    });

    it('completes onboarding through the tenant-scoped endpoint', async () => {
        apiPost.mockResolvedValue({ data: {} } as never);
        render(
            <MemoryRouter>
                <AdminOnboarding
                    tenant={{ id: 'tenant-1', telegram_group_id: 123 }}
                    coursesCount={1}
                />
            </MemoryRouter>,
        );

        await userEvent.click(screen.getByRole('button', { name: /завершить настройку/i }));

        await waitFor(() => {
            expect(apiPost).toHaveBeenCalledWith('/tenants/tenant-1/onboarding/complete');
            expect(refresh).toHaveBeenCalledOnce();
        });
    });
});
