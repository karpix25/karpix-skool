import api from '../../../api/client';
import { createCourseGenerationSource } from './sourceValidation';
import type {
    CourseGenerationSource,
    CourseGenerationSourceUploadResponse,
} from './courseSourcesTypes';

export const uploadCourseGenerationSourceFile = async (
    courseId: string,
    file: File
): Promise<CourseGenerationSource> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<CourseGenerationSourceUploadResponse>(
        `/courses/${courseId}/generation-source-files`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    return createCourseGenerationSource(response.data.source);
};
