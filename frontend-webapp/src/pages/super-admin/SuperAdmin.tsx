import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import {
    Shield,
    CheckCircle,
    Search,
    Users,
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
    TERMINAL: 'terminal',
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

interface FeedItem {
    id: string;
    time: string;
    type: 'SUCCESS' | 'MILESTONE' | 'SYSTEM' | 'ALERT';
    message: string;
    meta?: string;
    message_end?: string;
}

export const SuperAdmin: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>(Tab.TERMINAL);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [time, setTime] = useState(new Date().toLocaleTimeString());

    // Modals
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; tenant: Tenant | null }>({ show: false, tenant: null });
    const [broadcastModal, setBroadcastModal] = useState(false);
    const [deleteConfirmName, setDeleteConfirmName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Mock feed for Terminal
    const [feed] = useState<FeedItem[]>([
        { id: '1', time: '14:21:44', type: 'SUCCESS', message: 'School Alpha: New lesson ', meta: '"Advanced DeFi"', message_end: ' added.' },
        { id: '2', time: '14:20:12', type: 'MILESTONE', message: 'User ', meta: '@crypto_king', message_end: ' reached Level 10.' },
        { id: '3', time: '14:19:55', type: 'SYSTEM', message: 'Nodes: latency optimization complete.' },
        { id: '4', time: '14:18:02', type: 'ALERT', message: 'School Delta: brute-force attempt blocked.' },
        { id: '5', time: '14:16:30', type: 'SUCCESS', message: 'Nexus: v2.4.0 signal stable.' },
    ]);

    const fetchTenants = async () => {
        try {
            const res = await api.get('/super/tenants');
            setTenants(res.data);
        } catch (err) { console.error('Failed to fetch tenants:', err); }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/super/users');
            setUsers(res.data);
        } catch (err) { console.error('Failed to fetch users:', err); }
    };

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            await Promise.all([fetchTenants(), fetchUsers()]);
            setIsLoading(false);
        };
        load();
        const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

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
    const mySchool = tenants.find(t => t.member_count > 0);

    // View Renders
    const renderTerminal = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[
                    { label: 'Learners', value: tenants.reduce((acc, t) => acc + t.member_count, 0), icon: Users, color: 'text-success' },
                    { label: 'Ecosystems', value: tenants.length, icon: Globe, color: 'text-primary' },
                    { label: 'Uptime', value: '99.9%', icon: Activity, color: 'text-emerald-500' },
                    { label: 'Requests', value: users.filter(u => u.admin_status === 'pending').length, icon: UserPlus, color: 'text-danger' },
                ].map((stat, i) => (
                    <Card key={i} className="bg-card-dark border-zinc-800 rounded-2xl shadow-none">
                        <CardContent className="p-4 md:p-6">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-2">{stat.label}</p>
                            <div className="flex items-center justify-between">
                                <p className="text-xl md:text-2xl font-black truncate">{stat.value}</p>
                                <stat.icon size={16} className={stat.color} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Live Terminal */}
            <Card className="bg-terminal-bg border-zinc-800 rounded-[32px] overflow-hidden border-t-2 border-t-primary/20">
                <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/40 border-b border-zinc-800/50">
                    <div className="flex items-center gap-3">
                        <Activity size={14} className="text-primary animate-pulse" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 font-mono">Live Activity Signal</h2>
                    </div>
                </div>
                <div className="p-6 h-80 overflow-y-auto font-mono text-[10px] md:text-[11px] space-y-4 terminal-scrollbar relative">
                    <div className="scanline absolute inset-0"></div>
                    {feed.map((item) => (
                        <div key={item.id} className="flex gap-4">
                            <span className="text-zinc-600 shrink-0 select-none">[{item.time.split(':')[0]}:{item.time.split(':')[1]}]</span>
                            <div className="flex-1 break-words overflow-hidden">
                                <span className={cn("font-bold mr-2",
                                    item.type === 'SUCCESS' ? 'text-success' :
                                        item.type === 'MILESTONE' ? 'text-primary' :
                                            item.type === 'ALERT' ? 'text-danger' : 'text-zinc-500'
                                )}>[{item.type}]</span>
                                <span className="text-zinc-300">{item.message}</span>
                                {item.meta && <span className="text-primary font-black ml-1">{item.meta}</span>}
                                {item.message_end && <span className="text-zinc-300">{item.message_end}</span>}
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-4 animate-pulse">
                        <span className="text-zinc-600">[{time.split(' ')[0].split(':')[0]}:{time.split(' ')[0].split(':')[1]}]</span>
                        <div className="flex-1 font-black text-primary">_</div>
                    </div>
                </div>
            </Card>
        </div>
    );

    const renderGlobal = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 italic">Ecosystem Map</h3>
                <div className="relative w-full max-w-[200px] group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Search..."
                        className="bg-card-dark border-none h-9 pl-9 text-xs rounded-xl focus-visible:ring-primary/20"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTenants.map(tenant => (
                    <Card key={tenant.id} className="bg-card-dark border-zinc-800 rounded-3xl overflow-hidden hover:border-primary/20 transition-all">
                        <CardContent className="p-5 md:p-6">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-primary font-black uppercase text-sm md:text-base">
                                        {tenant.name.substring(0, 2)}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-black text-sm md:text-base truncate">{tenant.name}</h4>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                            {tenant.member_count} Students
                                        </p>
                                    </div>
                                </div>
                                <Badge
                                    className={cn(
                                        "text-[8px] font-black uppercase tracking-widest h-5 md:h-6 px-2 md:px-3 cursor-pointer border-none shrink-0",
                                        tenant.subscription_status === 'active' ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                                    )}
                                    onClick={() => toggleStatus(tenant.id, tenant.subscription_status)}
                                >
                                    {tenant.subscription_status}
                                </Badge>
                            </div>
                            <div className="mt-4 md:mt-6 flex items-center justify-between pt-4 border-t border-zinc-900">
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-tighter">Owner</span>
                                    <span className="text-[11px] font-bold text-zinc-400 truncate">@{tenant.owner_username || 'anonymous'}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="text-zinc-600 hover:text-danger hover:bg-danger/5 rounded-xl h-9 w-9 md:h-10 md:w-10" onClick={() => setDeleteModal({ show: true, tenant })}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );

    const renderAuthors = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <header className="px-2">
                <h3 className="text-xl font-black uppercase italic tracking-tighter">Author Requests</h3>
                <p className="text-zinc-500 text-xs font-medium">Moderate incoming eco-system invitations.</p>
            </header>

            <div className="space-y-3">
                {users.filter(u => u.admin_status === 'pending').map(user => (
                    <Card key={user.id} className="bg-card-dark border-zinc-800 rounded-[32px] overflow-hidden shadow-none">
                        <CardContent className="p-5 md:p-6 flex flex-col md:flex-row items-center gap-6">
                            <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0">
                                    <Users className="text-zinc-600" size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-black text-base truncate">@{user.username || 'unknown'}</h4>
                                    <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mt-0.5">ID: {user.telegram_id}</p>
                                </div>
                            </div>
                            <div className="flex-1 w-full md:w-auto text-center md:text-left bg-zinc-900/40 p-3 rounded-2xl">
                                <p className="text-xs text-zinc-400 italic">"{user.admin_request_details || 'No motivation'}"</p>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <Button className="flex-1 md:flex-none bg-success hover:bg-success/90 text-white rounded-2xl h-11 text-[9px] font-black uppercase tracking-widest" onClick={() => updateUserStatus(user.id, { admin_status: 'approved' })}>
                                    Approve
                                </Button>
                                <Button variant="ghost" className="flex-1 md:flex-none text-zinc-500 hover:bg-danger/5 hover:text-danger rounded-2xl h-11 text-[9px] font-black uppercase tracking-widest" onClick={() => updateUserStatus(user.id, { admin_status: 'rejected' })}>
                                    Reject
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {users.filter(u => u.admin_status === 'pending').length === 0 && (
                    <div className="py-20 text-center space-y-4 bg-zinc-900/40 rounded-[40px] border-2 border-dashed border-zinc-800 m-2">
                        <CheckCircle className="mx-auto text-zinc-700" size={32} />
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Queue Clean</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderMySchool = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {mySchool ? (
                <>
                    <header className="flex items-center gap-5 px-2">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-[30px] bg-primary flex items-center justify-center text-white font-black text-2xl italic shadow-2xl shadow-primary/20">
                            {mySchool.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black tracking-tight">{mySchool.name}</h2>
                            <p className="text-primary text-[10px] font-black uppercase tracking-[0.4em] mt-1">Personal Domain</p>
                        </div>
                    </header>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                        <Card className="bg-primary p-5 md:p-6 rounded-[32px] border-none text-white shadow-xl shadow-primary/20 col-span-2 md:col-span-1">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Revenue (MTD)</p>
                            <p className="text-2xl md:text-3xl font-black mt-2 font-mono tracking-tighter">$12,402</p>
                        </Card>
                        <Card className="bg-card-dark p-5 md:p-6 rounded-[32px] border-zinc-800">
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Students</p>
                            <p className="text-2xl md:text-3xl font-black mt-2">{mySchool.member_count}</p>
                        </Card>
                        <Card className="bg-card-dark p-5 md:p-6 rounded-[32px] border-zinc-800">
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Courses</p>
                            <p className="text-2xl md:text-3xl font-black mt-2">{mySchool.course_count}</p>
                        </Card>
                    </div>

                    <div className="bg-zinc-900/40 rounded-[40px] p-6 md:p-8 border border-zinc-800 mx-1">
                        <h4 className="font-black text-zinc-500 uppercase tracking-widest text-[10px] mb-6 pl-2">Local Activity Feed</h4>
                        <div className="space-y-5">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-4 items-start">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-zinc-300 break-words leading-relaxed">System enrollment sync for user @tg_user_{i}</p>
                                        <p className="text-[9px] text-zinc-600 font-mono mt-0.5">JUST NOW</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-20 grayscale opacity-40">
                    <Activity size={40} className="mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Workspace Offline</p>
                </div>
            )}
        </div>
    );

    if (isLoading) return (
        <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-primary/5 rounded-[24px] border border-primary/20 flex items-center justify-center animate-pulse">
                <Shield className="text-primary/40" size={32} />
            </div>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.5em] mt-8 animate-in fade-in duration-1000">Linking Neural Nodes...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 font-display selection:bg-primary/30 pb-32 overflow-x-hidden">
            {/* Desktop Header */}
            <header className="sticky top-0 z-50 bg-background-dark/80 ios-blur px-6 md:px-12 pt-8 md:pt-12 pb-6 border-b border-white/5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4 shrink-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-[16px] md:rounded-[18px] flex items-center justify-center shadow-xl shadow-primary/30">
                            <Shield className="text-white" size={20} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl md:text-2xl font-black uppercase italic leading-none truncate">Nexus</h1>
                            <p className="text-[8px] md:text-[9px] font-black text-primary uppercase tracking-[0.3em] mt-1.5 opacity-80 leading-none">Terminal</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6">
                        <nav className="hidden lg:flex bg-zinc-900/60 p-1.5 rounded-[24px] border border-zinc-800/50">
                            {[
                                { id: Tab.TERMINAL, label: 'Pulse', icon: Activity },
                                { id: Tab.GLOBAL, label: 'Global', icon: Globe },
                                { id: Tab.AUTHORS, label: 'Authors', icon: UserPlus },
                                { id: Tab.MY_SCHOOL, label: 'My School', icon: LayoutDashboard },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 h-9 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                                        activeTab === tab.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-500 hover:text-zinc-300"
                                    )}
                                >
                                    <tab.icon size={12} strokeWidth={3.5} /> {tab.label}
                                </button>
                            ))}
                        </nav>

                        <div className="hidden md:block h-10 w-[1px] bg-zinc-800" />

                        <Button
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 h-10 w-10 md:h-11 md:w-11 rounded-2xl border border-white/5 shrink-0"
                            size="icon"
                            onClick={() => setBroadcastModal(true)}
                        >
                            <MessageSquare size={16} />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 md:px-12 py-8">
                {activeTab === Tab.TERMINAL && renderTerminal()}
                {activeTab === Tab.GLOBAL && renderGlobal()}
                {activeTab === Tab.AUTHORS && renderAuthors()}
                {activeTab === Tab.MY_SCHOOL && renderMySchool()}
            </main>

            {/* Persistent Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-background-dark/95 ios-blur border-t border-white/5 pb-8 pt-4 px-4 flex justify-around z-50">
                {[
                    { id: Tab.TERMINAL, icon: Activity, label: 'Pulse' },
                    { id: Tab.GLOBAL, icon: Globe, label: 'Global' },
                    { id: Tab.AUTHORS, icon: UserPlus, label: 'Authors' },
                    { id: Tab.MY_SCHOOL, icon: LayoutDashboard, label: 'School' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn("flex flex-col items-center gap-1.5 flex-1 min-w-0 transition-transform active:scale-95", activeTab === tab.id ? "text-primary" : "text-zinc-600")}
                    >
                        <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all", activeTab === tab.id ? "bg-primary/10" : "")}>
                            <tab.icon size={18} strokeWidth={activeTab === tab.id ? 3 : 2} />
                        </div>
                        <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest truncate w-full text-center">{tab.label}</span>
                    </button>
                ))}
            </nav>

            {/* Modals */}
            <Dialog open={deleteModal.show} onOpenChange={() => setDeleteModal({ show: false, tenant: null })}>
                <DialogContent className="bg-card-dark border-zinc-800 rounded-[40px] p-8 md:p-10 max-w-[90vw] md:max-w-sm border-none shadow-2xl">
                    <DialogHeader className="space-y-4">
                        <div className="bg-danger/10 w-14 h-14 md:w-16 md:h-16 rounded-[24px] flex items-center justify-center text-danger mx-auto">
                            <AlertTriangle size={28} />
                        </div>
                        <DialogTitle className="text-lg md:text-xl font-black text-center uppercase tracking-tighter">Expunge Identity?</DialogTitle>
                        <DialogDescription className="text-center text-zinc-500 text-[11px] font-medium leading-relaxed">
                            Purging <span className="text-white font-bold">{deleteModal.tenant?.name}</span> will instantly purge all system nodes and student logs.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-8 space-y-4">
                        <Input
                            placeholder="Confirm ID"
                            className="bg-background-dark border-none h-12 md:h-14 rounded-2xl px-6 font-black text-center focus-visible:ring-danger/20 text-xs"
                            value={deleteConfirmName}
                            onChange={(e) => setDeleteConfirmName(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="ghost" className="h-11 rounded-2xl font-black uppercase text-[10px] tracking-widest" onClick={() => setDeleteModal({ show: false, tenant: null })}>Abort</Button>
                            <Button variant="destructive" className="h-11 rounded-2xl font-black uppercase text-[10px] tracking-widest" disabled={deleteConfirmName !== deleteModal.tenant?.name || isDeleting} onClick={handleDeleteConfirm}>
                                {isDeleting ? '...' : 'Execute'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={broadcastModal} onOpenChange={setBroadcastModal}>
                <DialogContent className="bg-card-dark border-zinc-800 rounded-[40px] p-8 md:p-10 max-w-[95vw] md:max-w-lg border-none shadow-2xl">
                    <DialogHeader className="mb-6">
                        <h4 className="text-xl font-black uppercase tracking-tighter italic">Global Signal</h4>
                        <p className="text-zinc-500 text-xs font-medium">Broadcast system-wide notification across the entire neural network.</p>
                    </DialogHeader>
                    <div className="space-y-6">
                        <div className="p-1.5 bg-background-dark rounded-2xl flex gap-1">
                            <Button className="flex-1 rounded-xl h-10 text-[9px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/10">All Admins</Button>
                            <Button variant="ghost" className="flex-1 rounded-xl h-10 text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-300">All Students</Button>
                        </div>
                        <Textarea
                            placeholder="Type announcement here..."
                            className="bg-background-dark border-none rounded-[24px] p-5 md:p-6 min-h-[140px] focus-visible:ring-primary/20 text-xs italic leading-relaxed"
                        />
                        <Button className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-[0.3em] shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
                            Transmit Signal
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
