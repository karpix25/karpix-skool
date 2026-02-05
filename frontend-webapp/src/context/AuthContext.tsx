import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import WebApp from '@twa-dev/sdk';

interface AuthContextType {
    user: any | null;
    membership: any | null;
    isLoading: boolean;
    login: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [membership, setMembership] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
            setUser(res.data.user);
            setMembership(res.data.membership);
            console.log("WebApp: profile loaded", res.data.user.username);
        } catch (err) {
            console.error('Failed to refresh profile', err);
            // alert('Profile load failed: ' + (err as any).message);
        }
    };

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        console.log("WebApp: checking token...", token ? "Found" : "Not found");
        if (token) {
            await refreshProfile();
            setIsLoading(false);
            return;
        }

        await login();
    };

    const login = async () => {
        console.log("WebApp: starting login...");
        try {
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
                console.warn("Not in Telegram environment");
                // alert("Running outside Telegram - using mock login");
                if (import.meta.env.DEV) {
                    console.log("Dev mode: attempting mock login...");
                    alert("Dev Mode: Попытка входа...");
                    try {
                        const res = await api.post('/webapp/login', { init_data: "mock_student" });
                        localStorage.setItem('token', res.data.access_token);
                        alert("Вход выполнен! Загрузка профиля...");
                        await refreshProfile();
                    } catch (e) {
                        console.error("Mock login failed", e);
                        alert("Вход не удался: " + (e as any).message);
                    }
                }
            }
        } catch (err) {
            console.error('Login failed', err);
            // alert('Login request failed. Check VITE_API_URL and browser console.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, membership, isLoading, login, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
