import type { CourseGenerationSource } from '../course-sources/courseSourcesTypes';

export type CourseGenerationPipelineStatus =
    | 'idle'
    | 'queued'
    | 'reading_sources'
    | 'blueprint_ready'
    | 'building_lessons'
    | 'media_planning'
    | 'media_ready'
    | 'review_required'
    | 'approved'
    | 'publishing'
    | 'published'
    | 'failed';

export type CourseGenerationApprovalStatus =
    | 'not_required'
    | 'pending'
    | 'changes_requested'
    | 'approved'
    | 'rejected';

export type CourseGenerationPipelinePhase =
    | 'sources'
    | 'blueprint'
    | 'lessons'
    | 'media'
    | 'review'
    | 'publish';

export type CourseGenerationTimelineStepStatus =
    | 'pending'
    | 'active'
    | 'completed'
    | 'failed'
    | 'blocked';

export interface CourseGenerationTimelineStep {
    id: CourseGenerationPipelinePhase;
    title: string;
    description: string;
    status: CourseGenerationTimelineStepStatus;
}

export interface CourseGenerationLessonBlueprint {
    id?: string;
    title: string;
    summary?: string;
    learning_goal?: string;
    duration_minutes?: number;
    source_refs?: string[];
}

export interface CourseGenerationModuleBlueprint {
    id?: string;
    title: string;
    summary?: string;
    lessons: CourseGenerationLessonBlueprint[];
}

export interface CourseGenerationBlueprint {
    title: string;
    summary?: string;
    audience_level?: string;
    modules: CourseGenerationModuleBlueprint[];
    warnings?: string[];
}

export type CourseGenerationMediaKind =
    | 'course_cover'
    | 'module_cover'
    | 'lesson_image'
    | 'screenshot'
    | 'diagram'
    | 'video';

export type CourseGenerationMediaTargetType = 'course' | 'module' | 'lesson';

export type CourseGenerationMediaStatus =
    | 'planned'
    | 'generating'
    | 'ready'
    | 'needs_review'
    | 'approved'
    | 'failed'
    | 'skipped';

export interface CourseGenerationMediaPlanItem {
    id: string;
    kind: CourseGenerationMediaKind;
    target_type: CourseGenerationMediaTargetType;
    target_id?: string;
    target_title: string;
    prompt?: string;
    status: CourseGenerationMediaStatus;
    asset_url?: string;
    notes?: string;
    error?: string;
}

export interface CourseGenerationMediaPlan {
    items: CourseGenerationMediaPlanItem[];
    notes?: string;
}

export interface CourseGenerationPublishChecklistItem {
    id: string;
    label: string;
    description?: string;
    checked: boolean;
    required: boolean;
    blocking_reason?: string;
}

export interface CourseGenerationPipelineRun {
    id: string;
    course_id: string;
    status: CourseGenerationPipelineStatus;
    approval_status: CourseGenerationApprovalStatus;
    title?: string | null;
    sources: CourseGenerationSource[];
    blueprint?: CourseGenerationBlueprint | null;
    media_plan?: CourseGenerationMediaPlan | null;
    checklist: CourseGenerationPublishChecklistItem[];
    timeline?: CourseGenerationTimelineStep[];
    progress?: number | null;
    message?: string | null;
    error?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    completed_at?: string | null;
}

export interface StartCourseGenerationPipelineInput {
    notebook_url?: string;
    sources: CourseGenerationSource[];
    module_count: number;
    lessons_per_module: number;
    audience_level?: string;
    style?: string;
}

export interface RequestBlueprintChangesInput {
    comment: string;
}

export interface UpdateMediaPlanInput {
    items: CourseGenerationMediaPlanItem[];
}

export interface PublishCourseGenerationPipelineInput {
    checklist: CourseGenerationPublishChecklistItem[];
    notify_students?: boolean;
}
