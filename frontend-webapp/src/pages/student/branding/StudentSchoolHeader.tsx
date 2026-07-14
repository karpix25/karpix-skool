import { useState } from 'react';
import { ExternalLink, School } from 'lucide-react';

import { useAuth } from '../../../context/AuthContext';

export const StudentSchoolHeader = () => {
    const { tenant } = useAuth();
    const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);

    if (!tenant) return null;

    return (
        <header className="border-b border-border/70 bg-card/90 px-4 py-3 backdrop-blur min-[380px]:px-5">
            <div className="mx-auto flex max-w-[68rem] items-center gap-3">
                {tenant.logo_url && failedLogoUrl !== tenant.logo_url ? (
                    <img
                        src={tenant.logo_url}
                        alt={`Логотип школы ${tenant.name || ''}`.trim()}
                        className="h-11 w-11 shrink-0 rounded-lg border border-border bg-card object-contain"
                        onError={() => setFailedLogoUrl(tenant.logo_url || null)}
                    />
                ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary" aria-hidden="true">
                        <School size={20} />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{tenant.name || 'Школа'}</p>
                    {tenant.description && <p className="line-clamp-1 text-xs text-muted-foreground">{tenant.description}</p>}
                </div>
                {tenant.support_url && (
                    <a
                        href={tenant.support_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Открыть поддержку школы"
                        className="inline-flex h-11 shrink-0 items-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground"
                    >
                        Помощь <ExternalLink className="ml-1.5 h-4 w-4" aria-hidden="true" />
                    </a>
                )}
            </div>
        </header>
    );
};
