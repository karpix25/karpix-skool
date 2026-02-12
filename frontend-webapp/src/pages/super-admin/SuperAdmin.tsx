import React, { useEffect, useState, useRef } from 'react';
import api from '../../api/client';
import {
    Shield,
    CheckCircle,
    Search,
    Users,
    BookOpen,
    Trash2,
    AlertTriangle,
    RotateCcw,
    Settings,
    MessageSquare,
    Globe,
    Activity,
    Network
} from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
    Dialog,
    DialogContent
} from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../lib/utils';

// Types
const Tab = {
    PULSE: 'pulse',
    SCHOOLS: 'schools',
    CONTENT: 'content',
    ACCESS: 'access',
    NEXUS: 'nexus'
} as const;
type TabType = typeof Tab[keyof typeof Tab];

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

interface FeedItem {
    id: string;
    time: string;
    type: 'SUCCESS' | 'MILESTONE' | 'SYSTEM' | 'ALERT';
    message: string;
    meta?: string;
    message_end?: string;
}

export const SuperAdmin: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>(Tab.PULSE);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [search, setSearch] = useState('');
    const [showAllUsers, setShowAllUsers] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; tenant: Tenant | null }>({ show: false, tenant: null });
    const [userDeleteModal, setUserDeleteModal] = useState<{ show: boolean; user: AppUser | null }>({ show: false, user: null });
    const [deleteConfirmName, setDeleteConfirmName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [time, setTime] = useState(new Date().toLocaleTimeString());
    const terminalRef = useRef<HTMLDivElement>(null);

    // Mock feed for Pulse
    const [feed] = useState<FeedItem[]>([
        { id: '1', time: '14:21:44', type: 'SUCCESS', message: 'School Alpha: New lesson ', meta: '"Advanced DeFi"', message_end: ' added.' },
        { id: '2', time: '14:20:12', type: 'MILESTONE', message: 'User ', meta: '@crypto_king', message_end: ' reached Level 10.' },
        { id: '3', time: '14:19:55', type: 'SYSTEM', message: 'Server Node 04: Optimizing latency for Middle East region...' },
        { id: '4', time: '14:18:02', type: 'ALERT', message: 'School Delta: 5 suspicious login attempts detected from IP 192.x.x.x' },
        { id: '5', time: '14:16:30', type: 'SUCCESS', message: 'Update: New feature "Nexus Protocol" deployed to beta.', meta: '' },
    ]);

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

        const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Existing Logic handlers
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

    // View Renders
    const renderPulse = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Bento Grid */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Learners (24h)', value: totalStudents, sub: '+12.4%', color: 'text-success', bg: 'bg-success/5' },
                    { label: 'Lessons Total', value: totalCourses, sub: 'Stable', color: 'text-primary', bg: 'bg-primary/5' },
                    { label: 'Bot Uptime', value: '99.9%', sub: 'Healthy', color: 'text-success', bg: 'bg-success/5' },
                    { label: 'Author Req.', value: users.filter(u => u.admin_status === 'pending').length, sub: 'New', color: 'text-danger', bg: 'bg-danger/5' },
                ].map((stat, i) => (
                    <Card key={i} className="bg-card-dark border-zinc-800 rounded-2xl overflow-hidden shadow-none">
                        <CardContent className="p-5 flex flex-col justify-between h-32">
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                                <p className="text-3xl font-black text-foreground mt-1">{stat.value}</p>
                            </div>
                            <div className={cn("text-[10px] font-black uppercase px-2 py-1 rounded-md w-fit tracking-tighter", stat.bg, stat.color)}>
                                {stat.sub}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </section>

            {/* Nexus Protocol Banner */}
            <section className="bg-primary p-6 rounded-3xl text-white relative overflow-hidden shadow-2xl shadow-primary/20">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Shield size={120} />
                </div>
                <div className="relative z-10 space-y-4">
                    <div>
                        <h3 className="text-2xl font-black tracking-tight leading-none mb-2">Nexus Protocol</h3>
                        <p className="text-white/70 text-sm font-medium max-w-sm">Cross-school synchronization and global content sharing system active.</p>
                    </div>
                    <div className="flex gap-8">
                        <div>
                            <p className="text-[10px] uppercase font-black opacity-50 tracking-widest">Active Nodes</p>
                            <p className="text-xl font-black">{tenants.length}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black opacity-50 tracking-widest">Global Traffic</p>
                            <p className="text-xl font-black">Stable</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Live Feed Terminal */}
            <Card className="bg-terminal-bg border-zinc-800 rounded-3xl overflow-hidden shadow-none border-t-2 border-t-primary/20">
                <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/40 border-b border-zinc-800/50">
                    <div className="flex items-center gap-3">
                        <Activity size={16} className="text-primary" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 font-mono">Live Activity Stream</h2>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                        <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                        <div className="w-2 h-2 rounded-full bg-primary pulsate"></div>
                    </div>
                </div>
                <div ref={terminalRef} className="p-6 h-80 overflow-y-auto font-mono text-[11px] space-y-4 terminal-scrollbar relative">
                    <div className="scanline absolute inset-0"></div>
                    {feed.map((item) => (
                        <div key={item.id} className="flex gap-4">
                            <span className="text-zinc-600 shrink-0 select-none">[{item.time}]</span>
                            <div className="flex-1">
                                <span className={cn("font-bold mr-2",
                                    item.type === 'SUCCESS' ? 'text-success' :
                                        item.type === 'MILESTONE' ? 'text-primary' :
                                            item.type === 'ALERT' ? 'text-danger' : 'text-zinc-500'
                                )}>[{item.type}]</span>
                                <span className="text-zinc-300">{item.message}</span>
                                {item.meta && <span className={cn("font-black", item.type === 'MILESTONE' ? 'text-white underline' : 'text-primary')}>{item.meta}</span>}
                                {item.message_end && <span className="text-zinc-300">{item.message_end}</span>}
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-4 animate-pulse">
                        <span className="text-zinc-600">[{time.split(' ')[0]}]</span>
                        <div className="flex-1 font-black text-primary animate-bounce">_</div>
                    </div>
                </div>
            </Card>
        </div>
    );

    const renderSchools = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 transition-colors group-focus-within:text-primary" />
                    <Input
                        placeholder="Search ecosystems..."
                        className="pl-12 bg-card-dark border-zinc-800 rounded-2xl h-12 focus-visible:ring-primary/20 text-sm font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTenants.map(tenant => (
                    <Card key={tenant.id} className={cn(
                        "bg-card-dark border-zinc-800 rounded-3xl overflow-hidden hover:border-primary/20 transition-all group",
                        tenant.subscription_status === 'past_due' && "border-l-4 border-l-danger"
                    )}>
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                                        {tenant.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-base text-foreground group-hover:text-primary transition-colors">{tenant.name}</h3>
                                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                            <Users size={12} strokeWidth={3} /> {tenant.member_count} Students
                                        </div>
                                    </div>
                                </div>
                                <Badge
                                    className={cn(
                                        "text-[9px] uppercase tracking-widest font-black px-3 py-1 rounded-md border-transparent transition-all cursor-pointer",
                                        tenant.subscription_status === 'active' ? "bg-success/10 text-success hover:bg-success/20" : "bg-danger/10 text-danger hover:bg-danger/20"
                                    )}
                                    onClick={() => toggleStatus(tenant.id, tenant.subscription_status)}
                                >
                                    {tenant.subscription_status === 'active' ? 'Active' : 'Expired'}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-zinc-800/50">
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase opacity-40 mb-1 tracking-widest">Ownership</p>
                                    <p className="text-xs font-bold truncate">{tenant.owner_username || 'Pending'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase opacity-40 mb-1 tracking-widest">Expires At</p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            className="bg-transparent border-none text-[11px] font-black p-0 focus:ring-0 cursor-pointer text-primary"
                                            value={tenant.expires_at ? tenant.expires_at.split('T')[0] : ''}
                                            onChange={(e) => updateExpiration(tenant.id, e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", tenant.owner_email ? "bg-success" : "bg-zinc-700")}></div>
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">Bot Connection: {tenant.owner_email ? 'Stable' : 'Offline'}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-zinc-800 text-zinc-500 hover:text-primary transition-all">
                                        <Activity size={18} />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-danger/10 text-zinc-500 hover:text-danger transition-all" onClick={() => handleDeleteClick(tenant)}>
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );

    const renderAccess = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                <div>
                    <h2 className="text-xl font-black tracking-tight">Author Lifecycle</h2>
                    <p className="text-muted-foreground text-xs font-medium">Moderate system-wide access and author privileges.</p>
                </div>
                <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-2xl border border-zinc-800/50">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-2 cursor-pointer" htmlFor="show-all-users">
                        Show Ghost Users
                    </Label>
                    <Switch id="show-all-users" checked={showAllUsers} onCheckedChange={setShowAllUsers} />
                </div>
            </header>

            <div className="space-y-4">
                {filteredUsers.filter(u => {
                    if (u.is_super_admin || u.admin_status !== 'none') return true;
                    return showAllUsers;
                }).map(user => (
                    <Card key={user.id} className="bg-card-dark border-zinc-800 rounded-3xl overflow-hidden shadow-none group">
                        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-zinc-700/50 shadow-inner">
                                    <span className="text-zinc-500 font-black text-lg">{(user.username || 'U').substring(0, 1).toUpperCase()}</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-base leading-none">@{user.username || 'anonymous'}</h3>
                                        <Badge variant="outline" className={cn(
                                            "text-[9px] uppercase tracking-widest font-black h-5 px-2 border-none",
                                            user.admin_status === 'approved' ? "bg-success/10 text-success" :
                                                user.admin_status === 'pending' ? "bg-primary/10 text-primary animate-pulse" :
                                                    "bg-zinc-800 text-zinc-500"
                                        )}>
                                            {user.admin_status}
                                        </Badge>
                                    </div>
                                    <p className="text-[10px] font-mono text-zinc-500 mt-1 opacity-60 uppercase">TGID: {user.telegram_id}</p>
                                </div>
                            </div>

                            <div className="flex-1 md:px-6">
                                <p className="text-xs text-muted-foreground italic line-clamp-2 max-w-md font-medium">
                                    {user.admin_request_details || "No motivation provided for this request."}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 self-end md:self-center">
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        user.is_blocked ? "bg-danger text-white hover:bg-danger/90" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                    )}
                                    onClick={() => updateUserStatus(user.id, { is_blocked: !user.is_blocked })}
                                >
                                    {user.is_blocked ? 'Blocked' : 'Allowed'}
                                </Button>

                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {user.admin_status !== 'approved' && (
                                        <Button variant="secondary" size="icon" className="h-11 w-11 rounded-2xl bg-success/10 text-success hover:bg-success hover:text-white" onClick={() => updateUserStatus(user.id, { admin_status: 'approved' })}>
                                            <CheckCircle size={20} />
                                        </Button>
                                    )}
                                    <Button variant="secondary" size="icon" className="h-11 w-11 rounded-2xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700" onClick={() => resetUserRequest(user.id)}>
                                        <RotateCcw size={20} />
                                    </Button>
                                    <Button variant="secondary" size="icon" className="h-11 w-11 rounded-2xl bg-danger/10 text-danger hover:bg-danger hover:text-white" onClick={() => {
                                        setUserDeleteModal({ show: true, user });
                                        setDeleteConfirmName('');
                                    }}>
                                        <Trash2 size={20} />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );

    const renderContent = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex items-center justify-between pb-2">
                <div>
                    <h2 className="text-xl font-black tracking-tight">Content Pipeline</h2>
                    <p className="text-muted-foreground text-xs font-medium">Global ecosystem course monitoring.</p>
                </div>
            </header>

            <div className="flex items-center justify-center h-[50vh] bg-card-dark rounded-[40px] border-2 border-dashed border-zinc-800 m-8">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-zinc-800 rounded-[24px] flex items-center justify-center mx-auto text-zinc-600">
                        <BookOpen size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-foreground">Content Indexing...</h3>
                        <p className="text-sm text-muted-foreground">This system will soon aggregate all ecosystem content here.</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderNexus = () => (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-2xl mx-auto">
            <header className="text-center space-y-2">
                <h2 className="text-3xl font-black tracking-tight uppercase tracking-widest">Nexus Console</h2>
                <p className="text-muted-foreground text-sm font-medium">High-level systems control and global maintenance.</p>
            </header>

            {/* Global Broadcast */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 pl-2">
                    <MessageSquare size={16} className="text-primary" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Global Broadcast</h3>
                </div>
                <Card className="bg-card-dark border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl">
                    <CardContent className="p-8 space-y-6">
                        <div className="flex p-1.5 bg-zinc-900 rounded-2xl">
                            <Button className="flex-1 rounded-xl h-10 text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">All Admins</Button>
                            <Button variant="ghost" className="flex-1 rounded-xl h-10 text-[10px] font-black uppercase tracking-widest text-zinc-500">All Students</Button>
                        </div>
                        <Textarea
                            placeholder="Type a global system-wide announcement here..."
                            className="bg-transparent border-2 border-zinc-800 rounded-2xl p-6 min-h-[160px] focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm leading-relaxed"
                        />
                        <Button className="w-full h-14 rounded-[20px] bg-primary text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 active:scale-95 transition-all">
                            Transmit Signal
                        </Button>
                    </CardContent>
                </Card>
            </section>

            {/* System Settings Cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                    { title: 'Maintenance Mode', icon: Settings, desc: 'Freeze access for updates', active: false },
                    { title: 'Global Sync', icon: Network, desc: 'Re-index all schools', active: true },
                ].map((item, i) => (
                    <Card key={i} className="bg-card-dark border-zinc-800 rounded-3xl overflow-hidden shadow-none">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-400 border border-zinc-800">
                                    <item.icon size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm text-foreground">{item.title}</span>
                                    <span className="text-[10px] font-medium text-muted-foreground">{item.desc}</span>
                                </div>
                            </div>
                            <Switch checked={item.active} />
                        </CardContent>
                    </Card>
                ))}
            </section>

            <div className="p-6 bg-primary/5 border border-primary/20 rounded-[32px] flex items-center gap-6">
                <div className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-primary shadow-lg shadow-primary/20"></span>
                </div>
                <div>
                    <p className="text-xs font-black text-primary uppercase tracking-widest">System Health: Optimal</p>
                    <p className="text-[10px] text-zinc-500 font-bold opacity-70">All ecosystems are performing within nominal parameters.</p>
                </div>
            </div>
        </div>
    );

    if (isLoading) return (
        <div className="p-10 space-y-10 max-w-7xl mx-auto flex flex-col items-center justify-center h-screen bg-background-dark">
            <div className="flex items-center gap-4 animate-pulse">
                <div className="h-16 w-16 bg-primary/5 rounded-[24px] border border-primary/10 flex items-center justify-center">
                    <Shield className="text-primary/20" size={32} />
                </div>
            </div>
            <div className="space-y-4 text-center">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Nexus Protocol</p>
                <h1 className="text-xl font-bold text-zinc-500">Initializing Terminal...</h1>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col font-display selection:bg-primary/20 pb-32">
            {/* Header / Tab Switcher */}
            <header className="sticky top-0 z-40 bg-background-dark/80 ios-blur px-6 md:px-12 pt-12 pb-6 border-b border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary rounded-[18px] flex items-center justify-center shadow-2xl shadow-primary/40 rotate-1">
                            <Shield className="text-white" size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight leading-none uppercase italic">Nexus</h1>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mt-1.5 leading-none opacity-80">System Terminal</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 bg-zinc-900/60 p-1.5 rounded-[24px] border border-zinc-800/50">
                        {[
                            { id: Tab.PULSE, label: 'Pulse', icon: Activity },
                            { id: Tab.SCHOOLS, label: 'Schools', icon: Globe },
                            { id: Tab.CONTENT, label: 'Content', icon: BookOpen },
                            { id: Tab.ACCESS, label: 'Access', icon: Users },
                            { id: Tab.NEXUS, label: 'Nexus', icon: Settings },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2.5 px-6 h-10 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === tab.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                <tab.icon size={14} strokeWidth={3} /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-12">
                {activeTab === Tab.PULSE && renderPulse()}
                {activeTab === Tab.SCHOOLS && renderSchools()}
                {activeTab === Tab.ACCESS && renderAccess()}
                {activeTab === Tab.CONTENT && renderContent()}
                {activeTab === Tab.NEXUS && renderNexus()}
            </main>

            {/* Persistent Mobile Navigation Overlay */}
            <nav className="fixed bottom-0 inset-x-0 bg-background-dark/90 ios-blur border-t border-zinc-800/50 pb-8 pt-4 px-6 z-50 md:hidden">
                <div className="max-w-md mx-auto flex justify-between items-center">
                    {[
                        { id: Tab.PULSE, label: 'Pulse', icon: Activity },
                        { id: Tab.SCHOOLS, label: 'Schools', icon: Globe },
                        { id: Tab.ACCESS, label: 'Access', icon: Users },
                        { id: Tab.NEXUS, label: 'Nexus', icon: Settings },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex flex-col items-center gap-1.5 transition-all duration-300",
                                activeTab === tab.id ? "text-primary scale-110" : "text-zinc-600"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                activeTab === tab.id ? "bg-primary/10 text-primary shadow-inner" : ""
                            )}>
                                <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Modals carried over from existing logic */}
            <Dialog open={deleteModal.show && !!deleteModal.tenant} onOpenChange={(open) => !open && setDeleteModal({ show: false, tenant: null })}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-[40px] shadow-2xl bg-card">
                    <div className="p-10 space-y-8">
                        <div className="flex items-start gap-6">
                            <div className="bg-danger/10 p-5 rounded-3xl text-danger">
                                <AlertTriangle size={40} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black tracking-tight text-foreground uppercase italic">Expunge Ecosystem?</h3>
                                <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                                    This action will <span className="text-danger font-black underline">instantly purge</span> all content, students, and logs. Irreversible.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em] pl-1 opacity-60">Confirm ecosystem name</Label>
                            <Input
                                value={deleteConfirmName}
                                onChange={(e) => setDeleteConfirmName(e.target.value)}
                                placeholder={deleteModal.tenant?.name}
                                className="h-16 bg-muted/50 border-none rounded-2xl font-black text-lg focus-visible:ring-danger/20 focus-visible:bg-background transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="ghost" className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs" onClick={() => setDeleteModal({ show: false, tenant: null })}>Abort</Button>
                            <Button variant="destructive" className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-danger/20" disabled={deleteConfirmName !== deleteModal.tenant?.name || isDeleting} onClick={handleDeleteConfirm}>
                                {isDeleting ? 'Purging...' : 'Execute Expunge'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={userDeleteModal.show && !!userDeleteModal.user} onOpenChange={(open) => !open && setUserDeleteModal({ show: false, user: null })}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-[40px] shadow-2xl bg-card">
                    <div className="p-10 space-y-8">
                        <div className="flex items-start gap-6">
                            <div className="bg-danger/10 p-5 rounded-3xl text-danger">
                                <AlertTriangle size={40} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black tracking-tight text-foreground uppercase italic">De-authorize Identity?</h3>
                                <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                                    Purging <span className="font-black text-foreground underline">@{userDeleteModal.user?.username || userDeleteModal.user?.telegram_id}</span> will remove all platform history.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em] pl-1 opacity-60">Confirm identity token</Label>
                            <Input
                                value={deleteConfirmName}
                                onChange={(e) => setDeleteConfirmName(e.target.value)}
                                placeholder={userDeleteModal.user?.username || userDeleteModal.user?.telegram_id.toString()}
                                className="h-16 bg-muted/50 border-none rounded-2xl font-black text-lg focus-visible:ring-danger/20 focus-visible:bg-background transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="ghost" className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs" onClick={() => setUserDeleteModal({ show: false, user: null })}>Abort</Button>
                            <Button variant="destructive" className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-danger/20" disabled={deleteConfirmName !== (userDeleteModal.user?.username || userDeleteModal.user?.telegram_id.toString()) || isDeleting} onClick={handleDeleteUser}>
                                {isDeleting ? 'Purging...' : 'Execute Expunge'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
