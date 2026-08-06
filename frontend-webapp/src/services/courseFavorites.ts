import api from '../api/client';
import type { StudentCourse } from '../types/course';

export const getStudentFavorites = async (tenantId: string): Promise<StudentCourse[]> => {
    const response = await api.get<StudentCourse[]>('/webapp/favorites', { params: { tenant_id: tenantId } });
    return Array.isArray(response.data) ? response.data : [];
};

export const setStudentFavorite = async (courseId: string, favorite: boolean) => {
    if (favorite) {
        await api.post(`/webapp/courses/${courseId}/favorite`);
    } else {
        await api.delete(`/webapp/courses/${courseId}/favorite`);
    }
};
