export type LessonGenerationJobStatus =
    | 'idle'
    | 'starting'
    | 'queued'
    | 'running'
    | 'completed'
    | 'failed';

export interface LessonGenerationFormState {
    notebookLmUrl: string;
    lessonCount: number;
    level: string;
    style: string;
}

export interface StartLessonGenerationInput {
    notebooklm_url: string;
    lesson_count: number;
    level?: string;
    style?: string;
}

export interface LessonGenerationJob {
    id: string;
    status: LessonGenerationJobStatus;
    message?: string | null;
    error?: string | null;
    progress?: number | null;
    created_lessons_count?: number | null;
}

export type LessonGenerationState = LessonGenerationJob;
