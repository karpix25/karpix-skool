import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Shield, CheckCircle, XCircle, Search, Home, Users, BookOpen, Trash2, AlertTriangle, Clock } from 'lucide-react';

interface Tenant {
    id: string;
    name: string;
    owner_email: string | null;
    owner_username: string | null;
    owner_telegram_id: number | null;
    telegram_group_id: number | null;
    setup_code: string | null;
    subscription_status: 'active' | 'past_due';
    expires_at: string | null;
    member_count: number;
    course_count: number;
}

interface AppUser {
    id: string;
    telegram_id: number;
    username: string | null;
    is_super_admin: boolean;
    admin_status: 'none' | 'pending' | 'approved' | 'rejected';
    is_blocked: boolean;
    admin_request_details: string | null;
}

export const SuperAdmin: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [activeTab, setActiveTab] = useState<'tenants' | 'authors'>('tenants');
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; tenant: Tenant | null }>({ show: false, tenant: null });
    const [deleteConfirmName, setDeleteConfirmName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchTenants = async () => {
        try {
            const res = await api.get('/super/tenants');
            setTenants(res.data);
        } catch (err) {
            console.error('Не удалось загрузить школы:', err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/super/users');
            setUsers(res.data);
        } catch (err) {
            console.error('Не удалось загрузить пользователей:', err);
        }
    };

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            await Promise.all([fetchTenants(), fetchUsers()]);
            setIsLoading(false);
        };
        load();
    }, []);

    const toggleStatus = async (tenantId: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'active' ? 'past_due' : 'active';
        try {
            await api.patch(`/super/tenants/${tenantId}`, {
                subscription_status: nextStatus
            });
            setTenants(prev => prev.map(t =>
                t.id === tenantId ? { ...t, subscription_status: nextStatus as any } : t
            ));
        } catch (err) {
            alert('Не удалось обновить статус школы');
        }
    };

    const updateExpiration = async (tenantId: string, date: string) => {
        try {
            await api.patch(`/super/tenants/${tenantId}`, {
                expires_at: date || null
            });
            setTenants(prev => prev.map(t =>
                t.id === tenantId ? { ...t, expires_at: date || null } : t
            ));
        } catch (err) {
            alert('Не удалось обновить срок действия');
        }
    };

    const updateUserStatus = async (userId: string, updates: Partial<AppUser>) => {
        try {
            await api.patch(`/super/users/${userId}`, updates);
            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, ...updates } : u
            ));
        } catch (err) {
            alert('Не удалось обновить статус пользователя');
        }
    };

    const resetUserRequest = async (userId: string) => {
        if (!confirm('Вы уверены, что хотите полностью сбросить заявку этого пользователя? Это позволит ему подать заявку заново.')) {
            return;
        }
        try {
            await api.delete(`/super/users/${userId}/request`);
            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, admin_status: 'none', admin_request_details: null } : u
            ));
        } catch (err) {
            alert('Не удалось сбросить заявку');
        }
    };



    const handleDeleteClick = (tenant: Tenant) => {
        setDeleteModal({ show: true, tenant });
        setDeleteConfirmName('');
    };

    const handleDeleteConfirm = async () => {
        if (!deleteModal.tenant || deleteConfirmName !== deleteModal.tenant.name) {
            return;
        }

        setIsDeleting(true);
        try {
            await api.delete(`/super/tenants/${deleteModal.tenant.id}`);
            await fetchTenants();
            setDeleteModal({ show: false, tenant: null });
            setDeleteConfirmName('');
        } catch (err) {
            console.error(err);
            alert('Не удалось удалить школу');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.owner_email?.toLowerCase().includes(search.toLowerCase())
    );

    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.telegram_id.toString().includes(search)
    );

    const totalStudents = tenants.reduce((acc, t) => acc + t.member_count, 0);
    const totalCourses = tenants.reduce((acc, t) => acc + t.course_count, 0);

    if (isLoading) return (
        <div className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest animate-pulse">
            Загрузка данных системы...
        </div>
    );

    return (
        <div className="p-12 space-y-10 max-w-7xl mx-auto pb-32">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                        <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-100">
                            <Shield className="text-white" size={32} strokeWidth={2.5} />
                        </div>
                        Управление платформой
                    </h1>
                    <p className="text-gray-500 font-medium mt-2">Терминал глобального мониторинга и управления сообществами.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Поиск..."
                            className="pl-14 pr-8 py-4 bg-white border border-gray-100 rounded-[24px] w-64 shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-200 outline-none transition-all font-bold text-gray-900"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-100 pb-2">
                <button
                    onClick={() => setActiveTab('tenants')}
                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'tenants' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                    <Home size={14} className="inline mr-2" /> Школы
                </button>
                <button
                    onClick={() => setActiveTab('authors')}
                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'authors' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                    <Users size={14} className="inline mr-2" /> Авторы и Заявки
                </button>
            </div>

            {activeTab === 'tenants' ? (
                <>
                    {/* Platform Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: 'Всего школ', value: tenants.length, icon: Home, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Всего студентов', value: totalStudents, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'Всего курсов', value: totalCourses, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Задолженности', value: tenants.filter(t => t.subscription_status === 'past_due').length, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-7 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-all group">
                                <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                                    <stat.icon size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-gray-900 leading-none tracking-tight">{stat.value}</div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-50">
                                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Школа</th>
                                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Владелец</th>
                                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Статус</th>
                                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest text-blue-600">До какого (Expires)</th>
                                    <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredTenants.map((tenant) => (
                                    <tr key={tenant.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="font-bold text-gray-900">{tenant.name}</div>
                                            <div className="text-[9px] text-gray-400 font-mono mt-1 uppercase tracking-tighter">ID: {tenant.id.split('-')[0]}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1 text-xs">
                                                <div className="font-bold text-gray-700">{tenant.owner_username || 'Invite Pending'}</div>
                                                {tenant.owner_email && <div className="text-gray-400">{tenant.owner_email}</div>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <button
                                                onClick={() => toggleStatus(tenant.id, tenant.subscription_status)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ring-1 ${tenant.subscription_status === 'active'
                                                    ? 'bg-green-50 text-green-600 ring-green-100'
                                                    : 'bg-red-50 text-red-600 ring-red-100'
                                                    }`}
                                            >
                                                {tenant.subscription_status === 'active' ? 'Активна' : 'Просрочено'}
                                            </button>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-gray-300" />
                                                <input
                                                    type="date"
                                                    className="bg-gray-50 border border-transparent hover:border-gray-200 focus:bg-white focus:border-blue-500 rounded-lg p-2 text-xs font-bold outline-none transition-all"
                                                    value={tenant.expires_at ? tenant.expires_at.split('T')[0] : ''}
                                                    onChange={(e) => updateExpiration(tenant.id, e.target.value)}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleDeleteClick(tenant)}
                                                    className="p-2.5 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Пользователь</th>
                                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Статус автора</th>
                                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Детали заявки</th>
                                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Доступ</th>
                                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Управление</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredUsers.filter(u => !u.is_super_admin).map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-gray-900">{user.username || 'user'}</div>
                                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">TG: {user.telegram_id}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.admin_status === 'approved' ? 'bg-green-50 text-green-600' :
                                            user.admin_status === 'pending' ? 'bg-blue-50 text-blue-600 animate-pulse' :
                                                'bg-gray-50 text-gray-400'
                                            }`}>
                                            {user.admin_status}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-xs text-gray-500 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap" title={user.admin_request_details || ''}>
                                            {user.admin_request_details || 'Нет заявки'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <button
                                            onClick={() => updateUserStatus(user.id, { is_blocked: !user.is_blocked })}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${user.is_blocked ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                        >
                                            {user.is_blocked ? 'Заблокирован' : 'Доступ разрешен'}
                                        </button>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex gap-2 justify-end">
                                            {user.admin_status !== 'approved' && (
                                                <button
                                                    onClick={() => updateUserStatus(user.id, { admin_status: 'approved' })}
                                                    className="p-2.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl transition-all"
                                                    title="Одобрить автора"
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                            )}
                                            {user.admin_status !== 'rejected' && (
                                                <button
                                                    onClick={() => updateUserStatus(user.id, { admin_status: 'rejected' })}
                                                    className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all"
                                                    title="Отклонить"
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => resetUserRequest(user.id)}
                                                className="p-2.5 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                                                title="Сбросить/Удалить заявку"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.show && deleteModal.tenant && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-10 space-y-8 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-5">
                            <div className="bg-red-100 p-4 rounded-2xl flex-shrink-0">
                                <AlertTriangle className="text-red-600" size={32} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Удалить школу?</h3>
                                <p className="text-gray-500 font-medium mt-1 leading-relaxed">
                                    Это действие <span className="text-red-600 font-bold underline">нельзя отменить</span>. Школа и все её данные будут стерты из системы навсегда.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">
                                Введите название для подтверждения
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmName}
                                onChange={(e) => setDeleteConfirmName(e.target.value)}
                                placeholder={deleteModal.tenant.name}
                                className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-red-500 focus:outline-none font-bold text-gray-900 transition-all placeholder:text-gray-200"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteModal({ show: false, tenant: null })}
                                disabled={isDeleting}
                                className="flex-1 px-8 py-5 rounded-2xl text-xs font-black uppercase tracking-widest bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-50"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={deleteConfirmName !== deleteModal.tenant.name || isDeleting}
                                className="flex-1 px-8 py-5 rounded-2xl text-xs font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 shadow-xl shadow-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? 'Удаление...' : 'Удалить навсегда'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};
