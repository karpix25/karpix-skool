export type OwnerSubscriptionStatus = 'draft' | 'trialing' | 'active' | 'past_due' | 'suspended' | 'canceled';

export interface OwnerSubscription {
    tenant_id: string;
    status: OwnerSubscriptionStatus;
    plan: {
        code: string;
        name: string;
        max_courses: number;
        max_students: number;
        max_ai_jobs_per_month: number;
        max_storage_bytes: number;
    };
    current_period_end: string | null;
    trial_ends_at: string | null;
    is_write_allowed: boolean;
    blocking_reason: string | null;
    usage: {
        courses_used: number;
        students_used: number;
        ai_jobs_used: number;
        storage_bytes_used: number;
    };
}

export const OWNER_SUBSCRIPTION_LABELS: Record<OwnerSubscriptionStatus, string> = {
    draft: 'Настройка',
    trialing: 'Пробный период',
    active: 'Активен',
    past_due: 'Требуется продление',
    suspended: 'Приостановлен',
    canceled: 'Закрыт',
};
