import { useCallback, useEffect, useState } from 'react';

import api from '../../../api/client';
import type { OnboardingProgressSnapshot } from './types';

interface TenantOnboardingStatusResponse {
    has_school_profile: boolean;
    has_serving_subscription: boolean;
    courses_count: number;
    published_course_id: string | null;
    students_count: number;
    has_student_preview: boolean;
    is_completed: boolean;
}

const emptySnapshot = (fallbackCoursesCount: number): OnboardingProgressSnapshot => ({
    hasSchoolProfile: false,
    hasServingSubscription: false,
    coursesCount: fallbackCoursesCount,
    publishedCourseId: null,
    studentsCount: 0,
    hasStudentPreview: false,
    isCompleted: false,
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
                hasSchoolProfile: response.data.has_school_profile,
                hasServingSubscription: response.data.has_serving_subscription,
                coursesCount: response.data.courses_count,
                publishedCourseId: response.data.published_course_id,
                studentsCount: response.data.students_count,
                hasStudentPreview: response.data.has_student_preview,
                isCompleted: response.data.is_completed,
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

    const confirmStudentPreview = useCallback(async () => {
        if (!tenantId) return false;

        setError(null);
        try {
            const response = await api.post<TenantOnboardingStatusResponse>(
                `/tenants/${tenantId}/onboarding/student-preview`,
            );
            setSnapshot({
                hasSchoolProfile: response.data.has_school_profile,
                hasServingSubscription: response.data.has_serving_subscription,
                coursesCount: response.data.courses_count,
                publishedCourseId: response.data.published_course_id,
                studentsCount: response.data.students_count,
                hasStudentPreview: response.data.has_student_preview,
                isCompleted: response.data.is_completed,
            });
            return true;
        } catch (requestError) {
            console.error('Failed to confirm student preview:', requestError);
            setError('Не удалось подтвердить проверку режима ученика. Обновите прогресс и попробуйте ещё раз.');
            return false;
        }
    }, [tenantId]);

    return { snapshot, isLoading, error, refresh, confirmStudentPreview };
};
