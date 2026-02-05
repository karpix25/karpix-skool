import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { LogOut, Users, Loader2, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    const { logout } = useAuth();

    useEffect(() => {
        const fetchTenants = async () => {
            try {
                const res = await api.get('/tenants/');
                setTenants(res.data);
                if (res.data.length > 0) {
                    setSelectedTenant(res.data[0].id);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchTenants();
    }, []);

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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-8">
                    <h1 className="text-xl font-bold text-gray-800">SaaS Админ</h1>
                    <div className="flex gap-4">
                        <Link to="/" className="text-gray-500 hover:text-gray-800 font-medium">Школы</Link>
                        <span className="text-blue-600 font-medium border-b-2 border-blue-600 cursor-pointer">Студенты</span>
                        <Link to="/courses" className="text-gray-500 hover:text-gray-800 font-medium">Курсы</Link>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center text-gray-600 hover:text-red-500"
                >
                    <LogOut size={18} className="mr-2" /> Выйти
                </button>
            </nav>

            <div className="max-w-6xl mx-auto mt-8 p-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <Users className="text-blue-600" /> Управление студентами
                    </h2>

                    <select
                        className="border p-2 rounded bg-white shadow-sm"
                        value={selectedTenant}
                        onChange={(e) => setSelectedTenant(e.target.value)}
                    >
                        {tenants.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Студент</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">XP / Уровень</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Присоединился</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Роль</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <Loader2 className="animate-spin inline mr-2 text-blue-500" /> Загрузка участников...
                                    </td>
                                </tr>
                            ) : members.length > 0 ? (
                                members.map(member => (
                                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold overflow-hidden">
                                                    {member.avatar_url ? <img src={member.avatar_url} alt="" /> : (member.username?.charAt(0) || 'U')}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">@{member.username || 'unknown'}</div>
                                                    <div className="text-xs text-gray-400">ID: {member.id.substring(0, 8)}...</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-sm font-bold border border-yellow-100">
                                                    <Trophy size={14} /> {member.xp} Опыт
                                                </div>
                                                <div className="text-sm font-bold text-gray-500">
                                                    Ур. {member.level}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(member.joined_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${member.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {member.role === 'admin' ? 'админ' : 'студент'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                        В этой школе пока нет участников.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
