import { ShieldCheck, Users, type LucideIcon } from 'lucide-react';

import { Card } from '../../../components/ui/card';
import { cn } from '../../../lib/utils';

interface StudentsStatsProps {
    admins: number;
    total: number;
}

interface StatItem {
    icon: LucideIcon;
    label: string;
    tone: 'default' | 'primary';
    value: number;
}

const StatCard = ({ icon: Icon, label, tone, value }: StatItem) => (
    <Card className="rounded-xl border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="p-5 lg:p-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Icon className={cn("h-4 w-4", tone === 'primary' ? 'text-primary' : 'text-muted-foreground')} />
                <span>{label}</span>
            </div>
            <p className={cn("mt-3 text-3xl font-semibold leading-none", tone === 'primary' ? 'text-primary' : 'text-foreground')}>
                {value}
            </p>
        </div>
    </Card>
);

export const StudentsStats = ({ admins, total }: StudentsStatsProps) => {
    const stats: StatItem[] = [
        { icon: Users, label: 'Всего участников', tone: 'default', value: total },
        { icon: ShieldCheck, label: 'Админы', tone: 'primary', value: admins },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
            {stats.map(stat => (
                <StatCard key={stat.label} {...stat} />
            ))}
        </div>
    );
};
