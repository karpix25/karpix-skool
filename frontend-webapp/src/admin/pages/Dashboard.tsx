import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { Plus, Copy, Users, BookOpen, AlertTriangle, Home, Shield, CheckCircle } from 'lucide-react';
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
        <div className="p-4 md:p-12 space-y-8 max-w-6xl mx-auto pb-24 md:pb-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight">
                        С возвращением!
                    </h1>
                    <p className="text-gray-500 font-bold mt-2 text-sm md:text-base">Статистика ваших сообществ сегодня.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="w-full md:w-auto bg-[#0056D2] text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-center hover:bg-[#004dc0] transition-all shadow-blue-100 hover:shadow-xl active:scale-95"
                >
                    <Plus size={18} className="mr-2" strokeWidth={3} /> Создать школу
                </button>
            </header>

            {/* Quick Stats - Skool Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {[
                    { label: 'Школы', value: tenants.length, icon: Home, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Студенты', value: totalStudents, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Курсы', value: totalCourses, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow group">
                        <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300`}>
                            <stat.icon size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-gray-900 leading-none">{stat.value}</div>
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
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">Ваши школы ({tenants.length})</h2>
                </div>

                <div className="grid gap-4 md:gap-6">
                    {tenants.map((tenant) => (
                        <div key={tenant.id} className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all hover:border-blue-100 hover:shadow-md">
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h3 className="text-xl md:text-2xl font-black text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
                                        {tenant.name}
                                    </h3>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest font-mono">ID: {tenant.id.split('-')[0]}</p>
                                </div>

                                <div className="flex flex-wrap gap-2 md:gap-4">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                                        <Users size={14} className="text-blue-600" />
                                        <span className="text-xs font-black text-gray-900">{tenant.member_count}</span>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Студенты</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                                        <BookOpen size={14} className="text-indigo-600" />
                                        <span className="text-xs font-black text-gray-900">{tenant.course_count}</span>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Курсы</span>
                                    </div>
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${tenant.subscription_status === 'active' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                                        {tenant.subscription_status === 'active' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {tenant.subscription_status === 'active' ? 'Активна' : 'Приостановлена'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Setup Code Action Widget */}
                            {tenant.setup_code && (
                                <div className="w-full md:w-auto bg-blue-50/50 border border-blue-100 p-5 rounded-[24px] group/code transition-all hover:bg-blue-50 self-stretch md:self-auto flex flex-col justify-center">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest opacity-60">Код активации</span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`/setup ${tenant.setup_code}`);
                                                alert('Команда скопирована!');
                                            }}
                                            className="p-1.5 bg-white rounded-lg text-blue-600 hover:text-blue-800 shadow-sm transition-all active:scale-95"
                                        >
                                            <Copy size={14} strokeWidth={3} />
                                        </button>
                                    </div>
                                    <div className="text-xl md:text-2xl font-mono font-black text-blue-900 tracking-[0.2em] break-all">
                                        {tenant.setup_code}
                                    </div>
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
