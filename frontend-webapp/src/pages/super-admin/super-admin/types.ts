export const Tab = {
    TERMINAL: 'terminal',
    LEADS: 'leads',
    GLOBAL: 'global',
    AUTHORS: 'authors',
    MY_SCHOOL: 'my_school'
} as const;

export type TabType = typeof Tab[keyof typeof Tab];
export type UserFilter = 'pending' | 'school_admins' | 'admins' | 'all';

export interface Tenant {
    id: string;
    name: string;
    owner_email: string | null;
    owner_username: string | null;
    owner_telegram_id: number | null;
    subscription_status: 'active' | 'past_due';
    expires_at: string | null;
    member_count: number;
    course_count: number;
    setup_code?: string;
    setup_code_masked?: boolean;
    telegram_group_id?: number | null;
    welcome_video_enabled?: boolean;
    welcome_video_url?: string | null;
    welcome_video_title?: string | null;
    welcome_video_description?: string | null;
}

export interface AppUser {
    id: string;
    telegram_id: number;
    username: string | null;
    admin_status: 'none' | 'pending' | 'approved' | 'rejected';
    is_blocked: boolean;
    admin_request_details: AdminRequestDetails | string | null;
    memberships: Array<{
        tenant_id: string;
        tenant_name: string;
        role: string;
    }>;
}

export interface AdminRequestDetails {
    school_name?: string | null;
    details?: string | null;
    requested_at?: string | null;
}

export interface SuperAdminLead {
    id: string;
    kind: 'platform_lead' | 'author_request';
    name: string | null;
    telegram: string | null;
    schoolName: string | null;
    description: string | null;
    status: string;
    adminNote?: string | null;
    createdAt: string | null;
    handledAt?: string | null;
    source: string | null;
    userId?: string | null;
    leadId?: string | null;
}

export interface SuperActivityItem {
    id: string;
    occurredAt: string | null;
    type: 'school' | 'lead' | 'author' | 'student' | 'learning' | 'generation' | 'system';
    eventType: string;
    tone: 'success' | 'info' | 'warning' | 'danger';
    title: string;
    message: string;
    tenantName?: string | null;
    actorName?: string | null;
    meta?: Record<string, unknown> | null;
}

export type NotebookGenerationProvider = 'open_notebook' | 'google_notebooklm';
export type NotebookLmAuthStatus =
    | 'package_missing'
    | 'ok'
    | 'missing_auth'
    | 'expired'
    | 'network_error'
    | 'storage_error'
    | 'error';

export interface NotebookLmAuthState {
    package_installed: boolean;
    authenticated: boolean;
    profile: string;
    status: NotebookLmAuthStatus;
    message: string;
    home?: string | null;
    browser_url?: string | null;
    detail?: Record<string, unknown> | null;
    raw?: Record<string, unknown> | null;
}

export interface GenerationSettings {
    notebook_provider: NotebookGenerationProvider;
    effective_notebook_provider: NotebookGenerationProvider;
    google_notebooklm_configured: boolean;
    google_notebooklm_profile: string | null;
    google_notebooklm_auth?: NotebookLmAuthState | null;
    updated_at: string;
}
