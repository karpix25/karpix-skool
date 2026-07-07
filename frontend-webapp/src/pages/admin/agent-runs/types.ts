export type AgentRunStatus =
    | 'running'
    | 'draft_created'
    | 'approved'
    | 'published'
    | 'rejected'
    | 'failed';

export type AgentApprovalStatus = 'pending' | 'approved' | 'rejected';

export type AgentArtifactType =
    | 'course'
    | 'module'
    | 'lesson'
    | 'media'
    | 'course_structure_generation_job';

export interface AgentStep {
    id: string;
    name: string;
    sequence: number;
    status: 'running' | 'completed' | 'failed';
    error?: string | null;
    output_json?: Record<string, unknown> | null;
}

export interface AgentArtifact {
    id: string;
    artifact_type: AgentArtifactType;
    resource_type: string;
    resource_id: string;
    title?: string | null;
    payload_json?: Record<string, unknown> | null;
    created_at: string;
}

export interface AgentApproval {
    id: string;
    status: AgentApprovalStatus;
    request_json?: Record<string, unknown> | null;
    response_json?: Record<string, unknown> | null;
    decided_at?: string | null;
}

export interface AgentRun {
    id: string;
    tenant_id: string;
    created_by_user_id: string;
    task_type: string;
    status: AgentRunStatus;
    approval_status: AgentApprovalStatus;
    input_json?: Record<string, unknown> | null;
    error?: string | null;
    created_at: string;
    updated_at: string;
    completed_at?: string | null;
    steps: AgentStep[];
    artifacts: AgentArtifact[];
    approvals: AgentApproval[];
}

export interface AgentPublishResult {
    run: AgentRun;
    course_id: string;
    published_lessons_count: number;
    notification_deliveries_count: number;
}

export type AgentRunAction = 'approve' | 'reject' | 'publish' | 'retry';

export interface AgentRunsFeedback {
    id: number;
    variant: 'success' | 'error' | 'info';
    title: string;
    description?: string;
}
