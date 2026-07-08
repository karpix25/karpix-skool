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

export const uploadPendingCourseGenerationSourceFiles = async (
    courseId: string,
    sources: CourseGenerationSource[]
): Promise<CourseGenerationSource[]> => {
    const uploadedSources: CourseGenerationSource[] = [];

    for (const source of sources) {
        if (source.kind === 'file' && source.file && !source.url) {
            const uploaded = await uploadCourseGenerationSourceFile(courseId, source.file);
            uploadedSources.push({
                ...uploaded,
                title: source.title || uploaded.title,
            });
            continue;
        }

        uploadedSources.push(source);
    }

    return uploadedSources;
};
