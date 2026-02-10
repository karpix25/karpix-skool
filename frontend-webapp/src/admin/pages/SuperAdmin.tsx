import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import {
    Shield,
    CheckCircle,
    XCircle,
    Search,
    Home,
    Users,
    BookOpen,
    Trash2,
    AlertTriangle,
    Clock,
    MoreVertical,
    Check,
    Ban,
    RotateCcw
} from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '../../components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { cn } from '../../lib/utils';

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
    const [search, setSearch] = useState('');
    const [showAllUsers, setShowAllUsers] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; tenant: Tenant | null }>({ show: false, tenant: null });
    const [userDeleteModal, setUserDeleteModal] = useState<{ show: boolean; user: AppUser | null }>({ show: false, user: null });
    const [deleteConfirmName, setDeleteConfirmName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchTenants = async () => {
        try {
            const res = await api.get('/super/tenants');
            setTenants(res.data);
        } catch (err) {
            console.error('Failed to fetch tenants:', err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/super/users');
            setUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
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
            alert('Status update failed');
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
            alert('Date update failed');
        }
    };

    const updateUserStatus = async (userId: string, updates: Partial<AppUser>) => {
        try {
            await api.patch(`/super/users/${userId}`, updates);
            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, ...updates } : u
            ));
        } catch (err) {
            alert('User update failed');
        }
    };

    const resetUserRequest = async (userId: string) => {
        if (!confirm('Are you sure you want to reset this user request?')) return;
        try {
            await api.delete(`/super/users/${userId}/request`);
            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, admin_status: 'none', admin_request_details: null } : u
            ));
        } catch (err) {
            alert('Reset failed');
        }
    };

    const handleDeleteUser = async () => {
        if (!userDeleteModal.user || deleteConfirmName !== (userDeleteModal.user.username || userDeleteModal.user.telegram_id.toString())) {
            return;
        }

        setIsDeleting(true);
        try {
            await api.delete(`/super/users/${userDeleteModal.user.id}`);
            setUsers(prev => prev.filter(u => u.id !== userDeleteModal.user?.id));
            setUserDeleteModal({ show: false, user: null });
            setDeleteConfirmName('');
        } catch (err) {
            console.error(err);
        } finally {
            setIsDeleting(false);
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
        <div className="p-10 space-y-10 max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="h-10 w-64" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-3xl" />)}
            </div>
            <Skeleton className="h-[400px] w-full rounded-[40px]" />
        </div>
    );

    return (
        <div className="p-6 md:p-12 space-y-12 max-w-7xl mx-auto pb-32 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20">
                            <Shield className="text-white" size={28} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">System Terminal</h1>
                    </div>
                    <p className="text-muted-foreground text-sm font-medium">Global platform oversight and community management.</p>
                </div>

                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                        placeholder="Search system..."
                        className="pl-12 rounded-full bg-muted/50 border-none shadow-none focus-visible:ring-primary/20 h-12"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Tabs defaultValue="tenants" className="w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 mb-4">
                    <TabsList className="bg-muted/50 p-1.5 rounded-full h-11">
                        <TabsTrigger value="tenants" className="rounded-full px-8 text-[11px] font-black uppercase tracking-widest gap-2">
                            <Home size={14} /> Schools
                        </TabsTrigger>
                        <TabsTrigger value="authors" className="rounded-full px-8 text-[11px] font-black uppercase tracking-widest gap-2">
                            <Users size={14} /> Authors
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-3 px-2">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest cursor-pointer" htmlFor="show-all">
                            Show All Users
                        </Label>
                        <Switch id="show-all" checked={showAllUsers} onCheckedChange={setShowAllUsers} />
                    </div>
                </div>

                <TabsContent value="tenants" className="space-y-10">
                    {/* Platform Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 animate-in slide-in-from-top-4 duration-500">
                        {[
                            { label: 'Schools', value: tenants.length, icon: Home, color: 'text-blue-500', bg: 'bg-blue-500/5' },
                            { label: 'Total Students', value: totalStudents, icon: Users, color: 'text-primary', bg: 'bg-primary/5' },
                            { label: 'Total Courses', value: totalCourses, icon: BookOpen, color: 'text-green-500', bg: 'bg-green-500/5' },
                            { label: 'Past Due', value: tenants.filter(t => t.subscription_status === 'past_due').length, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/5' },
                        ].map((stat, i) => (
                            <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all bg-card overflow-hidden">
                                <CardContent className="p-6 flex items-center gap-5">
                                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", stat.bg, stat.color)}>
                                        <stat.icon size={22} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-foreground leading-none">{stat.value}</p>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2 opacity-60">{stat.label}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card className="border-none shadow-sm bg-card overflow-hidden rounded-3xl">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-muted">
                                    <TableHead className="px-8 text-[10px] uppercase font-black tracking-widest">School</TableHead>
                                    <TableHead className="px-8 text-[10px] uppercase font-black tracking-widest">Ownership</TableHead>
                                    <TableHead className="px-8 text-[10px] uppercase font-black tracking-widest">Status</TableHead>
                                    <TableHead className="px-8 text-[10px] uppercase font-black tracking-widest">Expires At</TableHead>
                                    <TableHead className="px-8 text-[10px] uppercase font-black tracking-widest text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTenants.map((tenant) => (
                                    <TableRow key={tenant.id} className="border-muted/50 group">
                                        <TableCell className="px-8 py-5">
                                            <p className="font-bold text-base">{tenant.name}</p>
                                            <p className="text-[9px] font-mono text-muted-foreground uppercase opacity-50 mt-1 tracking-tighter">ID: {tenant.id.split('-')[0]}</p>
                                        </TableCell>
                                        <TableCell className="px-8 py-5">
                                            <p className="font-bold text-xs">{tenant.owner_username || 'Invite Pending'}</p>
                                            <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{tenant.owner_email || '-'}</p>
                                        </TableCell>
                                        <TableCell className="px-8 py-5">
                                            <Badge
                                                variant={tenant.subscription_status === 'active' ? "default" : "destructive"}
                                                className={cn(
                                                    "cursor-pointer text-[9px] uppercase tracking-widest px-3 h-5 rounded-md transition-all shadow-sm",
                                                    tenant.subscription_status === 'active' ? "bg-green-500 hover:bg-green-600 shadow-green-500/10" : "bg-red-500 hover:bg-red-600 shadow-red-500/10"
                                                )}
                                                onClick={() => toggleStatus(tenant.id, tenant.subscription_status)}
                                            >
                                                {tenant.subscription_status === 'active' ? 'Active' : 'Expired'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-8 py-5">
                                            <div className="flex items-center gap-2 group/date">
                                                <Clock size={12} className="text-muted-foreground/30 group-focus-within/date:text-primary" />
                                                <input
                                                    type="date"
                                                    className="bg-transparent border-none text-xs font-bold outline-none cursor-pointer focus:text-primary transition-colors"
                                                    value={tenant.expires_at ? tenant.expires_at.split('T')[0] : ''}
                                                    onChange={(e) => updateExpiration(tenant.id, e.target.value)}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-8 py-5 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500"
                                                onClick={() => handleDeleteClick(tenant)}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="authors">
                    <Card className="border-none shadow-sm bg-card overflow-hidden rounded-3xl">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-muted">
                                    <TableHead className="px-8 text-[10px] uppercase font-black tracking-widest">User</TableHead>
                                    <TableHead className="px-8 text-[10px] uppercase font-black tracking-widest">Author Status</TableHead>
                                    <TableHead className="px-8 text-[10px] uppercase font-black tracking-widest">Request Details</TableHead>
                                    <TableHead className="px-8 text-[10px] uppercase font-black tracking-widest">Access Control</TableHead>
                                    <TableHead className="px-8 text-[10px] uppercase font-black tracking-widest text-right">Moderation</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.filter(u => {
                                    if (u.is_super_admin || u.admin_status !== 'none') return true;
                                    return showAllUsers;
                                }).map((user) => (
                                    <TableRow key={user.id} className="border-muted/50 group">
                                        <TableCell className="px-8 py-5">
                                            <p className="font-bold text-base">{user.username || 'user'}</p>
                                            <p className="text-[10px] font-mono text-muted-foreground opacity-50 mt-1">TG: {user.telegram_id}</p>
                                        </TableCell>
                                        <TableCell className="px-8 py-5">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[9px] uppercase tracking-widest px-2.5 h-5 rounded-md font-black shadow-sm",
                                                    user.admin_status === 'approved' ? "bg-green-50 text-green-600 border-green-200" :
                                                        user.admin_status === 'pending' ? "bg-blue-50 text-blue-600 border-blue-200 animate-pulse" :
                                                            "bg-muted text-muted-foreground border-border"
                                                )}
                                            >
                                                {user.admin_status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-8 py-5">
                                            <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={user.admin_request_details || ''}>
                                                {user.admin_request_details || 'No request details'}
                                            </p>
                                        </TableCell>
                                        <TableCell className="px-8 py-5">
                                            <Badge
                                                className={cn(
                                                    "cursor-pointer text-[9px] uppercase tracking-widest font-black h-7 px-4 rounded-full transition-all border-none shadow-md",
                                                    user.is_blocked ? "bg-red-500 hover:bg-red-600 shadow-red-500/10" : "bg-muted text-muted-foreground hover:bg-muted/80 shadow-none border"
                                                )}
                                                onClick={() => updateUserStatus(user.id, { is_blocked: !user.is_blocked })}
                                            >
                                                {user.is_blocked ? 'Blocked' : 'Access Allowed'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-8 py-5 text-right">
                                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                {user.admin_status !== 'approved' && (
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-green-600 hover:bg-green-50" onClick={() => updateUserStatus(user.id, { admin_status: 'approved' })}>
                                                        <CheckCircle size={18} />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-orange-500 hover:bg-orange-50" onClick={() => resetUserRequest(user.id)}>
                                                    <RotateCcw size={18} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:bg-red-50" onClick={() => {
                                                    setUserDeleteModal({ show: true, user });
                                                    setDeleteConfirmName('');
                                                }}>
                                                    <Trash2 size={18} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* School Delete Modal */}
            <Dialog open={deleteModal.show && !!deleteModal.tenant} onOpenChange={(open) => !open && setDeleteModal({ show: false, tenant: null })}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-[32px] shadow-2xl">
                    <div className="p-8 md:p-10 space-y-8 bg-background">
                        <div className="flex items-start gap-6">
                            <div className="bg-red-500/10 p-4 rounded-2xl text-red-600">
                                <AlertTriangle size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold tracking-tight">Delete School?</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    All content, members, and data will be <span className="text-red-600 font-bold underline">permanently deleted</span>. This cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Type school name to confirm</Label>
                            <Input
                                value={deleteConfirmName}
                                onChange={(e) => setDeleteConfirmName(e.target.value)}
                                placeholder={deleteModal.tenant?.name}
                                className="h-14 border-2 focus-visible:ring-red-500/20 focus-visible:border-red-500 rounded-2xl font-bold placeholder:opacity-30"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="ghost" className="h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setDeleteModal({ show: false, tenant: null })}>Cancel</Button>
                            <Button variant="destructive" className="h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20" disabled={deleteConfirmName !== deleteModal.tenant?.name || isDeleting} onClick={handleDeleteConfirm}>
                                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* User Delete Modal */}
            <Dialog open={userDeleteModal.show && !!userDeleteModal.user} onOpenChange={(open) => !open && setUserDeleteModal({ show: false, user: null })}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-[32px] shadow-2xl">
                    <div className="p-8 md:p-10 space-y-8 bg-background">
                        <div className="flex items-start gap-6">
                            <div className="bg-red-500/10 p-4 rounded-2xl text-red-600">
                                <AlertTriangle size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold tracking-tight">Delete User?</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Removing <span className="font-bold text-foreground">@{userDeleteModal.user?.username || 'user'}</span> will purge them from all system records and community memberships.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest pl-1">Confirm with Username/ID</Label>
                            <Input
                                value={deleteConfirmName}
                                onChange={(e) => setDeleteConfirmName(e.target.value)}
                                placeholder={userDeleteModal.user?.username || userDeleteModal.user?.telegram_id.toString()}
                                className="h-14 border-2 focus-visible:ring-red-500/20 focus-visible:border-red-500 rounded-2xl font-bold placeholder:opacity-30"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="ghost" className="h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setUserDeleteModal({ show: false, user: null })}>Cancel</Button>
                            <Button variant="destructive" className="h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20" disabled={deleteConfirmName !== (userDeleteModal.user?.username || userDeleteModal.user?.telegram_id.toString()) || isDeleting} onClick={handleDeleteUser}>
                                {isDeleting ? 'Deleting...' : 'Expunge User'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
