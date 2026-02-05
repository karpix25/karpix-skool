import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    isSuperAdmin: boolean;
    login: (token: string, isSuperAdmin: boolean) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));
    const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(localStorage.getItem('isSuperAdmin') === 'true');

    const login = (token: string, isSuper: boolean) => {
        localStorage.setItem('token', token);
        localStorage.setItem('isSuperAdmin', String(isSuper));
        setIsAuthenticated(true);
        setIsSuperAdmin(isSuper);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('isSuperAdmin');
        setIsAuthenticated(false);
        setIsSuperAdmin(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isSuperAdmin, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
