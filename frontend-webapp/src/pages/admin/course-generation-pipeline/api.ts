import api from '../../../api/client';
import { toCourseGenerationSourcePayload } from '../course-sources/sourceValidation';
import {
    normalizeCourseGenerationApprovalStatus,
    normalizeCourseGenerationPipelineStatus,
} from './status';
import type {
    CourseGenerationBlueprint,
    CourseGenerationMediaPlan,
    CourseGenerationPipelineRun,
    CourseGenerationPublishChecklistItem,
    PublishCourseGenerationPipelineInput,
    RequestBlueprintChangesInput,
    StartCourseGenerationPipelineInput,
    UpdateMediaPlanInput,
} from './types';

type PipelineApiBody = Record<string, unknown>;

const asRecord = (value: unknown): PipelineApiBody => (
    value && typeof value === 'object' && !Array.isArray(value) ? value as PipelineApiBody : {}
);

const pickString = (body: PipelineApiBody, keys: string[]) => {
    for (const key of keys) {
        const value = body[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
};

const pickNumber = (body: PipelineApiBody, keys: string[]) => {
    for (const key of keys) {
        const value = body[key];
        if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    return null;
};

const pickObject = <T>(body: PipelineApiBody, keys: string[]): T | null => {
    for (const key of keys) {
        const value = body[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) return value as T;
    }
    return null;
};

const pickArray = <T>(body: PipelineApiBody, keys: string[]): T[] => {
    for (const key of keys) {
        const value = body[key];
        if (Array.isArray(value)) return value as T[];
    }
    return [];
};

const withoutEmptyValues = (body: PipelineApiBody): PipelineApiBody => (
    Object.fromEntries(
        Object.entries(body).filter(([, value]) => value !== undefined && value !== '')
    )
);

export const normalizeCourseGenerationPipelineRun = (raw: unknown): CourseGenerationPipelineRun => {
    const body = asRecord(raw);

    return {
        id: pickString(body, ['id', 'run_id']) || '',
        course_id: pickString(body, ['course_id', 'courseId']) || '',
        status: normalizeCourseGenerationPipelineStatus(body.status, 'idle'),
        approval_status: normalizeCourseGenerationApprovalStatus(body.approval_status),
        title: pickString(body, ['title', 'course_title']),
        sources: pickArray(body, ['sources']),
        blueprint: pickObject<CourseGenerationBlueprint>(body, ['blueprint']),
        media_plan: pickObject<CourseGenerationMediaPlan>(body, ['media_plan', 'mediaPlan']),
        checklist: pickArray<CourseGenerationPublishChecklistItem>(body, ['checklist', 'publish_checklist']),
        timeline: pickArray(body, ['timeline', 'steps']),
        progress: pickNumber(body, ['progress', 'progress_percent']),
        message: pickString(body, ['message', 'detail']),
        error: pickString(body, ['error', 'error_message']),
        created_at: pickString(body, ['created_at', 'createdAt']),
        updated_at: pickString(body, ['updated_at', 'updatedAt']),
        completed_at: pickString(body, ['completed_at', 'completedAt']),
    };
};

export const startCourseGenerationPipeline = async (
    courseId: string,
    input: StartCourseGenerationPipelineInput
): Promise<CourseGenerationPipelineRun> => {
    const payload = withoutEmptyValues({
        notebook_url: input.notebook_url?.trim(),
        sources: toCourseGenerationSourcePayload(input.sources),
        module_count: input.module_count,
        lessons_per_module: input.lessons_per_module,
        audience_level: input.audience_level?.trim(),
        style: input.style?.trim(),
    });

    const response = await api.post<PipelineApiBody>(
        `/courses/${courseId}/generation-pipeline-runs`,
        payload
    );
    return normalizeCourseGenerationPipelineRun(response.data);
};

export const fetchCourseGenerationPipelineRun = async (
    runId: string
): Promise<CourseGenerationPipelineRun> => {
    const response = await api.get<PipelineApiBody>(`/courses/generation-pipeline-runs/${runId}`);
    return normalizeCourseGenerationPipelineRun(response.data);
};

export const approveCourseGenerationBlueprint = async (
    runId: string
): Promise<CourseGenerationPipelineRun> => {
    const response = await api.post<PipelineApiBody>(
        `/courses/generation-pipeline-runs/${runId}/blueprint/approve`
    );
    return normalizeCourseGenerationPipelineRun(response.data);
};

export const requestCourseGenerationBlueprintChanges = async (
    runId: string,
    input: RequestBlueprintChangesInput
): Promise<CourseGenerationPipelineRun> => {
    const response = await api.post<PipelineApiBody>(
        `/courses/generation-pipeline-runs/${runId}/blueprint/request-changes`,
        { comment: input.comment.trim() }
    );
    return normalizeCourseGenerationPipelineRun(response.data);
};

export const updateCourseGenerationMediaPlan = async (
    runId: string,
    input: UpdateMediaPlanInput
): Promise<CourseGenerationPipelineRun> => {
    const response = await api.patch<PipelineApiBody>(
        `/courses/generation-pipeline-runs/${runId}/media-plan`,
        { items: input.items }
    );
    return normalizeCourseGenerationPipelineRun(response.data);
};

export const publishCourseGenerationPipeline = async (
    runId: string,
    input: PublishCourseGenerationPipelineInput
): Promise<CourseGenerationPipelineRun> => {
    const response = await api.post<PipelineApiBody>(
        `/courses/generation-pipeline-runs/${runId}/publish`,
        {
            checklist: input.checklist,
            notify_students: input.notify_students,
        }
    );
    return normalizeCourseGenerationPipelineRun(response.data);
};
