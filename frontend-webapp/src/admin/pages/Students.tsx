import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Users, Loader2, Trophy, Search, Mail, ShieldCheck, User, Calendar, RefreshCw, MoreVertical } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/utils';

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
    <Card className="group border-none shadow-sm hover:shadow-md transition-all bg-card overflow-hidden">
        <CardContent className="p-6">
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 rounded-xl border border-primary/5 shadow-sm">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="bg-primary/5 text-primary text-lg font-bold">
                            {member.username?.charAt(0).toUpperCase() || <User size={20} />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            @{member.username}
                        </h4>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                            ID: {member.id.substring(0, 8)}
                        </p>
                    </div>
                </div>

                <Badge
                    variant={member.role === 'admin' ? "default" : "secondary"}
                    className={cn(
                        "text-[9px] uppercase tracking-widest px-2 h-5 rounded-md",
                        member.role === 'admin' ? "bg-indigo-500 hover:bg-indigo-600 shadow-sm shadow-indigo-500/10" : "bg-muted text-muted-foreground"
                    )}
                >
                    {member.role === 'admin' ? 'Admin' : 'Student'}
                </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-muted/30 p-4 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 opacity-50">
                        <Trophy size={12} className="text-orange-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Experience</span>
                    </div>
                    <p className="text-lg font-black">{member.xp} XP</p>
                </div>
                <div className="bg-muted/30 p-4 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 opacity-50">
                        <ShieldCheck size={12} className="text-green-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Level</span>
                    </div>
                    <p className="text-lg font-black">{member.level}</p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-muted">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                        Since {new Date(member.joined_at).toLocaleDateString()}
                    </span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Mail size={16} />
                </Button>
            </div>
        </CardContent>
    </Card>
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
        <div className="p-6 md:p-10 space-y-10 max-w-6xl mx-auto pb-24 md:pb-12 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Students</h1>
                    <p className="text-muted-foreground text-sm mt-1 italic">Building your community one student at a time.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name..."
                            className="pl-10 rounded-full bg-muted/50 border-none shadow-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleSync}
                            disabled={isSyncing || !selectedTenant}
                            className="rounded-full shrink-0 h-10 w-10 border-none bg-muted/50"
                        >
                            <RefreshCw size={18} className={cn(isSyncing && "animate-spin")} />
                        </Button>

                        <Select
                            value={selectedTenant}
                            onValueChange={setSelectedTenant}
                        >
                            <SelectTrigger className="w-full sm:w-48 rounded-full h-10 border-none bg-muted/50 font-bold text-[10px] uppercase tracking-widest px-6 shadow-none">
                                <SelectValue placeholder="Select school" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-xl">
                                {tenants.map(t => (
                                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-card">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 opacity-60">Total Members</p>
                        <p className="text-2xl font-black text-foreground">{members.length}</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-card">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 opacity-60">Admins</p>
                        <p className="text-2xl font-black text-indigo-500">{members.filter(m => m.role === 'admin').length}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Member List */}
            <div className="space-y-12">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="border-none shadow-none bg-card/50">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                                        <Skeleton className="h-5 w-32" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Skeleton className="h-16 w-full rounded-xl" />
                                        <Skeleton className="h-16 w-full rounded-xl" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Admins Section */}
                        {adminMembers.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 px-2">
                                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Admins ({adminMembers.length})</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {adminMembers.map(member => (
                                        <MemberCard key={member.id} member={member} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Students Section */}
                        {studentMembers.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 px-2">
                                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Students ({studentMembers.length})</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {studentMembers.map(member => (
                                        <MemberCard key={member.id} member={member} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {filteredMembers.length === 0 && (
                            <Card className="border-2 border-dashed bg-transparent p-20 text-center flex flex-col items-center justify-center space-y-4 opacity-30">
                                <Users size={64} className="text-muted-foreground" />
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg">No students found</h3>
                                    <p className="text-sm">Try a different search or filter.</p>
                                </div>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
