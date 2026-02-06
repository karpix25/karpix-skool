import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { Plus, Copy, Users, BookOpen, AlertTriangle, Home, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Tenant {
    id: string;
    name: string;
    setup_code: string;
    subscription_status: 'active' | 'past_due';
    member_count: number;
    course_count: number;
}

export const Dashboard: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [newTenantName, setNewTenantName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const { isSuperAdmin } = useAuth();

    const fetchTenants = useCallback(async () => {
        try {
            // If super admin, fetch all. Otherwise just owned.
            const url = isSuperAdmin ? '/super/tenants' : '/tenants/';
            const res = await api.get(url);
            setTenants(res.data);
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        fetchTenants();
    }, [fetchTenants]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/tenants/', { name: newTenantName });
            // Optimized: just append directly or re-fetch. 
            // The API returns the connect_code only on create, so we must add it manually to list.
            // But list endpoint hides connect_code. So this is the ONLY time we see it?
            // Spec says: "List endpoint hides connect_code" in my implementation of `routes/tenants.py`.
            // So we should capture it now.
            setTenants([...tenants, res.data]);
            setNewTenantName('');
            setIsCreating(false);
        } catch (err) {
            console.error(err);
            alert('Не удалось создать школу');
        }
    };

    const totalStudents = tenants.reduce((acc, t) => acc + t.member_count, 0);
    const totalCourses = tenants.reduce((acc, t) => acc + t.course_count, 0);

    return (
        <div className="p-12 space-y-10 max-w-6xl mx-auto">
            {/* Header */}
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        С возвращением!
                    </h1>
                    <p className="text-gray-500 font-medium mt-2">Вот что происходит в ваших школах сегодня.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                >
                    <Plus size={18} className="mr-2" strokeWidth={3} /> Новая школа
                </button>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Активные школы', value: tenants.length, icon: Home, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Всего студентов', value: totalStudents, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Всего курсов', value: totalCourses, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow group">
                        <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                            <stat.icon size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-gray-900 leading-none">{stat.value}</div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal (Overlay-like) */}
            {isCreating && (
                <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-black text-gray-900 mb-6">Запустить новую школу</h3>
                        <form onSubmit={handleCreate} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Название школы</label>
                                <input
                                    type="text"
                                    placeholder="например, Сообщество Крипто-Мастеров"
                                    className="w-full bg-gray-50 border border-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-500 p-4 rounded-2xl outline-none transition-all font-bold text-gray-900"
                                    value={newTenantName}
                                    onChange={(e) => setNewTenantName(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="flex-1 bg-blue-600 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">
                                    Создать школу
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="px-6 bg-gray-100 text-gray-400 font-black uppercase tracking-widest text-xs py-4 rounded-2xl hover:bg-gray-200 transition-all"
                                >
                                    Отмена
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">Активные проекты</h2>
                </div>

                <div className="grid gap-6">
                    {tenants.some(t => t.subscription_status === 'past_due') && (
                        <div className="bg-red-50 border border-red-100 p-5 rounded-[24px] flex items-center gap-4 text-red-600 animate-pulse">
                            <div className="bg-red-100 p-2 rounded-xl">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <p className="font-black uppercase tracking-widest text-[10px]">Предупреждение о приостановке</p>
                                <p className="text-xs font-bold opacity-90">У одной или нескольких школ есть просроченные платежи. Доступ студентов временно ограничен.</p>
                            </div>
                        </div>
                    )}

                    {tenants.map((tenant) => (
                        <div key={tenant.id} className={`group bg-white p-8 rounded-[40px] border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-8 transition-all hover:shadow-xl hover:-translate-y-1 duration-300 ${tenant.subscription_status === 'past_due' ? 'border-red-100' : 'border-gray-50'}`}>
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-2xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{tenant.name}</h3>
                                    {tenant.subscription_status === 'past_due' && (
                                        <span className="px-3 py-1 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-full ring-1 ring-red-100">Просрочено</span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl">
                                        <Users size={16} className="text-blue-600" strokeWidth={2.5} />
                                        <span className="text-sm font-black text-gray-900">{tenant.member_count}</span>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Студенты</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl">
                                        <BookOpen size={16} className="text-indigo-600" strokeWidth={2.5} />
                                        <span className="text-sm font-black text-gray-900">{tenant.course_count}</span>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Курсы</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl">
                                        <Shield size={16} className="text-emerald-500" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase font-mono truncate max-w-[100px]">#{tenant.id.split('-')[0]}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Setup Code Action Widget */}
                            {tenant.setup_code && (
                                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 p-5 rounded-[32px] min-w-[200px] group/code transition-all hover:scale-105">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[9px] font-black text-yellow-700 uppercase tracking-[0.2em]">Код подключения</span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`/setup ${tenant.setup_code}`);
                                                // We can use a custom toast later!
                                            }}
                                            className="p-1.5 bg-white rounded-lg text-yellow-600 hover:text-yellow-800 shadow-sm transition-all"
                                            title="Copy Bot Command"
                                        >
                                            <Copy size={14} strokeWidth={3} />
                                        </button>
                                    </div>
                                    <div className="text-2xl font-mono font-black text-yellow-900 tracking-[0.3em] pl-1">
                                        {tenant.setup_code}
                                    </div>
                                    <p className="text-[9px] text-yellow-600/70 mt-3 font-bold uppercase tracking-wide italic">
                                        Вставьте в вашу группу в Telegram
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}

                    {tenants.length === 0 && !isCreating && (
                        <div className="bg-white border-2 border-dashed border-gray-100 rounded-[40px] p-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Plus size={32} className="text-gray-300" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">Создайте свою первую школу</h3>
                            <p className="text-gray-400 font-medium mb-8">Готовы начать обучение? Создайте свое первое пространство за считанные секунды.</p>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                            >
                                Начать работу
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
