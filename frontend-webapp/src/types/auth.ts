export type ViewMode = 'student' | 'admin';

export type AdminStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type MembershipRole = 'student' | 'admin' | 'owner';

export interface WebAppUser {
    id: string;
    telegram_id?: number | string | null;
    username?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    admin_status?: AdminStatus | string | null;
    is_super_admin?: boolean;
    is_onboarded?: boolean;
}

export interface TenantMembership {
    tenant_id: string;
    tenant_name?: string;
    role?: MembershipRole | string | null;
    xp: number;
    level: number;
    rank?: number;
    is_onboarded?: boolean;
}

export interface TenantInfo {
    id: string;
    name?: string | null;
    setup_code?: string | null;
    vip_group_link?: string | null;
    telegram_group_id?: string | number | null;
    telegram_group_id_vip?: string | number | null;
    level_names?: Record<string, string>;
}

export interface WebAppProfileResponse {
    user: WebAppUser;
    membership: TenantMembership | null;
    tenant: TenantInfo | null;
    memberships?: TenantMembership[];
    tenant_id?: string | null;
}

export interface WebAppLoginResponse {
    access_token: string;
}
