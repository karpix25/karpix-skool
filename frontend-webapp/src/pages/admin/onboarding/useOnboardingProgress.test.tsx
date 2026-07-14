import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../../../api/client';
import { useOnboardingProgress } from './useOnboardingProgress';

vi.mock('../../../api/client', () => ({
    default: { get: vi.fn(), post: vi.fn() },
}));

const apiGet = vi.mocked(api.get);
const apiPost = vi.mocked(api.post);

describe('useOnboardingProgress', () => {
    beforeEach(() => {
        apiGet.mockReset();
        apiPost.mockReset();
    });

    it('loads courses, a published lesson and real student memberships', async () => {
        apiGet.mockResolvedValue({
            data: {
                has_school_profile: true,
                has_serving_subscription: true,
                courses_count: 1,
                published_course_id: 'course-1',
                students_count: 1,
                has_student_preview: false,
                is_completed: false,
            },
        } as never);

        const { result } = renderHook(() => useOnboardingProgress('tenant-1'));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.snapshot).toEqual({
            hasSchoolProfile: true,
            hasServingSubscription: true,
            coursesCount: 1,
            publishedCourseId: 'course-1',
            studentsCount: 1,
            hasStudentPreview: false,
            isCompleted: false,
        });
        expect(result.current.error).toBeNull();
        expect(apiGet).toHaveBeenCalledWith('/tenants/tenant-1/onboarding-status');
    });

    it('confirms student preview through the tenant-scoped endpoint', async () => {
        apiGet.mockResolvedValue({
            data: {
                has_school_profile: true,
                has_serving_subscription: true,
                courses_count: 1,
                published_course_id: 'course-1',
                students_count: 0,
                has_student_preview: false,
                is_completed: false,
            },
        } as never);
        apiPost.mockResolvedValue({
            data: {
                has_school_profile: true,
                has_serving_subscription: true,
                courses_count: 1,
                published_course_id: 'course-1',
                students_count: 0,
                has_student_preview: true,
                is_completed: false,
            },
        } as never);

        const { result } = renderHook(() => useOnboardingProgress('tenant-1'));
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        let confirmed = false;
        await act(async () => {
            confirmed = await result.current.confirmStudentPreview();
        });
        expect(confirmed).toBe(true);
        expect(apiPost).toHaveBeenCalledWith('/tenants/tenant-1/onboarding/student-preview');
        expect(result.current.snapshot.hasStudentPreview).toBe(true);
    });

    it('keeps the dashboard course fallback when progress refresh fails', async () => {
        apiGet.mockRejectedValue(new Error('offline'));
        const { result } = renderHook(() => useOnboardingProgress('tenant-1', 2));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.snapshot.coursesCount).toBe(2);
        expect(result.current.error).toContain('Не удалось обновить прогресс');
    });
});
