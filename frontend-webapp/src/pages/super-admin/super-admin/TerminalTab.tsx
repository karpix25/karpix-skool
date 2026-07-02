import { Activity, Building2, Clock3, UserPlus, Users } from 'lucide-react';

import { cn } from '../../../lib/utils';
import type { AppUser, FeedItem, Tenant } from './types';

interface TerminalTabProps {
    tenants: Tenant[];
    users: AppUser[];
    feed: FeedItem[];
    time: string;
}

const activityTone: Record<FeedItem['type'], string> = {
    SUCCESS: 'bg-success/10 text-success border-success/20',
    MILESTONE: 'bg-primary/10 text-primary border-primary/20',
    ALERT: 'bg-danger/10 text-danger border-danger/20',
    SYSTEM: 'bg-muted text-muted-foreground border-border',
};

export const TerminalTab = ({ tenants, users, feed, time }: TerminalTabProps) => {
    const studentsCount = tenants.reduce((acc, tenant) => acc + tenant.member_count, 0);
    const pendingCount = users.filter((user) => user.admin_status === 'pending').length;
    const activeSchools = tenants.filter((tenant) => tenant.subscription_status === 'active').length;

    const stats = [
        { label: 'Ученики', value: studentsCount, detail: 'во всех школах', icon: Users },
        { label: 'Школы', value: tenants.length, detail: `${activeSchools} активных`, icon: Building2 },
        { label: 'Заявки', value: pendingCount, detail: 'на проверке', icon: UserPlus },
    ];

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">Обзор платформы</p>
                        <h2 className="mt-1 text-2xl font-semibold leading-tight">Система</h2>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-success/20 bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success">
                        <Activity className="h-3.5 w-3.5" />
                        99.9%
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {stats.map((stat) => (
                        <div key={stat.label} className="min-w-0 rounded-xl border border-border/70 bg-background/65 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-medium text-muted-foreground">{stat.label}</span>
                                <stat.icon className="h-4 w-4 shrink-0 text-primary" />
                            </div>
                            <p className="font-mono text-xl font-semibold leading-none">{stat.value}</p>
                            <p className="mt-1 truncate text-[11px] text-muted-foreground">{stat.detail}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                    <div>
                        <h3 className="text-base font-semibold">Последние события</h3>
                        <p className="text-xs text-muted-foreground">Системные изменения и модерация</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        {time.split(' ')[0].slice(0, 5)}
                    </span>
                </div>

                <div className="divide-y divide-border/70">
                    {feed.map((item) => (
                        <article key={item.id} className="flex gap-3 px-4 py-3">
                            <span className={cn('mt-0.5 inline-flex h-7 min-w-16 items-center justify-center rounded-lg border px-2 font-mono text-[11px] font-semibold', activityTone[item.type])}>
                                {item.type}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="break-words text-sm leading-5 text-foreground">
                                    {item.message}
                                    {item.meta && <span className="break-all font-semibold text-primary">{item.meta}</span>}
                                    {item.message_end}
                                </p>
                                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{item.time.slice(0, 5)}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
};
