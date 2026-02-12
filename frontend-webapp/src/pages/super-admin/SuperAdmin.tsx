import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import {
    Shield,
    CheckCircle,
    Search,
    Users,
    BookOpen,
    Trash2,
    AlertTriangle,
    Activity,
    Globe,
    MessageSquare,
    LayoutDashboard,
    UserPlus
} from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../lib/utils';

// Types
const Tab = {
    GLOBAL: 'global',
    AUTHORS: 'authors',
    MY_SCHOOL: 'my_school'
} as const;
type TabType = typeof Tab[keyof typeof Tab];

interface Tenant {
    id: string;
    name: string;
    owner_email: string | null;
    owner_username: string | null;
    owner_telegram_id: number | null;
    subscription_status: 'active' | 'past_due';
    expires_at: string | null;
    member_count: number;
    course_count: number;
}

interface AppUser {
    id: string;
    telegram_id: number;
    username: string | null;
    admin_status: 'none' | 'pending' | 'approved' | 'rejected';
    is_blocked: boolean;
    admin_request_details: string | null;
}

export const SuperAdmin: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>(Tab.GLOBAL);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Modals
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; tenant: Tenant | null }>({ show: false, tenant: null });
    const [broadcastModal, setBroadcastModal] = useState(false);
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

    // Handlers
    const toggleStatus = async (tenantId: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'active' ? 'past_due' : 'active';
        try {
            await api.patch(`/super/tenants/${tenantId}`, { subscription_status: nextStatus });
            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, subscription_status: nextStatus as any } : t));
        } catch (err) { alert('Update failed'); }
    };

    const updateUserStatus = async (userId: string, updates: Partial<AppUser>) => {
        try {
            await api.patch(`/super/users/${userId}`, updates);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
        } catch (err) { alert('Update failed'); }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteModal.tenant || deleteConfirmName !== deleteModal.tenant.name) return;
        setIsDeleting(true);
        try {
            await api.delete(`/super/tenants/${deleteModal.tenant.id}`);
            setTenants(prev => prev.filter(t => t.id !== deleteModal.tenant?.id));
            setDeleteModal({ show: false, tenant: null });
        } catch (err) { console.error(err); }
        finally { setIsDeleting(false); }
    };

    const filteredTenants = tenants.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    const mySchool = tenants.find(t => t.member_count > 0); // Temporary logic to find "your" school

    // Render Global View
    const renderGlobal = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Schools', value: tenants.length, icon: Globe, color: 'text-primary' },
                    { label: 'All Students', value: tenants.reduce((acc, t) => acc + t.member_count, 0), icon: Users, color: 'text-success' },
                    { label: 'All Courses', value: tenants.reduce((acc, t) => acc + t.course_count, 0), icon: BookOpen, color: 'text-orange-500' },
                    { label: 'Pending Authors', value: users.filter(u => u.admin_status === 'pending').length, icon: UserPlus, color: 'text-danger' },
                ].map((stat, i) => (
                    <Card key={i} className="bg-card-dark border-zinc-800 rounded-3xl shadow-none">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-2">
                                <div className={cn("p-2 rounded-xl bg-background-dark border border-white/5", stat.color)}>
                                    <stat.icon size={18} />
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black mt-1">{stat.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* School List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">Active Ecosystems</h3>
                    <div className="relative w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Filter schools..."
                            className="bg-card-dark border-none h-9 pl-9 text-xs rounded-xl focus-visible:ring-primary/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTenants.map(tenant => (
                        <Card key={tenant.id} className="bg-card-dark border-zinc-800 rounded-3xl overflow-hidden hover:border-primary/20 transition-all">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-primary font-black">
                                            {tenant.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-base">{tenant.name}</h4>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                                {tenant.member_count} Students • {tenant.course_count} Courses
                                            </p>
                                        </div>
                                    </div>
                                    <Badge
                                        className={cn(
                                            "text-[9px] font-black uppercase tracking-widest h-6 px-3 cursor-pointer border-none",
                                            tenant.subscription_status === 'active' ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                                        )}
                                        onClick={() => toggleStatus(tenant.id, tenant.subscription_status)}
                                    >
                                        {tenant.subscription_status}
                                    </Badge>
                                </div>
                                <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-900">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-tighter">Owner</span>
                                        <span className="text-xs font-bold text-zinc-400">@{tenant.owner_username || 'anonymous'}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-zinc-600 hover:text-danger hover:bg-danger/5 rounded-xl h-10 w-10" onClick={() => setDeleteModal({ show: true, tenant })}>
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );

    // Render Authors View
    const renderAuthors = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <header>
                <h3 className="text-xl font-black uppercase tracking-tighter">New Author Requests</h3>
                <p className="text-zinc-500 text-xs font-medium">Verify and grant platform access to new school creators.</p>
            </header>

            <div className="space-y-3">
                {users.filter(u => u.admin_status === 'pending').map(user => (
                    <Card key={user.id} className="bg-card-dark border-zinc-800 rounded-[32px] overflow-hidden">
                        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5 flex items-center justify-center">
                                    <Users className="text-zinc-600" size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black text-base">@{user.username || 'unknown'}</h4>
                                    <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-1">ID: {user.telegram_id}</p>
                                </div>
                            </div>
                            <div className="flex-1 px-4 text-center md:text-left">
                                <p className="text-xs text-zinc-400 italic">"{user.admin_request_details || 'No motivation provided'}"</p>
                            </div>
                            <div className="flex gap-2">
                                <Button className="bg-success hover:bg-success/90 text-white rounded-2xl px-6 h-12 font-black uppercase text-[10px] tracking-widest" onClick={() => updateUserStatus(user.id, { admin_status: 'approved' })}>
                                    Approve Access
                                </Button>
                                <Button variant="ghost" className="text-zinc-500 hover:bg-danger/5 hover:text-danger rounded-2xl h-12" onClick={() => updateUserStatus(user.id, { admin_status: 'rejected' })}>
                                    Reject
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {users.filter(u => u.admin_status === 'pending').length === 0 && (
                    <div className="py-20 text-center space-y-4 bg-zinc-900/40 rounded-[40px] border-2 border-dashed border-zinc-800">
                        <CheckCircle className="mx-auto text-zinc-700" size={40} />
                        <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">No pending applications</p>
                    </div>
                )}
            </div>
        </div>
    );

    // Render My School View
    const renderMySchool = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {mySchool ? (
                <>
                    <header className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-[32px] bg-primary shadow-2xl shadow-primary/40 flex items-center justify-center text-white font-black text-3xl italic">
                            {mySchool.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black tracking-tight">{mySchool.name}</h2>
                            <p className="text-primary text-[10px] font-black uppercase tracking-[0.4em] mt-1">Your Personal Workspace</p>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-primary p-6 rounded-[32px] border-none text-white shadow-2xl shadow-primary/20">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Revenue (MTD)</p>
                            <p className="text-3xl font-black mt-2">$12,402</p>
                        </Card>
                        <Card className="bg-card-dark p-6 rounded-[32px] border-zinc-800">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Active Students</p>
                            <p className="text-3xl font-black mt-2 text-foreground">{mySchool.member_count}</p>
                        </Card>
                        <Card className="bg-card-dark p-6 rounded-[32px] border-zinc-800">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Courses Live</p>
                            <p className="text-3xl font-black mt-2 text-foreground">{mySchool.course_count}</p>
                        </Card>
                    </div>

                    <div className="bg-zinc-900/40 rounded-[40px] p-8 border border-zinc-800">
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="font-black text-zinc-400 uppercase tracking-widest text-xs">Recent Activities</h4>
                        </div>
                        <div className="space-y-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-4 items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-zinc-300">New enrollment in "Mastering UI Design"</p>
                                        <p className="text-[9px] text-zinc-600 font-mono mt-0.5">2 HOURS AGO</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-primary text-[10px] font-black uppercase h-8">View</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-20 grayscale opacity-40">
                    <Activity size={48} className="mx-auto mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest">No active personal school detected</p>
                </div>
            )}
        </div>
    );

    if (isLoading) return (
        <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center">
            <div className="relative">
                <Shield className="text-primary/20 animate-pulse" size={64} />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-primary rounded-full animate-ping" />
                </div>
            </div>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mt-8">Establishing Secure Nexus...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 font-display transition-colors duration-500 pb-32">
            {/* Header / Nav */}
            <header className="sticky top-0 z-50 bg-background-dark/80 ios-blur px-6 md:px-12 pt-12 pb-6 border-b border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary rounded-[18px] flex items-center justify-center shadow-2xl shadow-primary/40 rotate-1">
                            <Shield className="text-white" size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase italic leading-none">Nexus</h1>
                            <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] mt-1.5 opacity-80">Owner Dashboard</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <nav className="flex bg-zinc-900/60 p-1.5 rounded-[24px] border border-zinc-800/50">
                            {[
                                { id: Tab.GLOBAL, label: 'Ecosystem', icon: Globe },
                                { id: Tab.AUTHORS, label: 'Authors', icon: UserPlus },
                                { id: Tab.MY_SCHOOL, label: 'My School', icon: LayoutDashboard },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2.5 px-6 h-10 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                        activeTab === tab.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-500 hover:text-zinc-300"
                                    )}
                                >
                                    <tab.icon size={13} strokeWidth={3} /> {tab.label}
                                </button>
                            ))}
                        </nav>

                        <div className="h-10 w-[1px] bg-zinc-800" />

                        <Button
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 h-11 w-11 rounded-2xl border border-white/5"
                            size="icon"
                            onClick={() => setBroadcastModal(true)}
                        >
                            <MessageSquare size={18} />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-6 md:px-12 py-10">
                {activeTab === Tab.GLOBAL && renderGlobal()}
                {activeTab === Tab.AUTHORS && renderAuthors()}
                {activeTab === Tab.MY_SCHOOL && renderMySchool()}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="fixed bottom-0 inset-x-0 bg-background-dark/95 ios-blur border-t border-white/5 pb-8 pt-4 px-6 md:hidden flex justify-around">
                {[
                    { id: Tab.GLOBAL, icon: Globe, label: 'Global' },
                    { id: Tab.AUTHORS, icon: UserPlus, label: 'Authors' },
                    { id: Tab.MY_SCHOOL, icon: LayoutDashboard, label: 'My School' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn("flex flex-col items-center gap-1.5", activeTab === tab.id ? "text-primary" : "text-zinc-600")}
                    >
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", activeTab === tab.id ? "bg-primary/10" : "")}>
                            <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
                    </button>
                ))}
            </nav>

            {/* Modals */}
            <Dialog open={deleteModal.show} onOpenChange={() => setDeleteModal({ show: false, tenant: null })}>
                <DialogContent className="bg-card-dark border-zinc-800 rounded-[40px] p-10 max-w-sm">
                    <DialogHeader className="space-y-4">
                        <div className="bg-danger/10 w-16 h-16 rounded-[24px] flex items-center justify-center text-danger mx-auto">
                            <AlertTriangle size={32} />
                        </div>
                        <DialogTitle className="text-xl font-black text-center uppercase tracking-tighter">Expunge Ecosystem?</DialogTitle>
                        <DialogDescription className="text-center text-zinc-500 text-xs font-medium">
                            Purging <span className="text-white font-bold">{deleteModal.tenant?.name}</span> will instantly delete all students, content and history.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-8 space-y-4">
                        <Input
                            placeholder="Type school name to confirm"
                            className="bg-background-dark border-none h-14 rounded-2xl px-6 font-black text-center focus-visible:ring-danger/20"
                            value={deleteConfirmName}
                            onChange={(e) => setDeleteConfirmName(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="ghost" className="h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest" onClick={() => setDeleteModal({ show: false, tenant: null })}>Abort</Button>
                            <Button variant="destructive" className="h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest" disabled={deleteConfirmName !== deleteModal.tenant?.name || isDeleting} onClick={handleDeleteConfirm}>
                                {isDeleting ? 'Purging...' : 'Execute'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={broadcastModal} onOpenChange={setBroadcastModal}>
                <DialogContent className="bg-card-dark border-zinc-800 rounded-[40px] p-10 max-w-lg">
                    <DialogHeader className="mb-6">
                        <h4 className="text-xl font-black uppercase tracking-tighter">Global Signal</h4>
                        <p className="text-zinc-500 text-xs font-medium">Broadcast messages to all administrators and students in the ecosystem.</p>
                    </DialogHeader>
                    <div className="space-y-6">
                        <div className="p-1.5 bg-background-dark rounded-2xl flex">
                            <Button className="flex-1 rounded-xl h-10 text-[9px] font-black uppercase tracking-widest bg-primary">All Admins</Button>
                            <Button variant="ghost" className="flex-1 rounded-xl h-10 text-[9px] font-black uppercase tracking-widest text-zinc-600">All Students</Button>
                        </div>
                        <Textarea
                            placeholder="Type system-wide announcement message..."
                            className="bg-background-dark border-none rounded-[24px] p-6 min-h-[160px] focus-visible:ring-primary/20 text-sm italic"
                        />
                        <Button className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20">
                            Transmit Signal
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
