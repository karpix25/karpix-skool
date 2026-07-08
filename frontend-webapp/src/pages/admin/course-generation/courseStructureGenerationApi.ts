import api from '../../../api/client';
import type {
    CourseStructureGenerationJob,
    CourseStructureGenerationJobStatus,
    StartCourseStructureGenerationInput,
} from './courseStructureGenerationTypes';

type CourseStructureGenerationApiBody = Record<string, unknown>;

const statusAliases: Record<string, CourseStructureGenerationJobStatus> = {
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

const normalizeStatus = (status: unknown): CourseStructureGenerationJobStatus => {
    if (typeof status !== 'string') return 'queued';
    return statusAliases[status.toLowerCase()] || 'queued';
};

const pickString = (body: CourseStructureGenerationApiBody, keys: string[]) => {
    for (const key of keys) {
        const value = body[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
};

const pickNumber = (body: CourseStructureGenerationApiBody, keys: string[]) => {
    for (const key of keys) {
        const value = body[key];
        if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    return null;
};

const normalizeCourseStructureGenerationJob = (
    body: CourseStructureGenerationApiBody
): CourseStructureGenerationJob => ({
    id: pickString(body, ['id', 'job_id']) || '',
    status: normalizeStatus(body.status),
    message: pickString(body, ['message', 'detail']),
    error: pickString(body, ['error_message', 'error']),
    progress: pickNumber(body, ['progress', 'progress_percent']),
    created_modules_count: pickNumber(body, ['created_modules_count', 'created_module_count', 'modules_created']),
    created_lessons_count: pickNumber(body, ['created_lessons_count', 'created_lesson_count', 'lessons_created']),
});

export const startCourseStructureGeneration = async (
    courseId: string,
    input: StartCourseStructureGenerationInput
	): Promise<CourseStructureGenerationJob> => {
	    const payload = {
	        source_url: input.source_url,
	        module_count: input.module_count,
        lessons_per_module: input.lessons_per_module,
        audience_level: input.level,
        style: input.style,
    };
    const response = await api.post<CourseStructureGenerationApiBody>(
        `/courses/${courseId}/structure-generation-jobs`,
        payload
    );
    return normalizeCourseStructureGenerationJob(response.data);
};

export const fetchCourseStructureGenerationJob = async (jobId: string): Promise<CourseStructureGenerationJob> => {
    const response = await api.get<CourseStructureGenerationApiBody>(`/courses/structure-generation-jobs/${jobId}`);
    return normalizeCourseStructureGenerationJob(response.data);
};
