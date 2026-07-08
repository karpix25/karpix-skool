import type { CourseDetailData, LessonCompletionResponse } from '../../../types/course';

export const applyLessonCompletionToCourseData = (
    data: CourseDetailData,
    lessonId: string,
    completion: LessonCompletionResponse,
): CourseDetailData => ({
    ...data,
    progress_percent: completion.course_progress.progress_percent,
    modules: data.modules.map((module) => {
        const isCompletedModule = module.id === completion.module_progress.module_id;

        return {
            ...module,
            total_lessons: isCompletedModule ? completion.module_progress.total_lessons : module.total_lessons,
            completed_lessons: isCompletedModule ? completion.module_progress.completed_lessons : module.completed_lessons,
            progress_percent: isCompletedModule ? completion.module_progress.progress_percent : module.progress_percent,
            lessons: module.lessons.map((lesson) => (
                lesson.id === lessonId ? { ...lesson, is_completed: true } : lesson
            )),
        };
    }),
});
