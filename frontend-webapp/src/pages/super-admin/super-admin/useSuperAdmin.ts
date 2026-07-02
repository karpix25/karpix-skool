import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/client';
import { feedItems } from './constants';
import { Tab } from './types';
import type { AppUser, TabType, Tenant, UserFilter } from './types';

export const useSuperAdmin = () => {
    const { activeTenantId, setActiveTenantId } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>(Tab.TERMINAL);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [search, setSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [userFilter, setUserFilter] = useState<UserFilter>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [time, setTime] = useState(new Date().toLocaleTimeString());
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; tenant: Tenant | null }>({ show: false, tenant: null });
    const [broadcastModal, setBroadcastModal] = useState(false);
    const [deleteConfirmName, setDeleteConfirmName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [feed] = useState(feedItems);

    const fetchTenants = async () => {
        try {
            const res = await api.get('/super/tenants');
            setTenants(res.data);
        } catch (err) {
            console.error('Failed to fetch tenants:', err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/super/users');
            setUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            await Promise.all([fetchTenants(), fetchUsers()]);
            setIsLoading(false);
        };
        load();
        const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

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
        } catch {
            alert('Update failed');
        }
    };

    const updateUserStatus = async (userId: string, updates: Partial<AppUser>) => {
        try {
            await api.patch(`/super/users/${userId}`, updates);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
        } catch {
            alert('Update failed');
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteModal.tenant || deleteConfirmName !== deleteModal.tenant.name) return;
        setIsDeleting(true);
        try {
            await api.delete(`/super/tenants/${deleteModal.tenant.id}`);
            setTenants(prev => prev.filter(t => t.id !== deleteModal.tenant?.id));
            setDeleteModal({ show: false, tenant: null });
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
        isLoading,
        time,
        deleteModal,
        broadcastModal,
        deleteConfirmName,
        isDeleting,
        feed,
        filteredTenants,
        selectedTenant,
        setActiveTab,
        setActiveTenantId,
        setSearch,
        setUserSearch,
        setUserFilter,
        setDeleteModal,
        setBroadcastModal,
        setDeleteConfirmName,
        toggleStatus,
        updateUserStatus,
        handleDeleteConfirm,
    };
};
