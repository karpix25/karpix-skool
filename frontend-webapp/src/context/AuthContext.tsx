import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import WebApp from '@twa-dev/sdk';

interface AuthContextType {
    user: any | null;
    membership: any | null;
    tenant: any | null;
    isLoading: boolean;
    isAdmin: boolean;
    isAuthor: boolean;
    isSuperAdmin: boolean;
    viewMode: 'student' | 'admin';
    memberships: any[];
    activeTenantId: string | null;
    setActiveTenantId: (id: string) => void;
    setViewMode: (mode: 'student' | 'admin') => void;

    login: (manualToken?: string) => Promise<void>;
    logout: () => void;
    refreshProfile: (setupCode?: string) => Promise<any>;

    getLevelName: (level: number) => string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [membership, setMembership] = useState<any | null>(null);
    const [tenant, setTenant] = useState<any | null>(null);
    const [memberships, setMemberships] = useState<any[]>([]);
    const [activeTenantId, setActiveTenantIdState] = useState<string | null>(localStorage.getItem('activeTenantId'));
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'student' | 'admin'>('student');


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
    }, []);

    const refreshProfile = async (setupCode?: string) => {
        console.log("WebApp: fetching profile...", setupCode ? `for school ${setupCode}` : "");
        try {
            const params = setupCode ? { setup_code: setupCode } : {};
            const res = await api.get('/webapp/me', { params });
            console.log("DEBUG_AUTH_DATA:", res.data);
            const userData = res.data.user;
            setUser(userData);
            setMembership(res.data.membership);
            setTenant(res.data.tenant); // Set tenant data
            setMemberships(res.data.memberships || []);

            // If we have an activeTenantId set but it's not in the new memberships list, clear it
            if (activeTenantId && res.data.memberships) {
                const stillExists = res.data.memberships.some((m: any) => m.tenant_id === activeTenantId);
                if (!stillExists) {
                    setActiveTenantId(res.data.tenant_id || res.data.membership?.tenant_id || null);
                }
            } else if (!activeTenantId && res.data.tenant?.id) {
                setActiveTenantId(res.data.tenant.id);
            }

            console.log("WebApp: profile loaded", userData.username);

            return userData;
        } catch (err: any) {
            console.error('Failed to refresh profile', err);
            if (err.response?.status === 401) {
                console.log("WebApp: Session expired, clearing token.");
                localStorage.removeItem('token');
            }
            return null;
        }
    };

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

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        const startParam = (WebApp as any).initDataUnsafe?.start_param;
        const tgId = (WebApp as any).initDataUnsafe?.user?.id;

        console.log("WebApp: checkAuth triggered. Token:", !!token, "StartParam:", startParam, "TG_ID from SDK:", tgId);

        if (token) {
            console.log("WebApp: token found, attempting refresh...");
            const curTenantId = localStorage.getItem('activeTenantId');
            const fetchedUser = await refreshProfile(startParam || curTenantId || undefined);


            // SECURITY CHECK: If we have a user now, but their TG ID doesn't match the SDK's TG ID, 
            // it means the session is stale (from a different TG account on the same device).
            if (fetchedUser && tgId && fetchedUser.telegram_id && fetchedUser.telegram_id !== tgId) {
                console.warn("WebApp: Profile mismatch detected! Stored user:", fetchedUser.telegram_id, "Actual TG:", tgId);
                console.log("WebApp: Forcing logout and re-login.");
                logout();
                await login();
                return;
            }

            if (fetchedUser) {
                console.log("WebApp: refresh success, staying logged in.");
                setIsLoading(false);
                return;
            }
            console.log("WebApp: refresh failed, proceeding to login.");
        }

        // If no token OR refresh failed, try login
        await login();
    };

    const login = async (manualToken?: string) => {
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
                const res = await api.post('/webapp/login', {
                    init_data: WebApp.initData
                });

                const { access_token } = res.data;
                localStorage.setItem('token', access_token);
                console.log("WebApp: login successful");

                const startParam = (WebApp as any).initDataUnsafe?.start_param;
                await refreshProfile(startParam);
            } else {
                console.warn("Not in Telegram environment or initData is empty");
                // In production, this means it's opened incorrectly.
                // In DEV, we try mock.
                if (import.meta.env.DEV) {
                    console.log("Dev mode: attempting mock login...");
                    try {
                        const res = await api.post('/webapp/login', { init_data: "mock_student" });
                        localStorage.setItem('token', res.data.access_token);
                        await refreshProfile();
                    } catch (e) {
                        console.error("Mock login failed", e);
                    }
                }
            }
        } catch (err: any) {
            console.error('Login failed', err);
            const detail = err.response?.data?.detail || err.message;
            const targetUrl = api.defaults.baseURL + '/webapp/login';
            alert(`Ошибка входа (${targetUrl}): ` + detail);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setMembership(null);
        setTenant(null);
        setMemberships([]);
        localStorage.removeItem('activeTenantId');
        setActiveTenantIdState(null);
    };

    const setActiveTenantId = (id: string | null) => {
        if (id) {
            localStorage.setItem('activeTenantId', id);
        } else {
            localStorage.removeItem('activeTenantId');
        }
        setActiveTenantIdState(id);
    };


    const isAuthor = !!user && (user.is_super_admin || user.admin_status === 'approved');
    // Admin access: approved author, super admin, OR Telegram group admin/owner
    const isTenantAdmin = !!membership && (membership.role === 'admin' || membership.role === 'owner');
    const isAdmin = isAuthor || isTenantAdmin;
    const isSuperAdmin = !!user && user.is_super_admin;

    // Default view mode: don't force admin view if they are entering a school as a student.
    useEffect(() => {
        if (isLoading) return;

        const savedMode = localStorage.getItem('viewMode') as 'student' | 'admin';
        if (savedMode) {
            setViewMode(savedMode);
        } else if (membership) {
            // If they are a member of a school, show them the student view first
            setViewMode('student');
        } else if (isAdmin) {
            // Otherwise if they are an author/admin, show them their dashboard
            setViewMode('admin');
        }
    }, [isLoading, isAdmin, membership]);

    const handleSetViewMode = (mode: 'student' | 'admin') => {
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
            setActiveTenantId,
            setViewMode: handleSetViewMode,
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
