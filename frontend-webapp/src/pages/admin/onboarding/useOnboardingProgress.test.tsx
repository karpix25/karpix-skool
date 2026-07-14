import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../../../api/client';
import { useOnboardingProgress } from './useOnboardingProgress';

vi.mock('../../../api/client', () => ({
    default: { get: vi.fn() },
}));

const apiGet = vi.mocked(api.get);

describe('useOnboardingProgress', () => {
    beforeEach(() => {
        apiGet.mockReset();
    });

    it('loads courses, a published lesson and real student memberships', async () => {
        apiGet.mockResolvedValue({
            data: {
                courses_count: 1,
                published_course_id: 'course-1',
                students_count: 1,
            },
        } as never);

        const { result } = renderHook(() => useOnboardingProgress('tenant-1'));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.snapshot).toEqual({
            coursesCount: 1,
            publishedCourseId: 'course-1',
            studentsCount: 1,
        });
        expect(result.current.error).toBeNull();
        expect(apiGet).toHaveBeenCalledWith('/tenants/tenant-1/onboarding-status');
    });

    it('keeps the dashboard course fallback when progress refresh fails', async () => {
        apiGet.mockRejectedValue(new Error('offline'));
        const { result } = renderHook(() => useOnboardingProgress('tenant-1', 2));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.snapshot.coursesCount).toBe(2);
        expect(result.current.error).toContain('Не удалось обновить прогресс');
    });
});
