import type { CourseGenerationSource } from '../course-sources/courseSourcesTypes';

export type CourseStructureGenerationJobStatus =
    | 'idle'
    | 'starting'
    | 'queued'
    | 'running'
    | 'partial_drafts'
    | 'needs_attention'
    | 'completed'
    | 'failed';

export interface CourseStructureGenerationFormState {
    sourceUrl: string;
    sources: CourseGenerationSource[];
    level: string;
    style: string;
    courseGoal: string;
    targetAudience: string;
    pointA: string;
    pointB: string;
    globalBenefit: string;
    authorExperience: string;
    lessonFormat: string;
    depth: string;
    practiceLevel: string;
    mediaStrategy: string;
    monetizationStrategy: string;
}

export interface StartCourseStructureGenerationInput {
    idempotency_key?: string;
    source_url?: string;
    sources?: CourseGenerationSource[];
    level?: string;
    style?: string;
    course_goal?: string;
    target_audience?: string;
    point_a?: string;
    point_b?: string;
    global_benefit?: string;
    author_experience?: string;
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
    planned_lesson_count?: number | null;
    ready_lesson_count?: number | null;
    failed_lesson_count?: number | null;
    source_gap_lesson_count?: number | null;
    current_stage?: string | null;
    can_resume?: boolean;
}

export type CourseStructureGenerationState = CourseStructureGenerationJob;
