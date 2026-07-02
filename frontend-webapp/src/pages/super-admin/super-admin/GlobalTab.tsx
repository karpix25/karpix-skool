import { Search, Trash2 } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import type { Tenant } from './types';

interface GlobalTabProps {
    tenants: Tenant[];
    search: string;
    onSearchChange: (value: string) => void;
    onToggleStatus: (tenantId: string, currentStatus: string) => void;
    onDeleteTenant: (tenant: Tenant) => void;
}

export const GlobalTab = ({ tenants, search, onSearchChange, onToggleStatus, onDeleteTenant }: GlobalTabProps) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-semibold text-foreground">Школы</h3>
            <div className="relative w-full max-w-[200px] group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="Поиск..."
                    className="bg-card border border-border h-9 pl-9 text-xs rounded-lg focus-visible:ring-primary/20 shadow-sm"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tenants.map(tenant => (
                <Card key={tenant.id} className="bg-card border-border rounded-lg overflow-hidden hover:border-primary/20 transition-colors shadow-sm">
                    <CardContent className="p-5 md:p-6">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm md:text-base">
                                    {tenant.name.substring(0, 2)}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-black text-sm md:text-base truncate">{tenant.name}</h4>
                                    <p className="text-[9px] text-muted-foreground font-bold mt-1">
                                        {tenant.member_count} Студентов
                                    </p>
                                </div>
                            </div>
                            <Badge
                                className={cn(
                                    "text-[8px] font-black h-5 md:h-6 px-2 md:px-3 cursor-pointer border-none shrink-0",
                                    tenant.subscription_status === 'active' ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                                )}
                                onClick={() => onToggleStatus(tenant.id, tenant.subscription_status)}
                            >
                                {tenant.subscription_status}
                            </Badge>
                        </div>

                        <div className="mt-4 md:mt-6 flex items-center justify-between pt-4 border-t border-border">
                            <div className="flex flex-col min-w-0">
                                <span className="text-[9px] font-black text-muted-foreground">Владелец</span>
                                <span className="text-[11px] font-bold text-muted-foreground truncate">@{tenant.owner_username || 'anonymous'}</span>
                            </div>
                            <div className="flex flex-col items-end px-3 py-1.5 bg-primary/10 rounded-xl border border-primary/20">
                                <span className="text-[8px] font-black text-primary leading-none mb-1">Ключ</span>
                                <span className="text-[12px] font-mono font-black text-foreground select-all">{tenant.setup_code || '---'}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="ml-2 h-11 w-11 rounded-lg text-muted-foreground hover:bg-danger/5 hover:text-danger" onClick={() => onDeleteTenant(tenant)}>
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
);
