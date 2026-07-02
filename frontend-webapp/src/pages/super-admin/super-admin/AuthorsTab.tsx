import { Activity, CheckCircle, Search, Users } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import type { AppUser, UserFilter } from './types';

interface AuthorsTabProps {
    users: AppUser[];
    userSearch: string;
    userFilter: UserFilter;
    onUserSearchChange: (value: string) => void;
    onUserFilterChange: (filter: UserFilter) => void;
    onUpdateUserStatus: (userId: string, updates: Partial<AppUser>) => void;
}

export const AuthorsTab = ({
    users,
    userSearch,
    userFilter,
    onUserSearchChange,
    onUserFilterChange,
    onUpdateUserStatus,
}: AuthorsTabProps) => {
    const pendingCount = users.filter(u => u.admin_status === 'pending').length;
    const adminsCount = users.filter(u => u.admin_status === 'approved').length;
    const schoolAdminsCount = users.filter(u => u.memberships?.some(m => m.role === 'admin' || m.role === 'owner')).length;
    const searchResults = users.filter(user => {
        const matchesSearch = user.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
            user.telegram_id.toString().includes(userSearch);
        if (userFilter === 'pending') return matchesSearch && user.admin_status === 'pending';
        if (userFilter === 'admins') return matchesSearch && user.admin_status === 'approved';
        if (userFilter === 'school_admins') return matchesSearch && user.memberships?.some(m => m.role === 'admin' || m.role === 'owner');
        return matchesSearch;
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-2">
                <div>
                    <h3 className="text-xl font-semibold tracking-tight">Пользователи</h3>
                    <p className="text-zinc-500 text-xs mt-1">Заявки, роли и блокировки</p>
                </div>

                <div className="flex bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/50 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'pending', label: 'Ожидание', count: pendingCount },
                        { id: 'school_admins', label: 'Админы школ', count: schoolAdminsCount },
                        { id: 'admins', label: 'Авторы', count: adminsCount },
                        { id: 'all', label: 'База', count: users.length }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => onUserFilterChange(f.id as UserFilter)}
                            className={cn(
                                "px-3 md:px-4 h-9 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap",
                                userFilter === f.id ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            {f.label}
                            <span className={cn("px-1.5 py-0.5 rounded-md text-[8px]", userFilter === f.id ? "bg-white/20" : "bg-white/5")}>{f.count}</span>
                        </button>
                    ))}
                </div>
            </header>

            <div className="relative group px-2">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="Поиск по имени или ID..."
                    className="bg-card-dark border-zinc-800 h-14 pl-12 text-xs rounded-2xl focus-visible:ring-primary/20 border-2"
                    value={userSearch}
                    onChange={(e) => onUserSearchChange(e.target.value)}
                />
            </div>

            <div className="space-y-3">
                {searchResults.map(user => (
                    <Card key={user.id} className={cn(
                        "bg-card-dark border-zinc-800 rounded-[32px] overflow-hidden shadow-none transition-all",
                        user.admin_status === 'pending' ? "border-primary/30" : ""
                    )}>
                        <CardContent className="p-5 md:p-6 flex flex-col md:flex-row items-center gap-6">
                            <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                                <div className={cn(
                                    "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/5",
                                    user.admin_status === 'approved' ? "bg-success/10 text-success" : "bg-zinc-900 text-zinc-600"
                                )}>
                                    <Users size={20} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-black text-base truncate">@{user.username || 'unknown'}</h4>
                                        {user.admin_status === 'approved' && <CheckCircle size={14} className="text-success" />}
                                    </div>
                                    <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mt-0.5">ID: {user.telegram_id}</p>
                                    {user.memberships && user.memberships.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {user.memberships.map((membership, i) => (
                                                <span key={i} className={cn(
                                                    "text-[8px] font-bold px-1.5 py-0.5 rounded-md border",
                                                    membership.role === 'owner' ? "bg-primary/10 text-primary border-primary/20" :
                                                        membership.role === 'admin' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                                                            "bg-zinc-800 text-zinc-500 border-zinc-700"
                                                )}>
                                                    {membership.role === 'owner' ? '👑' : membership.role === 'admin' ? '🛡️' : '📚'} {membership.tenant_name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {user.admin_status === 'pending' && (
                                <div className="flex-1 w-full md:w-auto text-center md:text-left bg-zinc-900/40 p-3 rounded-2xl">
                                    <p className="text-xs text-zinc-400 italic">"{user.admin_request_details || 'Без мотивации'}"</p>
                                </div>
                            )}

                            <div className="flex gap-2 w-full md:w-auto">
                                {user.admin_status !== 'approved' ? (
                                    <Button className="flex-1 md:flex-none bg-success hover:bg-success/90 text-white rounded-2xl h-11 text-[9px] font-black uppercase tracking-widest" onClick={() => onUpdateUserStatus(user.id, { admin_status: 'approved' })}>
                                        {user.admin_status === 'pending' ? 'Одобрить' : 'Дать админа'}
                                    </Button>
                                ) : (
                                    <Button variant="ghost" className="flex-1 md:flex-none text-danger hover:bg-danger/5 rounded-2xl h-11 text-[9px] font-black uppercase tracking-widest" onClick={() => onUpdateUserStatus(user.id, { admin_status: 'none' })}>
                                        Отозвать админа
                                    </Button>
                                )}
                                {user.admin_status === 'pending' && (
                                    <Button variant="ghost" className="flex-1 md:flex-none text-zinc-500 hover:bg-danger/5 hover:text-danger rounded-2xl h-11 text-[9px] font-black uppercase tracking-widest" onClick={() => onUpdateUserStatus(user.id, { admin_status: 'rejected' })}>
                                        Отклонить
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "h-11 px-6 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all",
                                        user.is_blocked ? "bg-danger text-white hover:bg-danger/90" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                                    )}
                                    onClick={() => onUpdateUserStatus(user.id, { is_blocked: !user.is_blocked })}
                                >
                                    {user.is_blocked ? 'Заблок.' : 'Блокир.'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {searchResults.length === 0 && (
                    <div className="py-20 text-center space-y-4 bg-zinc-900/40 rounded-[40px] border-2 border-dashed border-zinc-800 m-2">
                        <Activity className="mx-auto text-zinc-700" size={32} />
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Пользователи не найдены</p>
                    </div>
                )}
            </div>
        </div>
    );
};
