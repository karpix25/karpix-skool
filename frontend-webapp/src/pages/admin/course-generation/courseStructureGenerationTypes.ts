export type CourseStructureGenerationJobStatus =
    | 'idle'
    | 'starting'
    | 'queued'
    | 'running'
    | 'completed'
    | 'failed';

export interface CourseStructureGenerationFormState {
    sourceUrl: string;
    moduleCount: number;
    lessonsPerModule: number;
    level: string;
    style: string;
}

export interface StartCourseStructureGenerationInput {
    source_url: string;
    module_count: number;
    lessons_per_module: number;
    level?: string;
    style?: string;
}

export interface CourseStructureGenerationJob {
    id: string;
    status: CourseStructureGenerationJobStatus;
    message?: string | null;
    error?: string | null;
    progress?: number | null;
    created_modules_count?: number | null;
    created_lessons_count?: number | null;
}

export type CourseStructureGenerationState = CourseStructureGenerationJob;
