import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import api from '../../../api/client';
import { useAuth } from '../../../context/AuthContext';
import type { ViewMode } from '../../../types/auth';
import { SuperAdminContextSwitcher } from './SuperAdminContextSwitcher';
import type { ContextSwitcherTenant, SuperAdminViewMode } from './types';

const schoolWorkspaceRoutes = new Set(['/courses', '/students', '/team', '/settings']);
const moderatorWorkspaceRoutes = new Set(['/courses', '/students']);

function getRouteAfterModeChange(mode: SuperAdminViewMode, currentPath: string): string {
    if (mode === 'super_admin' || mode === 'student') {
        return '/';
    }

    if (mode === 'moderator') {
        return moderatorWorkspaceRoutes.has(currentPath) ? currentPath : '/students';
    }

    return schoolWorkspaceRoutes.has(currentPath) ? currentPath : '/';
}

function isSuperAdminViewMode(mode: ViewMode): mode is SuperAdminViewMode {
    return ['super_admin', 'admin', 'moderator', 'student'].includes(mode);
}

export const SuperAdminWorkspaceSwitcher = () => {
    const {
        activeTenantId,
        isSuperAdmin,
        refreshProfile,
        setActiveTenantId,
        setViewMode,
        viewMode,
    } = useAuth();
    const [tenants, setTenants] = useState<ContextSwitcherTenant[]>([]);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isSuperAdmin) return;

        let isMounted = true;

        api.get<ContextSwitcherTenant[]>('/super/tenants')
            .then((res) => {
                if (!isMounted) return;
                setTenants(Array.isArray(res.data) ? res.data : []);
            })
            .catch((err) => {
                console.error('Failed to load super admin tenants:', err);
                if (isMounted) setTenants([]);
            });

        return () => {
            isMounted = false;
        };
    }, [isSuperAdmin]);

    if (!isSuperAdmin || !isSuperAdminViewMode(viewMode)) return null;

    const selectTenant = async (tenantId: string) => {
        if (tenantId === activeTenantId) return;

        setActiveTenantId(tenantId);
        await refreshProfile(tenantId);
    };

    const switchMode = async (mode: SuperAdminViewMode) => {
        if (mode !== 'super_admin' && !activeTenantId && tenants[0]) {
            await selectTenant(tenants[0].id);
        }

        setViewMode(mode);

        const nextRoute = getRouteAfterModeChange(mode, location.pathname);
        if (nextRoute !== location.pathname) {
            navigate(nextRoute);
        }
    };

    return (
        <section className="relative z-20 border-b border-border/80 bg-background/95 px-2 py-1.5 backdrop-blur md:px-5">
            <div className="mx-auto max-w-6xl">
                <SuperAdminContextSwitcher
                    currentMode={viewMode}
                    selectedTenantId={activeTenantId}
                    tenants={tenants}
                    onModeChange={(mode) => void switchMode(mode)}
                    onTenantChange={(tenantId) => void selectTenant(tenantId)}
                />
            </div>
        </section>
    );
};
