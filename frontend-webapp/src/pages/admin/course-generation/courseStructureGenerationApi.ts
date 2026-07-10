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
    partial_drafts: 'partial_drafts',
    needs_attention: 'needs_attention',
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

const pickBoolean = (body: CourseStructureGenerationApiBody, keys: string[]) => {
    for (const key of keys) {
        const value = body[key];
        if (typeof value === 'boolean') return value;
    }
    return null;
};

const normalizeCourseStructureGenerationJob = (
    body: CourseStructureGenerationApiBody
): CourseStructureGenerationJob => {
    const status = normalizeStatus(body.status);
    const planned = pickNumber(body, ['planned_lesson_count', 'planned_lessons_count', 'planned']);
    const ready = pickNumber(body, ['ready_lesson_count', 'ready_lessons_count', 'ready']);
    const failed = pickNumber(body, ['failed_lesson_count', 'failed_lessons_count', 'failed_count']);
    const sourceGap = pickNumber(body, ['source_gap_lesson_count', 'source_gap_lessons_count', 'source_gap']);
    const explicitProgress = pickNumber(body, ['progress', 'progress_percent']);
    const explicitCanResume = pickBoolean(body, ['can_resume', 'resumable']);

    return {
        id: pickString(body, ['id', 'job_id']) || '',
        status,
        message: pickString(body, ['message', 'detail']),
        error: pickString(body, ['error_message', 'error']),
        notebook_url: pickString(body, ['notebook_url', 'source_url', 'open_notebook_url']),
        progress: explicitProgress ?? (planned && ready !== null ? Math.round((ready / planned) * 100) : null),
        created_modules_count: pickNumber(body, ['created_modules_count', 'created_module_count', 'modules_created']),
        created_lessons_count: pickNumber(body, ['created_lessons_count', 'created_lesson_count', 'lessons_created']),
        planned_lesson_count: planned,
        ready_lesson_count: ready,
        failed_lesson_count: failed,
        source_gap_lesson_count: sourceGap,
        current_stage: pickString(body, ['current_stage', 'stage']),
        can_resume: explicitCanResume ?? (
            (status === 'partial_drafts' || status === 'needs_attention')
            && Boolean((failed || 0) + (sourceGap || 0))
        ),
    };
};

export const startCourseStructureGeneration = async (
    courseId: string,
    input: StartCourseStructureGenerationInput
): Promise<CourseStructureGenerationJob> => {
    const payload = {
        idempotency_key: input.idempotency_key || createGenerationIdempotencyKey(),
        source_url: input.source_url,
        sources: input.sources,
        audience_level: input.level,
        style: input.style,
        course_goal: input.course_goal,
        target_audience: input.target_audience,
        point_a: input.point_a,
        point_b: input.point_b,
        global_benefit: input.global_benefit,
        author_experience: input.author_experience,
        lesson_format: input.lesson_format,
        depth: input.depth,
        practice_level: input.practice_level,
        media_strategy: input.media_strategy,
        monetization_strategy: input.monetization_strategy,
    };
    const response = await api.post<CourseStructureGenerationApiBody>(
        `/courses/${courseId}/structure-generation-jobs`,
        payload
    );
    return normalizeCourseStructureGenerationJob(response.data);
};

const createGenerationIdempotencyKey = () => {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }
    return `course-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const fetchCourseStructureGenerationJob = async (jobId: string): Promise<CourseStructureGenerationJob> => {
    const response = await api.get<CourseStructureGenerationApiBody>(`/courses/structure-generation-jobs/${jobId}`);
    return normalizeCourseStructureGenerationJob(response.data);
};

export const fetchLatestCourseStructureGenerationJob = async (
    courseId: string
): Promise<CourseStructureGenerationJob | null> => {
    const response = await api.get<CourseStructureGenerationApiBody | null>(
        `/courses/${courseId}/structure-generation-jobs/latest`
    );
    return response.data ? normalizeCourseStructureGenerationJob(response.data) : null;
};

export const resumeCourseStructureGenerationJob = async (
    jobId: string,
    includeSourceGaps = false,
): Promise<CourseStructureGenerationJob> => {
    const response = await api.post<CourseStructureGenerationApiBody>(
        `/courses/structure-generation-jobs/${jobId}/resume`,
        { include_source_gaps: includeSourceGaps },
    );
    return normalizeCourseStructureGenerationJob(response.data);
};
