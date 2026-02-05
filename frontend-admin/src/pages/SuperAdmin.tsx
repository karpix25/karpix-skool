import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Shield, CheckCircle, XCircle, Search, Mail, User, Home, Users, BookOpen, Plus, Copy, Trash2, AlertTriangle } from 'lucide-react';

interface Tenant {
    id: string;
    name: string;
    owner_email: string | null;
    owner_username: string | null;
    owner_telegram_id: number | null;
    telegram_group_id: number | null;
    setup_code: string | null;
    subscription_status: 'active' | 'past_due';
    member_count: number;
    course_count: number;
}

export const SuperAdmin: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isInviting, setIsInviting] = useState(false);
    const [newSchoolName, setNewSchoolName] = useState('');
    const [inviteResult, setInviteResult] = useState<{ name: string; setup_code: string } | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; tenant: Tenant | null }>({ show: false, tenant: null });
    const [deleteConfirmName, setDeleteConfirmName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchTenants = async () => {
        try {
            const res = await api.get('/super/tenants');
            setTenants(res.data);
        } catch (err) {
            console.error('Не удалось загрузить школы:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
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

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/super/tenants/invite', { name: newSchoolName });
            setInviteResult(res.data);
            setNewSchoolName('');
            await fetchTenants(); // Refresh list to show the new school
        } catch (err) {
            console.error(err);
            alert('Не удалось создать приглашение');
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

    const handleDeleteCancel = () => {
        setDeleteModal({ show: false, tenant: null });
        setDeleteConfirmName('');
    };

    const filteredTenants = tenants.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.owner_email?.toLowerCase().includes(search.toLowerCase())
    );

    const totalStudents = tenants.reduce((acc, t) => acc + t.member_count, 0);
    const totalCourses = tenants.reduce((acc, t) => acc + t.course_count, 0);

    if (isLoading) return (
        <div className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest animate-pulse">
            Загрузка данных системы...
        </div>
    );

    return (
        <div className="p-12 space-y-10 max-w-7xl mx-auto">
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
                    <button
                        onClick={() => setIsInviting(true)}
                        className="bg-blue-600 text-white px-6 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs flex items-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                    >
                        <Plus size={18} className="mr-2" strokeWidth={3} /> Пригласить админа
                    </button>
                </div>
            </header>

            {/* Invite Modal */}
            {isInviting && (
                <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                        {!inviteResult ? (
                            <>
                                <h3 className="text-2xl font-black text-gray-900 mb-2">Пригласить новую школу</h3>
                                <p className="text-gray-400 text-sm font-medium mb-8">Сгенерированный код даст права владельца первому пользователю, который подключит эту школу через Telegram.</p>
                                <form onSubmit={handleInvite} className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Название школы</label>
                                        <input
                                            type="text"
                                            placeholder="например, Трейдинг Клуб"
                                            className="w-full bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-blue-50 p-4 rounded-2xl outline-none transition-all font-bold text-gray-900"
                                            value={newSchoolName}
                                            onChange={(e) => setNewSchoolName(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button type="submit" className="flex-1 bg-blue-600 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">
                                            Создать приглашение
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsInviting(false)}
                                            className="px-6 bg-gray-100 text-gray-400 font-black uppercase tracking-widest text-xs py-4 rounded-2xl hover:bg-gray-200 transition-all"
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle size={32} strokeWidth={3} />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2">Школа создана</h3>
                                <p className="text-gray-400 text-sm font-medium mb-8">Отправьте эту команду новому админу. Как только он применит её в своей группе Telegram, он станет владельцем школы.</p>

                                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-8 font-mono text-sm break-all text-blue-600 font-bold group relative">
                                    /setup {inviteResult.setup_code}
                                    <button
                                        onClick={() => navigator.clipboard.writeText(`/setup ${inviteResult.setup_code}`)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-xl shadow-sm hover:scale-110 active:scale-95 transition-all text-gray-400 hover:text-blue-600"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        setIsInviting(false);
                                        setInviteResult(null);
                                    }}
                                    className="w-full bg-gray-900 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl hover:bg-black transition-all"
                                >
                                    Готово
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                            <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Школа / Сообщество</th>
                            <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Владелец</th>
                            <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Telegram</th>
                            <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Статистика</th>
                            <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">Статус</th>
                            <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredTenants.map((tenant) => (
                            <tr key={tenant.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-6">
                                    <div className="font-bold text-gray-900">{tenant.name}</div>
                                    <div className="text-[10px] text-gray-400 font-mono mt-1">{tenant.id}</div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col gap-1">
                                        {tenant.owner_username || tenant.owner_telegram_id ? (
                                            <>
                                                <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                                    <User size={14} className="text-gray-400" />
                                                    {tenant.owner_username || `TG: ${tenant.owner_telegram_id}`}
                                                </div>
                                                {tenant.owner_email && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                                        <Mail size={14} />
                                                        {tenant.owner_email}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2 text-xs text-amber-600 font-bold">
                                                <XCircle size={14} />
                                                Владелец не назначен
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    {tenant.telegram_group_id ? (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                                                <CheckCircle size={12} className="text-green-600" />
                                                <span className="font-mono text-[10px]">ID: {tenant.telegram_group_id}</span>
                                            </div>
                                            {!tenant.owner_username && tenant.setup_code && (
                                                <div className="text-[9px] text-amber-600 font-bold uppercase tracking-wider bg-amber-50 px-2 py-1 rounded">
                                                    Ожидание: /setup {tenant.setup_code}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <XCircle size={12} />
                                                Не подключено
                                            </div>
                                            {tenant.setup_code && (
                                                <div className="text-[9px] text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded">
                                                    /setup {tenant.setup_code}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex gap-4">
                                        <div className="text-center">
                                            <div className="text-sm font-black text-gray-900">{tenant.member_count}</div>
                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Студенты</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-black text-gray-900">{tenant.course_count}</div>
                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Курсы</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    {tenant.subscription_status === 'active' ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold ring-1 ring-green-100">
                                            <CheckCircle size={12} />
                                            Активна
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold ring-1 ring-red-100">
                                            <XCircle size={12} />
                                            Просрочено
                                        </span>
                                    )}
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={() => toggleStatus(tenant.id, tenant.subscription_status)}
                                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tenant.subscription_status === 'active'
                                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                : 'bg-green-600 text-white hover:bg-green-700 shadow-sm shadow-green-200'
                                                }`}
                                        >
                                            {tenant.subscription_status === 'active' ? 'Приостановить' : 'Активировать'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(tenant)}
                                            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 flex items-center gap-2"
                                        >
                                            <Trash2 size={14} />
                                            Удалить
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredTenants.length === 0 && (
                    <div className="p-20 text-center text-gray-400 font-medium">
                        Сообществ, соответствующих поиску, не найдено.
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModal.show && deleteModal.tenant && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-red-100 p-3 rounded-xl">
                                <AlertTriangle className="text-red-600" size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-black text-gray-900">Удалить школу</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Это действие нельзя отменить. Школа и все связанные с ней данные будут удалены навсегда.
                                </p>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                            <p className="text-sm font-bold text-red-900">
                                The following will be permanently deleted:
                            </p>
                            <ul className="text-xs text-red-700 space-y-1 ml-4 list-disc">
                                <li>{deleteModal.tenant.member_count} студент{deleteModal.tenant.member_count !== 1 ? 'ов' : ''}</li>
                                <li>{deleteModal.tenant.course_count} курс{deleteModal.tenant.course_count !== 1 ? 'ов' : ''} (со всеми модулями и уроками)</li>
                                <li>Все данные о прогрессе</li>
                                <li>Подключение к группе Telegram</li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700">
                                Введите <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-red-600">{deleteModal.tenant.name}</span> для подтверждения:
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmName}
                                onChange={(e) => setDeleteConfirmName(e.target.value)}
                                placeholder="Введите название школы"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none font-medium"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleDeleteCancel}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-50"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={deleteConfirmName !== deleteModal.tenant.name || isDeleting}
                                className="flex-1 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? 'Удаление...' : 'Удалить школу'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
