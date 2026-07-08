import type { CourseStructureGenerationFormState, StartCourseStructureGenerationInput } from './courseStructureGenerationTypes';
import { toCourseGenerationSourcePayload } from '../course-sources/sourceValidation';

export const createDefaultCourseStructureGenerationForm = (): CourseStructureGenerationFormState => ({
    sourceUrl: '',
    sources: [],
    moduleCount: 4,
    lessonsPerModule: 4,
    level: '',
    style: '',
    courseGoal: '',
    targetAudience: '',
    lessonFormat: 'Практические уроки с объяснением, примером и заданием',
    depth: '',
    practiceLevel: '',
    mediaStrategy: 'Ставить точные места для ручной вставки картинок, схем и скриншотов',
    monetizationStrategy: '',
});

export const toCourseStructureGenerationInput = (
	form: CourseStructureGenerationFormState
): StartCourseStructureGenerationInput => ({
    source_url: form.sourceUrl.trim() || undefined,
    sources: toCourseGenerationSourcePayload(form.sources),
    module_count: Math.min(12, Math.max(1, Math.trunc(form.moduleCount))),
    lessons_per_module: Math.min(12, Math.max(1, Math.trunc(form.lessonsPerModule))),
    level: form.level.trim() || undefined,
    style: form.style.trim() || undefined,
    course_goal: form.courseGoal.trim() || undefined,
    target_audience: form.targetAudience.trim() || undefined,
    lesson_format: form.lessonFormat.trim() || undefined,
    depth: form.depth.trim() || undefined,
    practice_level: form.practiceLevel.trim() || undefined,
    media_strategy: form.mediaStrategy.trim() || undefined,
    monetization_strategy: form.monetizationStrategy.trim() || undefined,
});
