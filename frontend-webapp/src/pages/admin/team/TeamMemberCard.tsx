import { ShieldCheck, Trophy, User, X, type LucideIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { cn } from '../../../lib/utils';
import type { TeamMember } from './types';
import { getTeamRoleLabel } from './types';

interface TeamMemberCardProps {
    member: TeamMember;
    canManage: boolean;
    isBusy: boolean;
    onRevoke: (memberId: string) => void;
}

interface MetricTileProps {
    className?: string;
    icon: LucideIcon;
    label: string;
    tone: 'xp' | 'level';
    value: string;
}

const getInitial = (member: TeamMember) => (
    member.username?.charAt(0).toUpperCase() || String(member.telegram_id || '?').charAt(0)
);

const getDisplayName = (member: TeamMember) => (
    member.username ? `@${member.username}` : `ID ${member.telegram_id || member.user_id.slice(0, 8)}`
);

const getTelegramLabel = (member: TeamMember) => (
    member.telegram_id ? `TG: ${member.telegram_id}` : `ID: ${member.user_id.slice(0, 8)}`
);

const MetricTile = ({ className, icon: Icon, label, tone, value }: MetricTileProps) => (
    <div className={cn("min-w-0 p-4", className)}>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Icon className={cn("h-3.5 w-3.5", tone === 'xp' ? 'text-vip' : 'text-success')} />
            <span>{label}</span>
        </div>
        <p className="mt-2 truncate font-mono text-xl font-semibold leading-none text-foreground tabular-nums">{value}</p>
    </div>
);

export const TeamMemberCard = ({
    member,
    canManage,
    isBusy,
    onRevoke,
}: TeamMemberCardProps) => {
    const isOwner = member.role === 'owner';
    const canEdit = canManage && !isOwner;
    const displayName = getDisplayName(member);

    return (
        <Card className="group h-full overflow-hidden rounded-xl border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] duration-150 hover:border-primary/25 hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
            <div className="flex h-full flex-col p-5 lg:p-6">
                <div className="flex min-w-0 items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3.5">
                        <Avatar className="h-14 w-14 rounded-xl border border-border bg-card shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="rounded-xl bg-primary/8 text-lg font-semibold text-primary">
                                {getInitial(member) || <User className="h-5 w-5" />}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <h4 className="truncate text-lg font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
                                {displayName}
                            </h4>
                            <p className="mt-1 truncate text-xs font-semibold text-muted-foreground/70">
                                {getTelegramLabel(member)}
                            </p>
                        </div>
                    </div>

                    <Badge
                        variant={isOwner ? 'default' : 'secondary'}
                        className={cn(
                            "h-8 shrink-0 rounded-md px-2.5 text-xs font-medium",
                            isOwner
                                ? "border border-primary/20 bg-primary/10 text-primary hover:bg-primary/10"
                                : "border border-border bg-muted text-muted-foreground",
                        )}
                    >
                        {getTeamRoleLabel(member.role)}
                    </Badge>
                </div>

                <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-lg border border-border/70 bg-muted/30">
                    <MetricTile className="border-r border-border/70" icon={Trophy} label="Опыт" tone="xp" value={`${member.xp} XP`} />
                    <MetricTile icon={ShieldCheck} label="Уровень" tone="level" value={String(member.level)} />
                </div>

                <div className="mt-6 flex min-h-10 items-center justify-end border-t border-border/70 pt-4">
                    {isOwner ? (
                        <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
                            <ShieldCheck className="h-4 w-4" />
                            Владелец школы
                        </div>
                    ) : (
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={!canEdit || isBusy}
                            className="h-9 rounded-md px-3 text-sm text-danger hover:bg-danger/5 hover:text-danger"
                            onClick={() => onRevoke(member.id)}
                        >
                            <X size={15} />
                            Отозвать
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
};
