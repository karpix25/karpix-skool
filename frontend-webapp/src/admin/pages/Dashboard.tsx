import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { Plus, Copy, Users, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';

interface Tenant {
    id: string;
    name: string;
    setup_code: string;
    subscription_status: 'active' | 'past_due';
    member_count: number;
    course_count: number;
}

export const Dashboard: React.FC = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [newTenantName, setNewTenantName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const { isSuperAdmin } = useAuth();

    const fetchTenants = useCallback(async () => {
        try {
            setIsLoading(true);
            const url = isSuperAdmin ? '/super/tenants' : '/tenants/';
            const res = await api.get(url);
            setTenants(res.data);
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        fetchTenants();
    }, [fetchTenants]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/tenants/', { name: newTenantName });
            setTenants([...tenants, res.data]);
            setNewTenantName('');
            setIsCreating(false);
        } catch (err) {
            console.error(err);
            alert('Не удалось создать школу');
        }
    };

    const totalStudents = tenants.reduce((acc, t) => acc + t.member_count, 0);
    const totalCourses = tenants.reduce((acc, t) => acc + t.course_count, 0);

    return (
        <div className="p-6 md:p-10 space-y-10 max-w-6xl mx-auto pb-24 md:pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                        Dashboard
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Track your community growth and engagement.
                    </p>
                </div>
                {(!isSuperAdmin && tenants.length === 0) || isSuperAdmin ? (
                    <Button onClick={() => setIsCreating(true)} className="rounded-full shadow-md">
                        <Plus className="mr-2 h-4 w-4" /> Create School
                    </Button>
                ) : (
                    <Badge variant="outline" className="px-4 py-2 bg-muted/50 text-muted-foreground border-dashed">
                        Limit reached (1/1)
                    </Badge>
                )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                    { label: 'Schools', value: tenants.length, icon: BookOpen },
                    { label: 'Students', value: totalStudents, icon: Users },
                    { label: 'Courses', value: totalCourses, icon: BookOpen },
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm bg-card hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {stat.label}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Schools List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                        Your Schools ({tenants.length})
                    </h2>
                </div>

                <div className="grid gap-6">
                    {tenants.map((tenant) => (
                        <Card key={tenant.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all group">
                            <div className="flex flex-col md:flex-row">
                                <CardContent className="flex-1 p-6 md:p-8 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                                                {tenant.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground family-mono mt-1 opacity-60">
                                                ID: {tenant.id.split('-')[0]}
                                            </p>
                                        </div>
                                        <Badge
                                            variant={tenant.subscription_status === 'active' ? 'default' : 'destructive'}
                                            className="rounded-full px-3"
                                        >
                                            {tenant.subscription_status === 'active' ? 'Active' : 'Past Due'}
                                        </Badge>
                                    </div>

                                    <div className="flex gap-6">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-primary/60" />
                                            <span className="text-sm font-medium">{tenant.member_count}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">Members</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-primary/60" />
                                            <span className="text-sm font-medium">{tenant.course_count}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">Courses</span>
                                        </div>
                                    </div>
                                </CardContent>

                                {tenant.setup_code && (
                                    <div className="md:w-64 bg-muted/30 border-t md:border-t-0 md:border-l p-6 flex flex-col justify-center gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                Activation Code
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-background"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`/setup ${tenant.setup_code}`);
                                                    alert('Copied to clipboard!');
                                                }}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="text-lg font-mono font-bold tracking-[0.2em] text-center bg-background py-3 rounded-lg border">
                                            {tenant.setup_code}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}

                    {tenants.length === 0 && !isLoading && !isCreating && (
                        <Card className="border-2 border-dashed bg-transparent p-12 text-center flex flex-col items-center justify-center space-y-4">
                            <div className="p-4 bg-muted rounded-full">
                                <Plus className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold">Start your first school</h3>
                                <p className="text-sm text-muted-foreground">Get your community ready in seconds.</p>
                            </div>
                            <Button onClick={() => setIsCreating(true)} variant="outline" className="mt-4">
                                Create New School
                            </Button>
                        </Card>
                    )}
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Launch a new school</DialogTitle>
                    </DialogHeader>
                    <div className="py-6">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest block mb-2">
                            School Name
                        </label>
                        <Input
                            placeholder="e.g. Master Design Academy"
                            value={newTenantName}
                            onChange={(e) => setNewTenantName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate(e as any)}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCreating(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate}>
                            Launch School
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
