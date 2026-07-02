/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import api from '../api/client';
import WebApp from '@twa-dev/sdk';
import { getApiErrorMessage } from '../services/apiError';
import type { TelegramInitDataUnsafe } from '../types/telegram';
import type {
    TenantInfo,
    TenantMembership,
    ViewMode,
    WebAppLoginResponse,
    WebAppProfileResponse,
    WebAppUser,
} from '../types/auth';

interface AuthContextType {
    user: WebAppUser | null;
    membership: TenantMembership | null;
    tenant: TenantInfo | null;
    isLoading: boolean;
    isAdmin: boolean;
    isAuthor: boolean;
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

const AuthContext = createContext<AuthContextType | null>(null);

const authDebug = (...args: unknown[]) => {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
};

const getTelegramInitDataUnsafe = (): TelegramInitDataUnsafe => {
    return (WebApp as { initDataUnsafe?: TelegramInitDataUnsafe }).initDataUnsafe || {};
};

const isUuidLike = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<WebAppUser | null>(null);
    const [membership, setMembership] = useState<TenantMembership | null>(null);
    const [tenant, setTenant] = useState<TenantInfo | null>(null);
    const [memberships, setMemberships] = useState<TenantMembership[]>([]);
    const [activeTenantId, setActiveTenantIdState] = useState<string | null>(localStorage.getItem('activeTenantId'));
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('student');
    const [authError, setAuthError] = useState<string | null>(null);


    const setActiveTenantId = useCallback((id: string | null) => {
        if (id) {
            localStorage.setItem('activeTenantId', id);
        } else {
            localStorage.removeItem('activeTenantId');
        }
        setActiveTenantIdState(id);
    }, []);

    const refreshProfile = useCallback(async (schoolRef?: string) => {
        console.log("WebApp: fetching profile...", schoolRef ? `for school ${schoolRef}` : "");
        try {
            const params = schoolRef
                ? isUuidLike(schoolRef)
                    ? { tenant_id: schoolRef }
                    : { setup_code: schoolRef }
                : {};
            const res = await api.get<WebAppProfileResponse>('/webapp/me', { params });
            console.log("DEBUG_AUTH_DATA:", res.data);
            const userData = res.data.user;
            setUser(userData);
            setMembership(res.data.membership);
            setTenant(res.data.tenant); // Set tenant data
            setMemberships(res.data.memberships || []);

            // If we have an activeTenantId set but it's not in the new memberships list, clear it
            const currentTenantId = localStorage.getItem('activeTenantId');
            if (currentTenantId && res.data.memberships) {
                const stillExists = res.data.memberships.some((m) => m.tenant_id === currentTenantId);
                if (!stillExists) {
                    setActiveTenantId(res.data.tenant_id || res.data.membership?.tenant_id || null);
                }
            } else if (!currentTenantId && res.data.tenant?.id) {
                setActiveTenantId(res.data.tenant.id);
            }

            console.log("WebApp: profile loaded", userData.username);

            return userData;
        } catch (err: unknown) {
            console.error('Failed to refresh profile', err);
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                console.log("WebApp: Session expired, clearing token.");
                localStorage.removeItem('token');
            }
            return null;
        }
    }, [setActiveTenantId]);

    const getLevelName = (level: number) => {
        // 1. Check custom names
        if (tenant?.level_names && tenant.level_names[String(level)]) {
            return tenant.level_names[String(level)];
        }
        // 2. Default fallback
        if (level <= 2) return "Новичок";
        if (level <= 4) return "Ученик";
        if (level <= 6) return "Подмастерье";
        if (level <= 8) return "Эксперт";
        return "Грандмастер";
    };

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setUser(null);
        setMembership(null);
        setTenant(null);
        setMemberships([]);
        localStorage.removeItem('activeTenantId');
        setActiveTenantIdState(null);
    }, []);

    const login = useCallback(async (manualToken?: string) => {
        console.log("WebApp: starting login...");
        setIsLoading(true);
        try {
            if (manualToken) {
                localStorage.setItem('token', manualToken);
                await refreshProfile();
                return;
            }

            // Debug: Check if WebApp is actually available
            console.log("WebApp.initData length:", WebApp.initData?.length || 0);

            if (WebApp.initData) {
                console.log("WebApp: Mini App environment detected");
                const res = await api.post<WebAppLoginResponse>('/webapp/login', {
                    init_data: WebApp.initData
                });

                const { access_token } = res.data;
                localStorage.setItem('token', access_token);
                console.log("WebApp: login successful");

                const startParam = getTelegramInitDataUnsafe().start_param;
                await refreshProfile(startParam);
            } else {
                console.warn("Not in Telegram environment or initData is empty");
                // In production, this means it's opened incorrectly.
                // In DEV, we try mock.
                if (import.meta.env.DEV) {
                    authDebug("Dev mode: attempting mock login...");
                    try {
                        const res = await api.post<WebAppLoginResponse>('/webapp/login', { init_data: "mock_student" });
                        localStorage.setItem('token', res.data.access_token);
                        await refreshProfile();
                    } catch (e) {
                        console.error("Mock login failed", e);
                        setAuthError(getApiErrorMessage(e, 'Не удалось выполнить dev-вход'));
                    }
                }
            }
        } catch (err: unknown) {
            console.error('Login failed', err);
            const targetUrl = api.defaults.baseURL + '/webapp/login';
            setAuthError(`Ошибка входа (${targetUrl}): ${getApiErrorMessage(err)}`);
        } finally {
            setIsLoading(false);
        }
    }, [refreshProfile]);

    const checkAuth = useCallback(async () => {
        const token = localStorage.getItem('token');
        const telegramInitData = getTelegramInitDataUnsafe();
        const startParam = telegramInitData.start_param;
        const tgId = telegramInitData.user?.id;

        authDebug("WebApp: checkAuth triggered. Token:", !!token, "StartParam:", startParam, "TG_ID from SDK:", tgId);

        if (token) {
            authDebug("WebApp: token found, attempting refresh...");
            const curTenantId = localStorage.getItem('activeTenantId');
            const fetchedUser = await refreshProfile(startParam || curTenantId || undefined);


            // SECURITY CHECK: If we have a user now, but their TG ID doesn't match the SDK's TG ID,
            // it means the session is stale (from a different TG account on the same device).
            if (fetchedUser && tgId && fetchedUser.telegram_id && fetchedUser.telegram_id !== tgId) {
                console.warn("WebApp: Profile mismatch detected! Stored user:", fetchedUser.telegram_id, "Actual TG:", tgId);
                authDebug("WebApp: Forcing logout and re-login.");
                logout();
                await login();
                return;
            }

            if (fetchedUser) {
                authDebug("WebApp: refresh success, staying logged in.");
                setIsLoading(false);
                return;
            }
            authDebug("WebApp: refresh failed, proceeding to login.");
        }

        // If no token OR refresh failed, try login
        await login();
    }, [login, logout, refreshProfile]);

    useEffect(() => {
        console.log("WebApp: initializing...");
        try {
            WebApp.ready();
            WebApp.expand();
            console.log("WebApp: ready and expanded");
        } catch (e) {
            console.error("WebApp SDK error", e);
        }
        checkAuth();
    }, [checkAuth]);


    const isAuthor = !!user && (!!user.is_super_admin || user.admin_status === 'approved');
    // Admin access: approved author, super admin, OR Telegram group admin/owner
    const isTenantAdmin = !!membership?.role && ['admin', 'owner', 'moderator'].includes(membership.role);
    const isAdmin = isAuthor || isTenantAdmin;
    const isSuperAdmin = !!user?.is_super_admin;

    // Default view mode
    useEffect(() => {
        if (isLoading) return;

        const savedMode = localStorage.getItem('viewMode') as ViewMode | null;
        if (savedMode) {
            setViewMode(savedMode);
        } else if (isAdmin) {
            // If they are an author/admin, show them their dashboard by default
            setViewMode('admin');
        } else if (membership) {
            // If they are just a member of a school, show them the student view
            setViewMode('student');
        }
    }, [isLoading, isAdmin, membership]);

    const handleSetViewMode = (mode: ViewMode) => {
        localStorage.setItem('viewMode', mode);
        setViewMode(mode);
    };

    return (
        <AuthContext.Provider value={{
            user,
            membership,
            tenant,
            isLoading,
            isAdmin,
            isAuthor,
            isSuperAdmin,
            viewMode,
            memberships,
            activeTenantId,
            authError,
            setActiveTenantId,
            setViewMode: handleSetViewMode,
            clearAuthError: () => setAuthError(null),
            login,
            logout,
            refreshProfile,
            getLevelName

        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
