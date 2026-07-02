import { useEffect, useState, type ReactNode } from 'react';
import { Building2, Loader2, ShieldAlert } from 'lucide-react';

import api from '../../../api/client';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { InlineAlert } from '../../../components/ui/inline-alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../../components/ui/select';
import { useAuth } from '../../../context/AuthContext';
import { getApiErrorMessage } from '../../../services/apiError';
import type { Tenant } from './types';

interface TenantContextGateProps {
    children: ReactNode;
    title?: string;
}

export const TenantContextGate = ({ children, title = 'Школьный раздел' }: TenantContextGateProps) => {
    const { activeTenantId, isPlatformAdmin, setActiveTenantId } = useAuth();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isPlatformAdmin) return;

        let isMounted = true;
        api.get<Tenant[]>('/super/tenants')
            .then((res) => {
                if (!isMounted) return;
                setTenants(res.data);
                setError(null);
            })
            .catch((err) => {
                if (!isMounted) return;
                setError(getApiErrorMessage(err, 'Не удалось загрузить школы.'));
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [isPlatformAdmin]);

    const selectedTenant = tenants.find((tenant) => tenant.id === activeTenantId) || null;

    useEffect(() => {
        if (!isLoading && activeTenantId && !selectedTenant) {
            setActiveTenantId(null);
        }
    }, [activeTenantId, isLoading, selectedTenant, setActiveTenantId]);

    if (!isPlatformAdmin || selectedTenant) {
        return <>{children}</>;
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="flex min-h-dvh items-center justify-center bg-background p-5">
            <Card className="w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ShieldAlert size={20} />
                    </div>
                    <div className="min-w-0 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Super Admin</p>
                        <h1 className="text-xl font-semibold leading-tight">{title}</h1>
                        <p className="text-sm leading-6 text-muted-foreground">
                            Сначала выберите активную школу. Так школьные разделы не откроются на случайном tenant.
                        </p>
                    </div>
                </div>

                {error && (
                    <InlineAlert className="mt-4" variant="error" title="Школы не загружены" description={error} />
                )}

                <div className="mt-5 space-y-3">
                    <Select value={activeTenantId || ''} onValueChange={setActiveTenantId}>
                        <SelectTrigger className="h-12 rounded-lg border border-border bg-background text-sm">
                            <SelectValue placeholder="Выбрать школу" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg border-border shadow-md">
                            {tenants.map((tenant) => (
                                <SelectItem key={tenant.id} value={tenant.id} className="text-sm">
                                    {tenant.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {tenants.length === 0 && !error && (
                        <p className="text-xs leading-5 text-muted-foreground">Школ пока нет.</p>
                    )}

                    {tenants.slice(0, 3).map((tenant) => (
                        <Button
                            key={tenant.id}
                            type="button"
                            variant="outline"
                            className="h-11 w-full justify-start rounded-lg text-sm"
                            onClick={() => setActiveTenantId(tenant.id)}
                        >
                            <Building2 size={16} />
                            <span className="truncate">{tenant.name}</span>
                        </Button>
                    ))}
                </div>
            </Card>
        </div>
    );
};
