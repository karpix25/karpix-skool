import type { CourseGenerationSource } from '../course-sources/courseSourcesTypes';

export type CourseStructureGenerationJobStatus =
    | 'idle'
    | 'starting'
    | 'queued'
    | 'running'
    | 'completed'
    | 'failed';

export interface CourseStructureGenerationFormState {
    sourceUrl: string;
    sources: CourseGenerationSource[];
    moduleCount: number;
    lessonsPerModule: number;
    level: string;
    style: string;
    courseGoal: string;
    targetAudience: string;
    lessonFormat: string;
    depth: string;
    practiceLevel: string;
    mediaStrategy: string;
    monetizationStrategy: string;
}

export interface StartCourseStructureGenerationInput {
    source_url?: string;
    sources?: CourseGenerationSource[];
    module_count: number;
    lessons_per_module: number;
    level?: string;
    style?: string;
    course_goal?: string;
    target_audience?: string;
    lesson_format?: string;
    depth?: string;
    practice_level?: string;
    media_strategy?: string;
    monetization_strategy?: string;
}

export interface CourseStructureGenerationJob {
    id: string;
    status: CourseStructureGenerationJobStatus;
    message?: string | null;
    error?: string | null;
    notebook_url?: string | null;
    progress?: number | null;
    created_modules_count?: number | null;
    created_lessons_count?: number | null;
}

export type CourseStructureGenerationState = CourseStructureGenerationJob;
