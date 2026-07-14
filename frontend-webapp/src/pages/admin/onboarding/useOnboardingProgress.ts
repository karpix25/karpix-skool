import { useCallback, useEffect, useState } from 'react';

import api from '../../../api/client';
import type { OnboardingProgressSnapshot } from './types';

interface TenantOnboardingStatusResponse {
    courses_count: number;
    published_course_id: string | null;
    students_count: number;
}

const emptySnapshot = (fallbackCoursesCount: number): OnboardingProgressSnapshot => ({
    coursesCount: fallbackCoursesCount,
    publishedCourseId: null,
    studentsCount: 0,
});

export const useOnboardingProgress = (tenantId: string | null, fallbackCoursesCount = 0) => {
    const [snapshot, setSnapshot] = useState<OnboardingProgressSnapshot>(() => emptySnapshot(fallbackCoursesCount));
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!tenantId) {
            setSnapshot(emptySnapshot(fallbackCoursesCount));
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await api.get<TenantOnboardingStatusResponse>(
                `/tenants/${tenantId}/onboarding-status`,
            );

            setSnapshot({
                coursesCount: response.data.courses_count,
                publishedCourseId: response.data.published_course_id,
                studentsCount: response.data.students_count,
            });
        } catch (requestError) {
            console.error('Failed to load onboarding progress:', requestError);
            setSnapshot((current) => ({
                ...current,
                coursesCount: Math.max(current.coursesCount, fallbackCoursesCount),
            }));
            setError('Не удалось обновить прогресс запуска. Проверьте соединение и повторите попытку.');
        } finally {
            setIsLoading(false);
        }
    }, [fallbackCoursesCount, tenantId]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { snapshot, isLoading, error, refresh };
};
