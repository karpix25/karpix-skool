import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/client';
import { getApiErrorMessage } from '../../../services/apiError';
import { fetchSuperAdminActivity } from '../../../services/superAdminActivity';
import {
    fetchSuperAdminGenerationSettings,
    loginNotebookLmAuth,
    refreshNotebookLmAuth,
    updateSuperAdminGenerationProvider,
} from '../../../services/superAdminGenerationSettings';
import { fetchSuperAdminLeads, updateSuperAdminLead } from '../../../services/superAdminLeads';
import { Tab } from './types';
import { getConciseNotebookLmError } from './notebookLmAuthStatus';
import { TENANTS_CHANGED_EVENT } from './school-invite/events';
import type {
    AppUser,
    GenerationSettings,
    NotebookLmAuthState,
    NotebookGenerationProvider,
    SuperActivityItem,
    SuperAdminLead,
    TabType,
    Tenant,
    UserFilter,
} from './types';

const applyNotebookLmAuthState = (
    settings: GenerationSettings,
    authState: NotebookLmAuthState
): GenerationSettings => ({
    ...settings,
    google_notebooklm_auth: authState,
    google_notebooklm_configured: authState.authenticated,
    google_notebooklm_profile: authState.profile || settings.google_notebooklm_profile,
});

export const useSuperAdmin = () => {
    const { activeTenantId, setActiveTenantId } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>(Tab.TERMINAL);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [search, setSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [userFilter, setUserFilter] = useState<UserFilter>('all');
    const [leads, setLeads] = useState<SuperAdminLead[]>([]);
    const [isLeadsLoading, setIsLeadsLoading] = useState(false);
    const [leadsError, setLeadsError] = useState<string | null>(null);
    const [activity, setActivity] = useState<SuperActivityItem[]>([]);
    const [isActivityLoading, setIsActivityLoading] = useState(false);
    const [activityError, setActivityError] = useState<string | null>(null);
    const [generationSettings, setGenerationSettings] = useState<GenerationSettings | null>(null);
    const [isGenerationSettingsSaving, setIsGenerationSettingsSaving] = useState(false);
    const [isNotebookLmAuthLoading, setIsNotebookLmAuthLoading] = useState(false);
    const [generationSettingsError, setGenerationSettingsError] = useState<string | null>(null);
    const [notebookLmAuthModalOpen, setNotebookLmAuthModalOpen] = useState(false);
    const [notebookLmAuthError, setNotebookLmAuthError] = useState<string | null>(null);
    const [pendingNotebookLmProviderSwitch, setPendingNotebookLmProviderSwitch] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [time, setTime] = useState(new Date().toLocaleTimeString());
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; tenant: Tenant | null }>({ show: false, tenant: null });
    const [broadcastModal, setBroadcastModal] = useState(false);
    const [deleteConfirmName, setDeleteConfirmName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchTenants = useCallback(async () => {
        try {
            const res = await api.get('/super/tenants');
            setTenants(res.data);
        } catch (err) {
            console.error('Failed to fetch tenants:', err);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await api.get('/super/users');
            setUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    }, []);

    const fetchLeads = useCallback(async () => {
        setIsLeadsLoading(true);
        setLeadsError(null);
        try {
            const nextLeads = await fetchSuperAdminLeads();
            setLeads(nextLeads);
        } catch (err) {
            console.error('Failed to fetch super-admin leads:', err);
            setLeadsError(getApiErrorMessage(err, 'Не удалось загрузить заявки'));
        } finally {
            setIsLeadsLoading(false);
        }
    }, []);

    const fetchActivity = useCallback(async () => {
        setIsActivityLoading(true);
        setActivityError(null);
        try {
            const nextActivity = await fetchSuperAdminActivity();
            setActivity(nextActivity);
        } catch (err) {
            console.error('Failed to fetch super-admin activity:', err);
            setActivityError(getApiErrorMessage(err, 'Не удалось загрузить события'));
        } finally {
            setIsActivityLoading(false);
        }
    }, []);

    const fetchGenerationSettings = useCallback(async () => {
        setGenerationSettingsError(null);
        try {
            setGenerationSettings(await fetchSuperAdminGenerationSettings());
        } catch (err) {
            console.error('Failed to fetch generation settings:', err);
            setGenerationSettingsError(getApiErrorMessage(err, 'Не удалось загрузить режим генерации'));
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            await Promise.all([
                fetchTenants(),
                fetchUsers(),
                fetchLeads(),
                fetchActivity(),
                fetchGenerationSettings(),
            ]);
            setIsLoading(false);
        };
        load();
        const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, [fetchActivity, fetchGenerationSettings, fetchLeads, fetchTenants, fetchUsers]);

    useEffect(() => {
        if (isLoading || !activeTenantId) return;
        const tenantExists = tenants.some((tenant) => tenant.id === activeTenantId);
        if (!tenantExists) {
            setActiveTenantId(null);
        }
    }, [activeTenantId, isLoading, setActiveTenantId, tenants]);

    useEffect(() => {
        const refreshTenants = () => {
            void Promise.all([fetchTenants(), fetchActivity()]);
        };
        window.addEventListener(TENANTS_CHANGED_EVENT, refreshTenants);
        return () => window.removeEventListener(TENANTS_CHANGED_EVENT, refreshTenants);
    }, [fetchActivity, fetchTenants]);

    const updateUserStatus = async (userId: string, updates: Partial<AppUser>) => {
        try {
            await api.patch(`/super/users/${userId}`, updates);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
            void Promise.all([fetchLeads(), fetchActivity()]);
        } catch {
            alert('Update failed');
        }
    };

    const updateLeadStatus = useCallback(async (leadId: string, status: string) => {
        const application = leads.find((lead) => lead.id === leadId);
        try {
            if (application?.kind === 'author_request') {
                if (!application.userId) throw new Error('Author request user id is missing');
                await api.patch(`/super/users/${application.userId}`, { admin_status: status });
            } else {
                await updateSuperAdminLead(application?.leadId || leadId.replace(/^lead:/, ''), { status });
            }
            await Promise.all([fetchLeads(), fetchActivity(), fetchUsers()]);
        } catch (err) {
            alert(getApiErrorMessage(err, 'Не удалось обновить заявку'));
        }
    }, [fetchActivity, fetchLeads, fetchUsers, leads]);

    const setNotebookLmAuthState = useCallback((authState: NotebookLmAuthState) => {
        setGenerationSettings((currentSettings) => currentSettings
            ? applyNotebookLmAuthState(currentSettings, authState)
            : currentSettings
        );
    }, []);

    const saveGenerationProvider = useCallback(async (provider: NotebookGenerationProvider) => {
        const nextSettings = await updateSuperAdminGenerationProvider(provider);
        setGenerationSettings(nextSettings);
        void fetchActivity();
    }, [fetchActivity]);

    const completePendingNotebookLmProviderSwitch = useCallback(async (authState: NotebookLmAuthState) => {
        if (!authState.authenticated || !pendingNotebookLmProviderSwitch) return;

        if (generationSettings?.notebook_provider === 'google_notebooklm') {
            setPendingNotebookLmProviderSwitch(false);
            setNotebookLmAuthModalOpen(false);
            return;
        }

        setIsGenerationSettingsSaving(true);
        setGenerationSettingsError(null);
        setNotebookLmAuthError(null);
        try {
            await saveGenerationProvider('google_notebooklm');
            setPendingNotebookLmProviderSwitch(false);
            setNotebookLmAuthModalOpen(false);
        } catch (err) {
            const message = getConciseNotebookLmError(getApiErrorMessage(err, 'Не удалось сохранить режим генерации'));
            setNotebookLmAuthError(message);
            setGenerationSettingsError(message);
        } finally {
            setIsGenerationSettingsSaving(false);
        }
    }, [
        generationSettings?.notebook_provider,
        pendingNotebookLmProviderSwitch,
        saveGenerationProvider,
    ]);

    const applyNotebookLmAuthResult = useCallback(async (authState: NotebookLmAuthState) => {
        setNotebookLmAuthState(authState);
        await completePendingNotebookLmProviderSwitch(authState);
    }, [completePendingNotebookLmProviderSwitch, setNotebookLmAuthState]);

    const openNotebookLmAuthModal = useCallback((shouldSwitchProviderAfterAuth = false) => {
        setNotebookLmAuthError(null);
        setPendingNotebookLmProviderSwitch((current) => current || shouldSwitchProviderAfterAuth);
        setNotebookLmAuthModalOpen(true);
    }, []);

    const handleNotebookLmAuthModalOpenChange = useCallback((open: boolean) => {
        setNotebookLmAuthModalOpen(open);
        if (!open) {
            setPendingNotebookLmProviderSwitch(false);
        }
    }, []);

    const loginNotebookLmAuthStatus = useCallback(async () => {
        setIsNotebookLmAuthLoading(true);
        setGenerationSettingsError(null);
        setNotebookLmAuthError(null);
        try {
            await applyNotebookLmAuthResult(await loginNotebookLmAuth());
        } catch (err) {
            const message = getConciseNotebookLmError(getApiErrorMessage(err, 'Не удалось авторизовать NotebookLM'));
            setNotebookLmAuthError(message);
            setGenerationSettingsError(message);
        } finally {
            setIsNotebookLmAuthLoading(false);
        }
    }, [applyNotebookLmAuthResult]);

    const refreshNotebookLmAuthStatus = useCallback(async () => {
        setIsNotebookLmAuthLoading(true);
        setGenerationSettingsError(null);
        setNotebookLmAuthError(null);
        try {
            await applyNotebookLmAuthResult(await refreshNotebookLmAuth());
        } catch (err) {
            const message = getConciseNotebookLmError(getApiErrorMessage(err, 'Не удалось обновить статус NotebookLM'));
            setNotebookLmAuthError(message);
            setGenerationSettingsError(message);
        } finally {
            setIsNotebookLmAuthLoading(false);
        }
    }, [applyNotebookLmAuthResult]);

    const updateGenerationProvider = useCallback(async (provider: NotebookGenerationProvider) => {
        if (generationSettings?.notebook_provider === provider) {
            if (provider === 'google_notebooklm' && !generationSettings.google_notebooklm_auth?.authenticated) {
                openNotebookLmAuthModal(true);
            }
            return;
        }

        if (provider === 'google_notebooklm' && !generationSettings?.google_notebooklm_auth?.authenticated) {
            openNotebookLmAuthModal(true);
            return;
        }

        setIsGenerationSettingsSaving(true);
        setGenerationSettingsError(null);
        try {
            await saveGenerationProvider(provider);
        } catch (err) {
            setGenerationSettingsError(
                getConciseNotebookLmError(getApiErrorMessage(err, 'Не удалось сохранить режим генерации'))
            );
        } finally {
            setIsGenerationSettingsSaving(false);
        }
    }, [
        generationSettings?.google_notebooklm_auth?.authenticated,
        generationSettings?.notebook_provider,
        openNotebookLmAuthModal,
        saveGenerationProvider,
    ]);

    const handleDeleteConfirm = async () => {
        if (!deleteModal.tenant || deleteConfirmName !== deleteModal.tenant.name) return;
        setIsDeleting(true);
        try {
            await api.delete(`/super/tenants/${deleteModal.tenant.id}`);
            setTenants(prev => prev.filter(t => t.id !== deleteModal.tenant?.id));
            setDeleteModal({ show: false, tenant: null });
            void fetchActivity();
        } catch (err) {
            console.error(err);
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredTenants = tenants.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    const selectedTenant = tenants.find(t => t.id === activeTenantId) || null;

    return {
        activeTab,
        activeTenantId,
        tenants,
        users,
        search,
        userSearch,
        userFilter,
        leads,
        isLeadsLoading,
        leadsError,
        activity,
        isActivityLoading,
        activityError,
        generationSettings,
        isGenerationSettingsSaving,
        isNotebookLmAuthLoading,
        generationSettingsError,
        notebookLmAuthModalOpen,
        notebookLmAuthError,
        pendingNotebookLmProviderSwitch,
        isLoading,
        time,
        deleteModal,
        broadcastModal,
        deleteConfirmName,
        isDeleting,
        filteredTenants,
        selectedTenant,
        setActiveTab,
        setActiveTenantId,
        setSearch,
        setUserSearch,
        setUserFilter,
        fetchLeads,
        fetchActivity,
        fetchGenerationSettings,
        refreshNotebookLmAuthStatus,
        loginNotebookLmAuthStatus,
        updateLeadStatus,
        updateGenerationProvider,
        openNotebookLmAuthModal,
        handleNotebookLmAuthModalOpenChange,
        setDeleteModal,
        setBroadcastModal,
        setDeleteConfirmName,
        updateUserStatus,
        handleDeleteConfirm,
    };
};
