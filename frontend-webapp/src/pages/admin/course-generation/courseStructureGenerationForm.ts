import type { CourseStructureGenerationFormState, StartCourseStructureGenerationInput } from './courseStructureGenerationTypes';

export const createDefaultCourseStructureGenerationForm = (): CourseStructureGenerationFormState => ({
    notebookLmUrl: '',
    moduleCount: 4,
    lessonsPerModule: 4,
    level: '',
    style: '',
});

export const toCourseStructureGenerationInput = (
    form: CourseStructureGenerationFormState
): StartCourseStructureGenerationInput => ({
    notebooklm_url: form.notebookLmUrl.trim(),
    module_count: Math.min(12, Math.max(1, Math.trunc(form.moduleCount))),
    lessons_per_module: Math.min(12, Math.max(1, Math.trunc(form.lessonsPerModule))),
    level: form.level.trim() || undefined,
    style: form.style.trim() || undefined,
});
