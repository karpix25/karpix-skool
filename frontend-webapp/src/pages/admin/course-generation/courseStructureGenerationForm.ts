import type { CourseStructureGenerationFormState, StartCourseStructureGenerationInput } from './courseStructureGenerationTypes';
import { toCourseGenerationSourcePayload } from '../course-sources/sourceValidation';

export const createDefaultCourseStructureGenerationForm = (): CourseStructureGenerationFormState => ({
    sourceUrl: '',
    sources: [],
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
