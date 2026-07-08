import type { AgentArtifact, AgentRun, AgentRunStatus } from './types';

export const runStatusLabels: Record<AgentRunStatus, string> = {
    running: 'В работе',
    draft_created: 'Черновик',
    approved: 'Одобрен',
    published: 'Опубликован',
    rejected: 'Отклонен',
    failed: 'Ошибка',
};

export const approvalStatusLabels = {
    pending: 'На проверке',
    approved: 'Одобрено',
    rejected: 'Отклонено',
};

export const getCourseArtifact = (run: AgentRun) => (
    run.artifacts.find((artifact) => artifact.artifact_type === 'course' && artifact.resource_type === 'course') || null
);

export const getSourceJobArtifact = (run: AgentRun) => (
    run.artifacts.find((artifact) => artifact.artifact_type === 'course_structure_generation_job') || null
);

export const getCourseTitle = (run: AgentRun) => {
    const artifactTitle = getCourseArtifact(run)?.title;
    if (artifactTitle) return artifactTitle;

    const title = run.input_json?.course_title || run.input_json?.title;
    return typeof title === 'string' && title.trim() ? title : 'Без названия';
};

export const countArtifacts = (run: AgentRun, type: AgentArtifact['artifact_type']) => (
    run.artifacts.filter((artifact) => artifact.artifact_type === type).length
);

export const getMediaUrl = (artifact: AgentArtifact) => {
    const url = artifact.payload_json?.url;
    return typeof url === 'string' && url ? url : null;
};

export const getErrorMessage = (error: unknown, fallback: string) => {
    if (!error || typeof error !== 'object') return fallback;
    const maybeResponse = error as { response?: { data?: { detail?: unknown; message?: unknown; error?: unknown } } };
    const body = maybeResponse.response?.data;
    const detail = body?.detail || body?.message || body?.error;
    return typeof detail === 'string' && detail.trim() ? detail.trim() : fallback;
};

export const formatDateTime = (value: string) => (
    new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value))
);
