import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/client';
import { getApiErrorMessage } from '../../../services/apiError';
import { fetchSuperAdminActivity } from '../../../services/superAdminActivity';
import { fetchSuperAdminLeads, updateSuperAdminLead } from '../../../services/superAdminLeads';
import { Tab } from './types';
import type { AppUser, SuperActivityItem, SuperAdminLead, TabType, Tenant, UserFilter } from './types';

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

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            await Promise.all([fetchTenants(), fetchUsers(), fetchLeads(), fetchActivity()]);
            setIsLoading(false);
        };
        load();
        const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, [fetchActivity, fetchLeads, fetchTenants, fetchUsers]);

    useEffect(() => {
        if (isLoading || !activeTenantId) return;
        const tenantExists = tenants.some((tenant) => tenant.id === activeTenantId);
        if (!tenantExists) {
            setActiveTenantId(null);
        }
    }, [activeTenantId, isLoading, setActiveTenantId, tenants]);

    const toggleStatus = async (tenantId: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'active' ? 'past_due' : 'active';
        try {
            await api.patch(`/super/tenants/${tenantId}`, { subscription_status: nextStatus });
            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, subscription_status: nextStatus } : t));
            void fetchActivity();
        } catch {
            alert('Update failed');
        }
    };

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
        updateLeadStatus,
        setDeleteModal,
        setBroadcastModal,
        setDeleteConfirmName,
        toggleStatus,
        updateUserStatus,
        handleDeleteConfirm,
    };
};
