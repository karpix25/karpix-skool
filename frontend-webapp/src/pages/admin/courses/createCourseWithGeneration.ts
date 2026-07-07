import api from '../../../api/client';
import type { AdminCourse, CourseFormState } from '../../../types/admin';
import { startCourseStructureGeneration } from '../course-generation/courseStructureGenerationApi';
import { toCourseStructureGenerationInput } from '../course-generation/courseStructureGenerationForm';
import type { CourseStructureGenerationFormState } from '../course-generation/courseStructureGenerationTypes';
import type { CourseCreateMode } from './CourseNotebookGenerationFields';

interface CreateCourseWithGenerationOptions {
    course: CourseFormState;
    mode: CourseCreateMode;
    generationForm: CourseStructureGenerationFormState;
}

interface CreateCourseWithGenerationResult {
    course: AdminCourse;
    generationJobId: string;
}

export const createCourseWithGeneration = async ({
    course,
    mode,
    generationForm,
}: CreateCourseWithGenerationOptions): Promise<CreateCourseWithGenerationResult> => {
    const response = await api.post<AdminCourse>('/courses', course);
    const createdCourse = response.data;
    let generationJobId = '';

    if (mode === 'notebooklm') {
        const job = await startCourseStructureGeneration(
            createdCourse.id,
            toCourseStructureGenerationInput(generationForm)
        );
        generationJobId = job.id;
    }

    return { course: createdCourse, generationJobId };
};
