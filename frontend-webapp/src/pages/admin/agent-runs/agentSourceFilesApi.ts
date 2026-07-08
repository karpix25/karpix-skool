import api from '../../../api/client';
import { createCourseGenerationSource } from '../course-sources/sourceValidation';
import type {
    CourseGenerationSource,
    CourseGenerationSourceUploadResponse,
} from '../course-sources/courseSourcesTypes';

export const uploadAgentGenerationSourceFile = async (
    file: File
): Promise<CourseGenerationSource> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<CourseGenerationSourceUploadResponse>(
        '/agent/source-files',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    return createCourseGenerationSource(response.data.source);
};

export const uploadPendingAgentGenerationSourceFiles = async (
    sources: CourseGenerationSource[]
): Promise<CourseGenerationSource[]> => {
    const uploadedSources: CourseGenerationSource[] = [];

    for (const source of sources) {
        if (source.kind === 'file' && source.file && !source.url) {
            const uploaded = await uploadAgentGenerationSourceFile(source.file);
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
