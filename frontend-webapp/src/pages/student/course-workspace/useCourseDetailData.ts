import { useEffect, useState } from 'react';

import api from '../../../api/client';
import { getApiErrorMessage } from '../../../services/apiError';
import type { CourseDetailData } from '../../../types/course';

interface CourseDetailLoadState {
    courseId?: string;
    data: CourseDetailData | null;
    error: string | null;
    status: 'loading' | 'loaded' | 'error';
}

export const useCourseDetailData = (courseId?: string) => {
    const [loadState, setLoadState] = useState<CourseDetailLoadState>({
        data: null,
        error: null,
        status: 'loading',
    });

    useEffect(() => {
        if (!courseId) return undefined;

        let isMounted = true;

        api.get<CourseDetailData>(`/webapp/courses/${courseId}`)
            .then((res) => {
                if (isMounted) {
                    setLoadState({ courseId, data: res.data, error: null, status: 'loaded' });
                }
            })
            .catch((err) => {
                console.error(err);
                if (isMounted) {
                    setLoadState({
                        courseId,
                        data: null,
                        error: getApiErrorMessage(err, 'Не удалось открыть курс. Попробуйте вернуться к списку.'),
                        status: 'error',
                    });
                }
            });

        return () => {
            isMounted = false;
        };
    }, [courseId]);

    const isCurrentCourse = loadState.courseId === courseId;

    return {
        data: isCurrentCourse ? loadState.data : null,
        error: courseId ? (isCurrentCourse ? loadState.error : null) : 'Курс не найден или больше недоступен.',
        isLoading: Boolean(courseId) && (loadState.status === 'loading' || !isCurrentCourse),
        setData: (nextData: CourseDetailData) => {
            setLoadState({ courseId, data: nextData, error: null, status: 'loaded' });
        },
    };
};
