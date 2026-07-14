export interface TenantInviteResult {
    id: string;
    name: string;
    setup_command: string;
    setup_token_expires_at: string;
}

export type OwnerInviteStatusValue = 'not_issued' | 'active' | 'expired' | 'claimed' | 'revoked';

export interface OwnerInviteStatus {
    tenant_id: string;
    status: OwnerInviteStatusValue;
    expires_at: string | null;
    created_at: string | null;
    revoked_at: string | null;
}

export interface OwnerInviteIssueResult extends OwnerInviteStatus {
    setup_command: string;
}
