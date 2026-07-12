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

const getAdminRequestText = (user: AppUser) => {
    const details = user.admin_request_details;
    if (typeof details === 'string') return details;
    if (!details) return 'Без мотивации';

    const school = details.school_name?.trim();
    const motivation = details.details?.trim();

    if (school && motivation) return `${school}: ${motivation}`;
    return school || motivation || 'Без мотивации';
};

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
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header className="rounded-2xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Роли и доступы</p>
                    <h3 className="mt-1 text-2xl font-semibold leading-tight">Авторы</h3>
                    <p className="text-muted-foreground text-xs mt-1">Заявки, роли и блокировки</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/65 p-1 min-[430px]:grid-cols-4">
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
                                "flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors",
                                userFilter === f.id ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <span className="truncate">{f.label}</span>
                            <span className={cn("rounded-md px-1.5 py-0.5 text-[11px]", userFilter === f.id ? "bg-primary/10" : "bg-card")}>{f.count}</span>
                        </button>
                    ))}
                </div>
            </header>

            <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="Поиск по имени или ID..."
                    className="h-11 pl-10 text-sm"
                    value={userSearch}
                    onChange={(e) => onUserSearchChange(e.target.value)}
                />
            </div>

            <div className="space-y-3">
                {searchResults.map(user => (
                    <Card key={user.id} className={cn(
                        "overflow-hidden rounded-2xl border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors",
                        user.admin_status === 'pending' ? "border-primary/30" : ""
                    )}>
                        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
                            <div className="flex w-full flex-1 items-center gap-3 md:w-auto">
                                <div className={cn(
                                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border",
                                    user.admin_status === 'approved' ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                                )}>
                                    <Users size={20} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="truncate text-base font-semibold">@{user.username || 'unknown'}</h4>
                                        {user.admin_status === 'approved' && <CheckCircle size={14} className="text-success" />}
                                    </div>
                                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">ID: {user.telegram_id}</p>
                                    {user.memberships && user.memberships.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {user.memberships.map((membership, i) => (
                                                <span key={i} className={cn(
                                                    "rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
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
                                <div className="w-full rounded-xl border border-border bg-muted/40 p-3 md:w-auto md:flex-1">
                                    <p className="text-xs leading-5 text-muted-foreground">"{getAdminRequestText(user)}"</p>
                                </div>
                            )}

                            <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto">
                                {user.admin_status !== 'approved' ? (
                                    <Button className="h-11 rounded-lg bg-success px-3 text-xs font-medium text-white hover:bg-success/90 md:flex-none" onClick={() => onUpdateUserStatus(user.id, { admin_status: 'approved' })}>
                                        {user.admin_status === 'pending' ? 'Одобрить' : 'Дать админа'}
                                    </Button>
                                ) : (
                                    <Button variant="ghost" className="h-11 rounded-lg px-3 text-xs font-medium text-danger hover:bg-danger/5 md:flex-none" onClick={() => onUpdateUserStatus(user.id, { admin_status: 'none' })}>
                                        Отозвать админа
                                    </Button>
                                )}
                                {user.admin_status === 'pending' && (
                                    <Button variant="ghost" className="h-11 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-danger/5 hover:text-danger md:flex-none" onClick={() => onUpdateUserStatus(user.id, { admin_status: 'rejected' })}>
                                        Отклонить
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "col-span-2 h-11 rounded-lg px-3 text-xs font-medium transition-all md:col-span-1 md:flex-none",
                                        user.is_blocked ? "bg-danger text-white hover:bg-danger/90" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    )}
                                    onClick={() => onUpdateUserStatus(user.id, { is_blocked: !user.is_blocked })}
                                >
                                    {user.is_blocked ? 'Разблокировать' : 'Блокировать'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {searchResults.length === 0 && (
                    <div className="py-20 text-center space-y-4 bg-card rounded-lg border border-dashed border-border m-2">
                        <Activity className="mx-auto text-muted-foreground" size={32} />
                        <p className="text-sm font-medium text-muted-foreground">Авторы не найдены</p>
                    </div>
                )}
            </div>
        </div>
    );
};
