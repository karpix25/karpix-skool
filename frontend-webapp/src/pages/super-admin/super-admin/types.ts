export const Tab = {
    TERMINAL: 'terminal',
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
}

export interface AppUser {
    id: string;
    telegram_id: number;
    username: string | null;
    admin_status: 'none' | 'pending' | 'approved' | 'rejected';
    is_blocked: boolean;
    admin_request_details: string | null;
    memberships: Array<{
        tenant_id: string;
        tenant_name: string;
        role: string;
    }>;
}

export interface FeedItem {
    id: string;
    time: string;
    type: 'SUCCESS' | 'MILESTONE' | 'SYSTEM' | 'ALERT';
    message: string;
    meta?: string;
    message_end?: string;
}
