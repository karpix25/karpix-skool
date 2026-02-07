import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Users, Loader2, Trophy, Search, Mail, ShieldCheck, User, Calendar } from 'lucide-react';

interface Member {
    id: string;
    username: string;
    avatar_url: string;
    xp: number;
    level: number;
    role: string;
    joined_at: string;
}

interface Tenant {
    id: string;
    name: string;
}

export const Students: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<string>('');
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const { isSuperAdmin } = useAuth();

    const fetchTenants = useCallback(async () => {
        try {
            const url = isSuperAdmin ? '/super/tenants' : '/tenants/';
            const res = await api.get(url);
            setTenants(res.data);
            if (res.data.length > 0 && !selectedTenant) {
                setSelectedTenant(res.data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch tenants:', err);
        }
    }, [isSuperAdmin, selectedTenant]);

    useEffect(() => {
        fetchTenants();
    }, [fetchTenants]);

    useEffect(() => {
        if (selectedTenant) {
            fetchMembers(selectedTenant);
        }
    }, [selectedTenant]);

    const fetchMembers = async (tenantId: string) => {
        setIsLoading(true);
        try {
            const res = await api.get(`/tenants/${tenantId}/members`);
            setMembers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredMembers = members.filter(m =>
        (m.username || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#F9FAFB] font-sans pb-32">
            <div className="max-w-7xl mx-auto p-4 md:p-12 space-y-8">
                {/* Header Style Skool */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight uppercase">Студенты</h1>
                        <p className="text-gray-500 font-bold mt-1 text-sm md:text-base italic">Ваше сообщество в одном месте.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Поиск по имени..."
                                className="w-full bg-white border border-gray-100 pl-12 pr-4 py-3.5 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-[#0056D2] transition-all outline-none font-bold text-sm shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="bg-white border border-gray-100 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-600 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm cursor-pointer"
                            value={selectedTenant}
                            onChange={(e) => setSelectedTenant(e.target.value)}
                        >
                            {tenants.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Dashboard Stats (Optional) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Всего</p>
                        <p className="text-2xl font-black text-gray-900">{members.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Админы</p>
                        <p className="text-2xl font-black text-purple-600">{members.filter(m => m.role === 'admin').length}</p>
                    </div>
                </div>

                {/* Student List */}
                <div className="grid gap-4">
                    {isLoading ? (
                        <div className="bg-white rounded-[32px] p-20 flex flex-col items-center justify-center border border-gray-100 shadow-sm">
                            <Loader2 className="animate-spin text-[#0056D2] mb-4" size={40} strokeWidth={3} />
                            <p className="text-gray-400 font-black uppercase tracking-widest text-[11px]">Загрузка участников...</p>
                        </div>
                    ) : filteredMembers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredMembers.map(member => (
                                <div key={member.id} className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group hover:-translate-y-1">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[#0056D2] font-black text-xl overflow-hidden border border-blue-100">
                                                {member.avatar_url ? (
                                                    <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    member.username?.charAt(0).toUpperCase() || <User size={24} />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-black text-gray-900 group-hover:text-[#0056D2] transition-colors">@{member.username}</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter opacity-70">
                                                    ID: {member.id.substring(0, 8)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${member.role === 'admin' ? 'bg-purple-50 text-purple-600 ring-1 ring-purple-100' : 'bg-blue-50 text-blue-600 ring-1 ring-blue-100'}`}>
                                            {member.role === 'admin' ? 'Админ' : 'Студент'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Trophy size={14} className="text-orange-500" />
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">XP Опыт</span>
                                            </div>
                                            <p className="text-lg font-black text-gray-900">{member.xp}</p>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <ShieldCheck size={14} className="text-green-500" />
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Уровень</span>
                                            </div>
                                            <p className="text-lg font-black text-gray-900">{member.level}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Calendar size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">С нами с {new Date(member.joined_at).toLocaleDateString()}</span>
                                        </div>
                                        <button className="p-2 bg-gray-50 rounded-lg text-gray-400 hover:text-[#0056D2] hover:bg-blue-50 transition-all active:scale-90">
                                            <Mail size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-[32px] p-20 flex flex-col items-center justify-center border border-gray-100 shadow-sm text-center">
                            <Users className="text-gray-100 mb-6" size={80} strokeWidth={1} />
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Пусто</h3>
                            <p className="text-gray-400 font-bold italic">Студенты не найдены в этой школе.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
