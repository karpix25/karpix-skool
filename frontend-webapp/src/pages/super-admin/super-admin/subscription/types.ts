export type SubscriptionStatus = 'draft' | 'trialing' | 'active' | 'past_due' | 'suspended' | 'canceled';

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
    draft: 'Черновик',
    trialing: 'Пробный период',
    active: 'Активна',
    past_due: 'Просрочена',
    suspended: 'Приостановлена',
    canceled: 'Отменена',
};

export const ALLOWED_SUBSCRIPTION_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
    draft: ['trialing', 'active', 'canceled'],
    trialing: ['active', 'past_due', 'suspended', 'canceled'],
    active: ['past_due', 'suspended', 'canceled'],
    past_due: ['active', 'suspended', 'canceled'],
    suspended: ['active', 'past_due', 'canceled'],
    canceled: ['draft'],
};

export interface TenantPlan {
    id: string;
    code: string;
    name: string;
    max_courses: number;
    max_students: number;
    max_ai_jobs_per_month: number;
    max_storage_bytes: number;
    trial_days: number;
}

export interface TenantSubscription {
    tenant_id: string;
    status: SubscriptionStatus;
    plan: TenantPlan;
    current_period_start: string;
    current_period_end: string | null;
    trial_ends_at: string | null;
    is_write_allowed: boolean;
    is_ai_allowed: boolean;
    blocking_reason: string | null;
    usage: {
        courses_used: number;
        students_used: number;
        ai_jobs_used: number;
        storage_bytes_used: number;
    };
}

export interface SubscriptionUpdateInput {
    plan_code?: string;
    status?: SubscriptionStatus;
    current_period_end?: string;
    reason: string;
}
