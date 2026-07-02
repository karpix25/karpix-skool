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
                    <h3 className="text-xl font-semibold">Пользователи</h3>
                    <p className="text-muted-foreground text-xs mt-1">Заявки, роли и блокировки</p>
                </div>

                <div className="flex bg-muted p-1 rounded-lg border border-border overflow-x-auto no-scrollbar">
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
                                "px-3 md:px-4 h-9 rounded-md text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap",
                                userFilter === f.id ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {f.label}
                            <span className={cn("px-1.5 py-0.5 rounded-md text-[8px]", userFilter === f.id ? "bg-primary/10" : "bg-card")}>{f.count}</span>
                        </button>
                    ))}
                </div>
            </header>

            <div className="relative group px-2">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="Поиск по имени или ID..."
                    className="bg-card border-border h-12 pl-12 text-xs rounded-lg focus-visible:ring-primary/20 border shadow-sm"
                    value={userSearch}
                    onChange={(e) => onUserSearchChange(e.target.value)}
                />
            </div>

            <div className="space-y-3">
                {searchResults.map(user => (
                    <Card key={user.id} className={cn(
                        "bg-card border-border rounded-lg overflow-hidden shadow-sm transition-colors",
                        user.admin_status === 'pending' ? "border-primary/30" : ""
                    )}>
                        <CardContent className="p-5 md:p-6 flex flex-col md:flex-row items-center gap-6">
                            <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                                <div className={cn(
                                    "w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center shrink-0 border border-border",
                                    user.admin_status === 'approved' ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                                )}>
                                    <Users size={20} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-black text-base truncate">@{user.username || 'unknown'}</h4>
                                        {user.admin_status === 'approved' && <CheckCircle size={14} className="text-success" />}
                                    </div>
                                    <p className="text-[9px] font-mono text-muted-foreground mt-0.5">ID: {user.telegram_id}</p>
                                    {user.memberships && user.memberships.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {user.memberships.map((membership, i) => (
                                                <span key={i} className={cn(
                                                    "text-[8px] font-bold px-1.5 py-0.5 rounded-md border",
                                                    membership.role === 'owner' ? "bg-primary/10 text-primary border-primary/20" :
                                                        membership.role === 'admin' ? "bg-amber-500/10 text-amber-700 border-amber-500/20" :
                                                            "bg-muted text-muted-foreground border-border"
                                                )}>
                                                    {membership.role === 'owner' ? '👑' : membership.role === 'admin' ? '🛡️' : '📚'} {membership.tenant_name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {user.admin_status === 'pending' && (
                                <div className="flex-1 w-full md:w-auto text-center md:text-left bg-muted/40 p-3 rounded-lg border border-border">
                                    <p className="text-xs text-muted-foreground italic">"{user.admin_request_details || 'Без мотивации'}"</p>
                                </div>
                            )}

                            <div className="flex gap-2 w-full md:w-auto">
                                {user.admin_status !== 'approved' ? (
                                    <Button className="flex-1 md:flex-none bg-success hover:bg-success/90 text-white rounded-lg h-11 text-[9px] font-bold" onClick={() => onUpdateUserStatus(user.id, { admin_status: 'approved' })}>
                                        {user.admin_status === 'pending' ? 'Одобрить' : 'Дать админа'}
                                    </Button>
                                ) : (
                                    <Button variant="ghost" className="flex-1 md:flex-none text-danger hover:bg-danger/5 rounded-lg h-11 text-[9px] font-bold" onClick={() => onUpdateUserStatus(user.id, { admin_status: 'none' })}>
                                        Отозвать админа
                                    </Button>
                                )}
                                {user.admin_status === 'pending' && (
                                    <Button variant="ghost" className="flex-1 md:flex-none text-muted-foreground hover:bg-danger/5 hover:text-danger rounded-lg h-11 text-[9px] font-bold" onClick={() => onUpdateUserStatus(user.id, { admin_status: 'rejected' })}>
                                        Отклонить
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "h-11 px-6 rounded-lg text-[9px] font-bold transition-all",
                                        user.is_blocked ? "bg-danger text-white hover:bg-danger/90" : "bg-muted text-muted-foreground hover:bg-muted/80"
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
                    <div className="py-20 text-center space-y-4 bg-card rounded-lg border border-dashed border-border m-2">
                        <Activity className="mx-auto text-muted-foreground" size={32} />
                        <p className="text-[10px] font-black text-muted-foreground">Пользователи не найдены</p>
                    </div>
                )}
            </div>
        </div>
    );
};
