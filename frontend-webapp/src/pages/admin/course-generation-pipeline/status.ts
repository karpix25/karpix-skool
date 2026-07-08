import type {
    CourseGenerationApprovalStatus,
    CourseGenerationMediaStatus,
    CourseGenerationPipelinePhase,
    CourseGenerationPipelineStatus,
    CourseGenerationPublishChecklistItem,
    CourseGenerationTimelineStep,
} from './types';

export const pipelineStatusLabels: Record<CourseGenerationPipelineStatus, string> = {
    idle: 'Ожидает запуска',
    queued: 'В очереди',
    reading_sources: 'Читает источники',
    blueprint_ready: 'План готов',
    building_lessons: 'Собирает черновики',
    media_planning: 'Планирует медиа',
    media_ready: 'Медиа готово',
    review_required: 'Нужна проверка',
    approved: 'Одобрено',
    publishing: 'Публикует',
    published: 'Опубликовано',
    failed: 'Ошибка',
};

export const approvalStatusLabels: Record<CourseGenerationApprovalStatus, string> = {
    not_required: 'Без апрува',
    pending: 'На проверке',
    changes_requested: 'Нужны правки',
    approved: 'Одобрено',
    rejected: 'Отклонено',
};

export const mediaStatusLabels: Record<CourseGenerationMediaStatus, string> = {
    planned: 'Запланировано',
    generating: 'Генерируется',
    ready: 'Готово',
    needs_review: 'На проверке',
    approved: 'Одобрено',
    failed: 'Ошибка',
    skipped: 'Пропущено',
};

const statusAliases: Record<string, CourseGenerationPipelineStatus> = {
    pending: 'queued',
    queued: 'queued',
    running: 'reading_sources',
    reading_sources: 'reading_sources',
    blueprint_ready: 'blueprint_ready',
    outline_ready: 'blueprint_ready',
    building_lessons: 'building_lessons',
    drafts_created: 'media_planning',
    media_planning: 'media_planning',
    media_ready: 'media_ready',
    ready_for_review: 'review_required',
    review_required: 'review_required',
    approved: 'approved',
    publishing: 'publishing',
    completed: 'published',
    published: 'published',
    failed: 'failed',
    error: 'failed',
};

const approvalAliases: Record<string, CourseGenerationApprovalStatus> = {
    none: 'not_required',
    not_required: 'not_required',
    pending: 'pending',
    changes_requested: 'changes_requested',
    approved: 'approved',
    rejected: 'rejected',
};

export const pipelinePhases: CourseGenerationPipelinePhase[] = [
    'sources',
    'blueprint',
    'lessons',
    'media',
    'review',
    'publish',
];

const phaseContent: Record<CourseGenerationPipelinePhase, { title: string; description: string }> = {
    sources: {
        title: 'Источники',
        description: 'NotebookLM и материалы курса',
    },
    blueprint: {
        title: 'Blueprint',
        description: 'Модули, уроки и логика курса',
    },
    lessons: {
        title: 'Черновики',
        description: 'Неопубликованные уроки в структуре курса',
    },
    media: {
        title: 'Медиа',
        description: 'Обложки, скриншоты и иллюстрации',
    },
    review: {
        title: 'Проверка',
        description: 'Апрув админа перед публикацией',
    },
    publish: {
        title: 'Публикация',
        description: 'Финальный чеклист и выпуск курса',
    },
};

const activePhaseByStatus: Record<CourseGenerationPipelineStatus, CourseGenerationPipelinePhase | null> = {
    idle: 'sources',
    queued: 'sources',
    reading_sources: 'sources',
    blueprint_ready: 'blueprint',
    building_lessons: 'lessons',
    media_planning: 'media',
    media_ready: 'review',
    review_required: 'review',
    approved: 'publish',
    publishing: 'publish',
    published: null,
    failed: null,
};

const completedPhaseIndexByStatus: Record<CourseGenerationPipelineStatus, number> = {
    idle: -1,
    queued: -1,
    reading_sources: -1,
    blueprint_ready: 0,
    building_lessons: 1,
    media_planning: 2,
    media_ready: 3,
    review_required: 3,
    approved: 4,
    publishing: 4,
    published: pipelinePhases.length - 1,
    failed: -1,
};

export const normalizeCourseGenerationPipelineStatus = (
    status: unknown,
    fallback: CourseGenerationPipelineStatus = 'queued'
): CourseGenerationPipelineStatus => {
    if (typeof status !== 'string') return fallback;
    return statusAliases[status.toLowerCase()] || fallback;
};

export const normalizeCourseGenerationApprovalStatus = (
    status: unknown,
    fallback: CourseGenerationApprovalStatus = 'not_required'
): CourseGenerationApprovalStatus => {
    if (typeof status !== 'string') return fallback;
    return approvalAliases[status.toLowerCase()] || fallback;
};

export const isActivePipelineStatus = (status: CourseGenerationPipelineStatus) => (
    !['idle', 'review_required', 'approved', 'published', 'failed'].includes(status)
);

export const getPipelineStatusLabel = (status: CourseGenerationPipelineStatus) => (
    pipelineStatusLabels[status]
);

export const getApprovalStatusLabel = (status: CourseGenerationApprovalStatus) => (
    approvalStatusLabels[status]
);

export const getMediaStatusLabel = (status: CourseGenerationMediaStatus) => (
    mediaStatusLabels[status]
);

export const createPipelineTimelineSteps = (
    status: CourseGenerationPipelineStatus,
    failedPhase?: CourseGenerationPipelinePhase
): CourseGenerationTimelineStep[] => {
    const activePhase = activePhaseByStatus[status];
    const completedIndex = completedPhaseIndexByStatus[status];

    return pipelinePhases.map((phase, index) => {
        const base = phaseContent[phase];
        const stepStatus = status === 'failed' && failedPhase === phase
            ? 'failed'
            : index <= completedIndex
                ? 'completed'
                : activePhase === phase
                    ? 'active'
                    : status === 'failed'
                        ? 'blocked'
                        : 'pending';

        return {
            id: phase,
            title: base.title,
            description: base.description,
            status: stepStatus,
        };
    });
};

export const getPublishChecklistSummary = (items: CourseGenerationPublishChecklistItem[]) => {
    const requiredItems = items.filter((item) => item.required);
    const blockedItems = requiredItems.filter((item) => !item.checked);

    return {
        requiredCount: requiredItems.length,
        completedRequiredCount: requiredItems.length - blockedItems.length,
        blockedItems,
        canPublish: blockedItems.length === 0,
    };
};

export const createDefaultPublishChecklist = (): CourseGenerationPublishChecklistItem[] => [
    {
        id: 'blueprint_approved',
        label: 'Blueprint утвержден',
        checked: false,
        required: true,
    },
    {
        id: 'draft_lessons_reviewed',
        label: 'Черновики уроков проверены',
        checked: false,
        required: true,
    },
    {
        id: 'media_reviewed',
        label: 'Медиа проверено',
        checked: false,
        required: true,
    },
    {
        id: 'student_notifications_ready',
        label: 'Уведомления готовы',
        checked: false,
        required: false,
    },
];
