import api from '../../../api/client';
import type { LessonGenerationJob, LessonGenerationJobStatus, StartLessonGenerationInput } from './lessonGenerationTypes';

type LessonGenerationApiBody = Record<string, unknown>;

const statusAliases: Record<string, LessonGenerationJobStatus> = {
    pending: 'queued',
    queued: 'queued',
    running: 'running',
    processing: 'running',
    success: 'completed',
    succeeded: 'completed',
    drafts_created: 'completed',
    completed: 'completed',
    done: 'completed',
    failed: 'failed',
    error: 'failed',
    invalid_notebook: 'failed',
    invalid_output: 'failed',
    needs_reauth: 'failed',
};

const normalizeStatus = (status: unknown): LessonGenerationJobStatus => {
    if (typeof status !== 'string') return 'queued';
    return statusAliases[status.toLowerCase()] || 'queued';
};

const pickString = (body: LessonGenerationApiBody, keys: string[]) => {
    for (const key of keys) {
        const value = body[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
};

const pickNumber = (body: LessonGenerationApiBody, keys: string[]) => {
    for (const key of keys) {
        const value = body[key];
        if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    return null;
};

const normalizeLessonGenerationJob = (body: LessonGenerationApiBody): LessonGenerationJob => ({
    id: pickString(body, ['id', 'job_id']) || '',
    status: normalizeStatus(body.status),
    message: pickString(body, ['message', 'detail']),
    error: pickString(body, ['error_message', 'error']),
    progress: pickNumber(body, ['progress', 'progress_percent']),
    created_lessons_count: pickNumber(body, ['created_lessons_count', 'created_lesson_count', 'lessons_created', 'lesson_count']),
});

export const startLessonGeneration = async (
    moduleId: string,
    input: StartLessonGenerationInput
	): Promise<LessonGenerationJob> => {
	    const payload = {
	        source_url: input.source_url,
	        lesson_count: input.lesson_count,
        audience_level: input.level,
        style: input.style,
    };
    const response = await api.post<LessonGenerationApiBody>(
        `/courses/modules/${moduleId}/lesson-generation-jobs`,
        payload
    );
    return normalizeLessonGenerationJob(response.data);
};

export const fetchLessonGenerationJob = async (jobId: string): Promise<LessonGenerationJob> => {
    const response = await api.get<LessonGenerationApiBody>(`/courses/lesson-generation-jobs/${jobId}`);
    return normalizeLessonGenerationJob(response.data);
};
