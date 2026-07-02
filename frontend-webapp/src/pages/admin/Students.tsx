import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Users, Trophy, Search, Mail, ShieldCheck, User, Calendar } from 'lucide-react';
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

const managementRoles = new Set(['admin', 'owner', 'moderator']);

const getRoleLabel = (role: string) => {
    if (role === 'owner') return 'Владелец';
    if (role === 'moderator') return 'Модератор';
    if (role === 'admin') return 'Админ';
    return 'Студент';
};

const isManagementRole = (role: string) => managementRoles.has(role);

const MemberCard: React.FC<{ member: Member }> = ({ member }) => (
    <Card className="group border border-border shadow-sm transition-colors hover:border-primary/20 bg-card overflow-hidden rounded-lg">
        <CardContent className="p-5">
            <div className="flex items-start justify-between mb-5 gap-3">
                <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 rounded-lg border border-border shadow-sm">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="bg-primary/5 text-primary text-lg font-bold">
                            {member.username?.charAt(0).toUpperCase() || <User size={20} />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            @{member.username}
                        </h4>
                        <p className="text-[10px] font-bold text-muted-foreground opacity-60">
                            ID: {member.id.substring(0, 8)}
                        </p>
                    </div>
                </div>

                <Badge
                    variant={isManagementRole(member.role) ? "default" : "secondary"}
                    className={cn(
                        "text-[9px] px-2 h-5 rounded-md",
                        isManagementRole(member.role) ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10" : "bg-muted text-muted-foreground border border-border"
                    )}
                >
                    {getRoleLabel(member.role)}
                </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-muted/30 p-4 rounded-lg space-y-1 border border-border/50">
                    <div className="flex items-center gap-2 opacity-50">
                        <Trophy size={12} className="text-amber-600" />
                        <span className="text-[9px] font-black">Опыт</span>
                    </div>
                    <p className="text-lg font-black">{member.xp} XP</p>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg space-y-1 border border-border/50">
                    <div className="flex items-center gap-2 opacity-50">
                        <ShieldCheck size={12} className="text-success" />
                        <span className="text-[9px] font-black">Уровень</span>
                    </div>
                    <p className="text-lg font-black">{member.level}</p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-muted">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold opacity-70">
                        С {new Date(member.joined_at).toLocaleDateString('ru-RU')}
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

    const filteredMembers = members.filter(m =>
        (m.username || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const adminMembers = filteredMembers.filter(m => isManagementRole(m.role));
    const studentMembers = filteredMembers.filter(m => !isManagementRole(m.role));

    return (
        <div className="p-5 sm:p-6 md:p-10 space-y-8 max-w-6xl mx-auto pb-24 md:pb-12 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Студенты</h1>
                    <p className="text-muted-foreground text-sm mt-1">Участники и роли школы</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Поиск по имени..."
                            className="pl-10 rounded-lg bg-card border border-border shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">

                        {isSuperAdmin && (
                            <Select
                                value={selectedTenant}
                                onValueChange={setSelectedTenant}
                            >
                                <SelectTrigger className="w-full sm:w-48 rounded-lg h-10 border border-border bg-card font-bold text-[10px] px-4 shadow-sm">
                                    <SelectValue placeholder="Выбрать школу" />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg border-border shadow-md">
                                    {tenants.map(t => (
                                        <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border border-border shadow-sm bg-card rounded-lg">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-black text-muted-foreground mb-1 opacity-60">Всего участников</p>
                        <p className="text-2xl font-black text-foreground">{members.length}</p>
                    </CardContent>
                </Card>
                <Card className="border border-border shadow-sm bg-card rounded-lg">
                    <CardContent className="p-6">
                        <p className="text-[10px] font-black text-muted-foreground mb-1 opacity-60">Админы</p>
                        <p className="text-2xl font-black text-primary">{members.filter(m => isManagementRole(m.role)).length}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Member List */}
            <div className="space-y-12">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="border border-border shadow-none bg-card/50 rounded-lg">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                                        <Skeleton className="h-5 w-32" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Skeleton className="h-16 w-full rounded-lg" />
                                        <Skeleton className="h-16 w-full rounded-lg" />
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
                                    <h2 className="text-xs font-bold text-muted-foreground">Админы ({adminMembers.length})</h2>
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
                                    <h2 className="text-xs font-bold text-muted-foreground">Студенты ({studentMembers.length})</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {studentMembers.map(member => (
                                        <MemberCard key={member.id} member={member} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {filteredMembers.length === 0 && (
                            <Card className="border border-dashed bg-card p-12 sm:p-20 text-center flex flex-col items-center justify-center space-y-4 opacity-70 rounded-lg">
                                <Users size={64} className="text-muted-foreground" />
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg">Студенты не найдены</h3>
                                    <p className="text-sm">Попробуйте другой поиск или фильтр.</p>
                                </div>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
