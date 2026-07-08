import { Calendar, ShieldCheck, Trophy, User, type LucideIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { cn } from '../../../lib/utils';
import type { Member } from './types';
import { getRoleLabel, isManagementRole } from './studentRoles';

interface MemberCardProps {
    member: Member;
}

interface MetricTileProps {
    className?: string;
    icon: LucideIcon;
    label: string;
    tone: 'xp' | 'level';
    value: string;
}

const formatJoinedAt = (joinedAt: string) => {
    const date = new Date(joinedAt);
    if (Number.isNaN(date.getTime())) return 'Дата неизвестна';
    return `С ${date.toLocaleDateString('ru-RU')}`;
};

const MetricTile = ({ className, icon: Icon, label, tone, value }: MetricTileProps) => (
    <div className={cn("min-w-0 p-4", className)}>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Icon className={cn("h-3.5 w-3.5", tone === 'xp' ? 'text-vip' : 'text-success')} />
            <span>{label}</span>
        </div>
        <p className="mt-2 truncate font-mono text-xl font-semibold leading-none text-foreground tabular-nums">{value}</p>
    </div>
);

export const MemberCard = ({ member }: MemberCardProps) => {
    const isManager = isManagementRole(member.role);
    const initial = member.username?.charAt(0).toUpperCase();

    return (
        <Card className="group h-full overflow-hidden rounded-xl border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] duration-150 hover:border-primary/25 hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
            <div className="flex h-full flex-col p-5 lg:p-6">
                <div className="flex min-w-0 items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3.5">
                        <Avatar className="h-14 w-14 rounded-xl border border-border bg-card shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback className="rounded-xl bg-primary/8 text-lg font-semibold text-primary">
                                {initial || <User className="h-5 w-5" />}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <h4 className="truncate text-lg font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
                                @{member.username}
                            </h4>
                            <p className="mt-1 truncate text-xs font-semibold text-muted-foreground/70">
                                ID: {member.id.substring(0, 8)}
                            </p>
                        </div>
                    </div>

                    <Badge
                        variant={isManager ? 'default' : 'secondary'}
                        className={cn(
                            "h-8 shrink-0 rounded-md px-2.5 text-xs font-medium",
                            isManager
                                ? "border border-primary/20 bg-primary/10 text-primary hover:bg-primary/10"
                                : "border border-border bg-muted text-muted-foreground",
                        )}
                    >
                        {getRoleLabel(member.role)}
                    </Badge>
                </div>

                <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-lg border border-border/70 bg-muted/30">
                    <MetricTile className="border-r border-border/70" icon={Trophy} label="Опыт" tone="xp" value={`${member.xp} XP`} />
                    <MetricTile icon={ShieldCheck} label="Уровень" tone="level" value={String(member.level)} />
                </div>

                <div className="mt-6 flex min-w-0 items-center gap-2 border-t border-border/70 pt-4 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span className="truncate text-xs font-semibold">{formatJoinedAt(member.joined_at)}</span>
                </div>
            </div>
        </Card>
    );
};
