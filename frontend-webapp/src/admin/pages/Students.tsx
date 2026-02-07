import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Users, Loader2, Trophy, Search, Mail, ShieldCheck, User, Calendar, RefreshCw } from 'lucide-react';

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

const MemberCard: React.FC<{ member: Member }> = ({ member }) => (
    <div className="bg-tg-secondary p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-tg-hint/10 shadow-sm hover:shadow-xl transition-all group hover:-translate-y-1">
        <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 font-black text-xl overflow-hidden border border-blue-500/20">
                    {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                        member.username?.charAt(0).toUpperCase() || <User size={24} />
                    )}
                </div>
                <div>
                    <div className="font-black text-tg-text group-hover:text-blue-500 transition-colors">@{member.username}</div>
                    <div className="text-[10px] font-bold text-tg-hint uppercase tracking-tighter opacity-70">
                        ID: {member.id.substring(0, 8)}
                    </div>
                </div>
            </div>

            <div className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${member.role === 'admin' ? 'bg-purple-500/10 text-purple-600 ring-1 ring-purple-500/20' : 'bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20'}`}>
                {member.role === 'admin' ? 'Админ' : 'Студент'}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-tg-bg p-4 rounded-2xl border border-tg-hint/10">
                <div className="flex items-center gap-2 mb-1">
                    <Trophy size={14} className="text-orange-500" />
                    <span className="text-[10px] font-black text-tg-hint uppercase tracking-widest">XP Опыт</span>
                </div>
                <p className="text-lg font-black text-tg-text">{member.xp}</p>
            </div>
            <div className="bg-tg-bg p-4 rounded-2xl border border-tg-hint/10">
                <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={14} className="text-green-500" />
                    <span className="text-[10px] font-black text-tg-hint uppercase tracking-widest">Уровень</span>
                </div>
                <p className="text-lg font-black text-tg-text">{member.level}</p>
            </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-tg-hint/5">
            <div className="flex items-center gap-2 text-tg-hint">
                <Calendar size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">С нами с {new Date(member.joined_at).toLocaleDateString()}</span>
            </div>
            <button className="p-2 bg-tg-bg rounded-lg text-tg-hint hover:text-blue-500 hover:bg-blue-500/10 transition-all active:scale-90">
                <Mail size={16} />
            </button>
        </div>
    </div>
);

export const Students: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<string>('');
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
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

    const handleSync = async () => {
        if (!selectedTenant) return;
        setIsSyncing(true);
        try {
            await api.post(`/tenants/${selectedTenant}/sync`);
            await fetchMembers(selectedTenant);
        } catch (err) {
            console.error('Sync failed:', err);
            alert('Не удалось синхронизировать администраторов. Убедитесь, что школа привязана к группе.');
        } finally {
            setIsSyncing(false);
        }
    };

    const filteredMembers = members.filter(m =>
        (m.username || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const adminMembers = filteredMembers.filter(m => m.role === 'admin');
    const studentMembers = filteredMembers.filter(m => m.role !== 'admin');

    return (
        <div className="min-h-screen bg-tg-bg font-sans pb-32">
            <div className="max-w-7xl mx-auto p-4 md:p-12 space-y-8">
                {/* Header Style Skool */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-tg-text tracking-tight uppercase">Студенты</h1>
                        <p className="text-tg-hint font-bold mt-1 text-sm md:text-base italic">Ваше сообщество в одном месте.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-tg-hint" size={18} />
                            <input
                                type="text"
                                placeholder="Поиск по имени..."
                                className="w-full bg-tg-secondary border border-tg-hint/10 pl-12 pr-4 py-3.5 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold text-sm shadow-sm text-tg-text placeholder-tg-hint/50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={handleSync}
                            disabled={isSyncing || !selectedTenant}
                            className="bg-tg-secondary border border-tg-hint/10 p-3.5 rounded-2xl text-tg-hint hover:text-blue-500 hover:border-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm flex items-center justify-center"
                            title="Синхронизировать администраторов"
                        >
                            <RefreshCw size={20} className={`transform transition-transform ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                        </button>

                        <select
                            className="bg-tg-secondary border border-tg-hint/10 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-tg-text focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm cursor-pointer"
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
                    <div className="bg-tg-secondary p-6 rounded-[24px] border border-tg-hint/10 shadow-sm">
                        <p className="text-[10px] font-black text-tg-hint uppercase tracking-[0.2em] mb-1">Всего</p>
                        <p className="text-2xl font-black text-tg-text">{members.length}</p>
                    </div>
                    <div className="bg-tg-secondary p-6 rounded-[24px] border border-tg-hint/10 shadow-sm">
                        <p className="text-[10px] font-black text-tg-hint uppercase tracking-[0.2em] mb-1">Админы</p>
                        <p className="text-2xl font-black text-purple-600">{members.filter(m => m.role === 'admin').length}</p>
                    </div>
                </div>

                {/* Student List */}
                <div className="space-y-12">
                    {isLoading ? (
                        <div className="bg-tg-secondary rounded-[32px] p-20 flex flex-col items-center justify-center border border-tg-hint/10 shadow-sm">
                            <Loader2 className="animate-spin text-blue-500 mb-4" size={40} strokeWidth={3} />
                            <p className="text-tg-hint font-black uppercase tracking-widest text-[11px]">Загрузка участников...</p>
                        </div>
                    ) : (
                        <>
                            {/* Admins Section */}
                            {adminMembers.length > 0 && (
                                <section>
                                    <h2 className="text-xl font-black text-tg-text uppercase tracking-tight mb-6 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                                            <ShieldCheck size={20} strokeWidth={2.5} />
                                        </div>
                                        Администраторы <span className="text-tg-hint text-base">({adminMembers.length})</span>
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {adminMembers.map(member => (
                                            <MemberCard key={member.id} member={member} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Students Section */}
                            {studentMembers.length > 0 && (
                                <section>
                                    <h2 className="text-xl font-black text-tg-text uppercase tracking-tight mb-6 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                            <Users size={20} strokeWidth={2.5} />
                                        </div>
                                        Студенты <span className="text-tg-hint text-base">({studentMembers.length})</span>
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {studentMembers.map(member => (
                                            <MemberCard key={member.id} member={member} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {filteredMembers.length === 0 && (
                                <div className="bg-tg-secondary rounded-[32px] p-20 flex flex-col items-center justify-center border border-tg-hint/10 shadow-sm text-center">
                                    <Users className="text-tg-hint/20 mb-6" size={80} strokeWidth={1} />
                                    <h3 className="text-xl font-black text-tg-text uppercase tracking-tight mb-2">Пусто</h3>
                                    <p className="text-tg-hint font-bold italic">Участники не найдены.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
