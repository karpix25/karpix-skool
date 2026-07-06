/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import api from '../api/client';
import WebApp from '@twa-dev/sdk';
import { hasTenantManagementRole } from './authRoles';
import { canUseViewMode, normalizeViewMode } from './viewModes';
import { getApiErrorMessage } from '../services/apiError';
import { clearLegacyStoredAuthToken } from '../services/legacyAuthCleanup';
import { getSchoolRefFromStartParam } from '../services/deepLinks';
import { getTelegramStartParam } from '../services/telegramStartParam';
import { devError, devLog, devWarn } from '../env/devConsole';
import type { AuthContextType } from './authContextValue';
import type { TelegramInitDataUnsafe } from '../types/telegram';
import type {
    TenantInfo,
    TenantMembership,
    ViewMode,
    WebAppLoginResponse,
    WebAppProfileResponse,
    WebAppUser,
} from '../types/auth';

const AuthContext = createContext<AuthContextType | null>(null);

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
        devLog("WebApp: fetching profile...", schoolRef ? `for school ${schoolRef}` : "");
        try {
            const params = schoolRef
                ? isUuidLike(schoolRef)
                    ? { tenant_id: schoolRef }
                    : { setup_code: schoolRef }
                : {};
            const res = await api.get<WebAppProfileResponse>('/webapp/me', { params });
            devLog("DEBUG_AUTH_DATA:", res.data);
            const userData = res.data.user;
            const nextMembership = res.data.membership;
            const nextTenant = res.data.tenant;
            const requestedTenant = res.data.requested_tenant || null;
            const visibleTenant = nextTenant || (!nextMembership ? requestedTenant : null);
            const nextMemberships = res.data.memberships || [];
            const isProfilePlatformAdmin = !!userData.is_super_admin;
            const requestedTenantExplicitly = !!schoolRef;
            const profileTenantId = res.data.tenant_id || nextTenant?.id || nextMembership?.tenant_id || null;

            setUser(userData);
            setMembership(nextMembership);
            setTenant(visibleTenant);
            setMemberships(nextMemberships);

            const currentTenantId = localStorage.getItem('activeTenantId');
            if (currentTenantId) {
                const stillExists = nextMemberships.some((m) => m.tenant_id === currentTenantId);
                if (!stillExists) {
                    setActiveTenantId(isProfilePlatformAdmin ? currentTenantId : profileTenantId);
                }
            } else if (profileTenantId && (!isProfilePlatformAdmin || requestedTenantExplicitly)) {
                setActiveTenantId(profileTenantId);
            } else if (isProfilePlatformAdmin) {
                setActiveTenantId(null);
            }

            devLog("WebApp: profile loaded", userData.username);

            return userData;
        } catch (err: unknown) {
            devError('Failed to refresh profile', err);
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                devLog("WebApp: session expired.");
                clearLegacyStoredAuthToken();
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

    const clearLocalAuth = useCallback(() => {
        clearLegacyStoredAuthToken();
        setUser(null);
        setMembership(null);
        setTenant(null);
        setMemberships([]);
        localStorage.removeItem('activeTenantId');
        setActiveTenantIdState(null);
    }, []);

    const clearServerSession = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } catch (err) {
            devLog("WebApp: logout cookie clear failed", err);
        }
    }, []);

    const logout = useCallback(() => {
        clearLocalAuth();
        void clearServerSession();
    }, [clearLocalAuth, clearServerSession]);

    const login = useCallback(async (manualToken?: string) => {
        devLog("WebApp: starting login...");
        setIsLoading(true);
        try {
            if (manualToken) {
                await refreshProfile();
                return;
            }

            // Debug: Check if WebApp is actually available
            devLog("WebApp.initData length:", WebApp.initData?.length || 0);

            if (WebApp.initData) {
                devLog("WebApp: Mini App environment detected");
                await api.post<WebAppLoginResponse>('/webapp/login', {
                    init_data: WebApp.initData
                });

                devLog("WebApp: login successful");

                const startParam = getTelegramStartParam(WebApp);
                await refreshProfile(getSchoolRefFromStartParam(startParam));
            } else {
                devWarn("Not in Telegram environment or initData is empty");
                // In production, this means it's opened incorrectly.
                // In DEV, we try mock.
                if (import.meta.env.DEV) {
                    devLog("Dev mode: attempting mock login...");
                    try {
                        await api.post<WebAppLoginResponse>('/webapp/login', { init_data: "mock_student" });
                        await refreshProfile();
                    } catch (e) {
                        devError("Mock login failed", e);
                        setAuthError(getApiErrorMessage(e, 'Не удалось выполнить dev-вход'));
                    }
                }
            }
        } catch (err: unknown) {
            devError('Login failed', err);
            const targetUrl = api.defaults.baseURL + '/webapp/login';
            setAuthError(`Ошибка входа (${targetUrl}): ${getApiErrorMessage(err)}`);
        } finally {
            setIsLoading(false);
        }
    }, [refreshProfile]);

    const checkAuth = useCallback(async () => {
        clearLegacyStoredAuthToken();
        const telegramInitData = getTelegramInitDataUnsafe();
        const startParam = getTelegramStartParam(WebApp);
        const tgId = telegramInitData.user?.id;
        const curTenantId = localStorage.getItem('activeTenantId');

        devLog("WebApp: checkAuth triggered. StartParam:", startParam, "TG_ID from SDK:", tgId);

        devLog("WebApp: attempting session refresh via cookie...");
        const fetchedUser = await refreshProfile(getSchoolRefFromStartParam(startParam) || curTenantId || undefined);

        // SECURITY CHECK: If we have a user now, but their TG ID doesn't match the SDK's TG ID,
        // it means the session is stale (from a different TG account on the same device).
        if (fetchedUser && tgId && fetchedUser.telegram_id && fetchedUser.telegram_id !== tgId) {
            devWarn("WebApp: Profile mismatch detected! Stored user:", fetchedUser.telegram_id, "Actual TG:", tgId);
            devLog("WebApp: Forcing logout and re-login.");
            clearLocalAuth();
            await clearServerSession();
            await login();
            return;
        }

        if (fetchedUser) {
            devLog("WebApp: refresh success, staying logged in.");
            setIsLoading(false);
            return;
        }
        devLog("WebApp: refresh failed, proceeding to login.");

        await login();
    }, [clearLocalAuth, clearServerSession, login, refreshProfile]);

    useEffect(() => {
        devLog("WebApp: initializing...");
        try {
            WebApp.ready();
            WebApp.expand();
            devLog("WebApp: ready and expanded");
        } catch (e) {
            devError("WebApp SDK error", e);
        }
        checkAuth();
    }, [checkAuth]);


    const isPlatformAdmin = !!user?.is_super_admin;
    const isAuthor = !!user && user.admin_status === 'approved';
    const isTenantManager = hasTenantManagementRole(membership);
    const isStudent = !!membership && !isPlatformAdmin && !isAuthor && !isTenantManager;
    const canAccessAdminMode = isPlatformAdmin || isAuthor || isTenantManager;
    const isAdmin = canAccessAdminMode;
    const isSuperAdmin = isPlatformAdmin;

    // Default view mode
    useEffect(() => {
        if (isLoading) return;

        const nextMode = normalizeViewMode(localStorage.getItem('viewMode'), {
            canAccessAdminMode,
            isSuperAdmin,
            hasMembership: !!membership,
        });
        localStorage.setItem('viewMode', nextMode);
        setViewMode(nextMode);
    }, [isLoading, canAccessAdminMode, isSuperAdmin, membership]);

    const handleSetViewMode = (mode: ViewMode) => {
        const nextMode = canUseViewMode(mode, { canAccessAdminMode, isSuperAdmin })
            ? mode
            : 'student';
        localStorage.setItem('viewMode', nextMode);
        setViewMode(nextMode);
    };

    return (
        <AuthContext.Provider value={{
            user,
            membership,
            tenant,
            isLoading,
            isAdmin,
            isPlatformAdmin,
            isAuthor,
            isTenantManager,
            isStudent,
            canAccessAdminMode,
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
