import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import WebApp from '@twa-dev/sdk';

interface AuthContextType {
    user: any | null;
    membership: any | null;
    isLoading: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    viewMode: 'student' | 'admin';
    setViewMode: (mode: 'student' | 'admin') => void;
    login: (manualToken?: string) => Promise<void>;
    logout: () => void;
    refreshProfile: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [membership, setMembership] = useState<any | null>(null);
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

    const refreshProfile = async () => {
        console.log("WebApp: fetching profile...");
        try {
            const res = await api.get('/webapp/me');
            console.log("DEBUG_AUTH_DATA:", res.data);
            setUser(res.data.user);
            setMembership(res.data.membership);
            console.log("WebApp: profile loaded", res.data.user.username);
            return true;
        } catch (err: any) {
            console.error('Failed to refresh profile', err);
            if (err.response?.status === 401) {
                console.log("WebApp: Session expired, clearing token.");
                localStorage.removeItem('token');
            }
            return false;
        }
    };

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        console.log("WebApp: checking token...", token ? "Found" : "Not found");

        if (token) {
            const success = await refreshProfile();
            if (success) {
                setIsLoading(false);
                return;
            }
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
                await refreshProfile();
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
            alert('Ошибка входа: ' + detail);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setMembership(null);
    };

    const isAdmin = !!user && (
        user.is_super_admin ||
        user.admin_status === 'approved' ||
        (!!membership?.role && (membership.role === 'admin' || membership.role === 'owner'))
    );
    const isSuperAdmin = !!user && user.is_super_admin;

    useEffect(() => {
        if (isAdmin) {
            setViewMode('admin');
        } else {
            setViewMode('student');
        }
    }, [isAdmin]);

    return (
        <AuthContext.Provider value={{ user, membership, isLoading, isAdmin, isSuperAdmin, viewMode, setViewMode, login, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
