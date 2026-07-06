import type {
    TenantInfo,
    TenantMembership,
    ViewMode,
    WebAppUser,
} from '../types/auth';

export interface AuthContextType {
    user: WebAppUser | null;
    membership: TenantMembership | null;
    tenant: TenantInfo | null;
    isLoading: boolean;
    isAdmin: boolean;
    isPlatformAdmin: boolean;
    isAuthor: boolean;
    isTenantManager: boolean;
    isStudent: boolean;
    canAccessAdminMode: boolean;
    isSuperAdmin: boolean;
    viewMode: ViewMode;
    memberships: TenantMembership[];
    activeTenantId: string | null;
    authError: string | null;
    setActiveTenantId: (id: string | null) => void;
    setViewMode: (mode: ViewMode) => void;
    clearAuthError: () => void;
    login: (manualToken?: string) => Promise<void>;
    logout: () => void;
    refreshProfile: (setupCode?: string) => Promise<WebAppUser | null>;
    getLevelName: (level: number) => string;
}
