import { ShieldCheck, User, X } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { cn } from '../../../lib/utils';
import type { TeamMember } from './types';
import { getTeamRoleLabel } from './types';

interface TeamMemberCardProps {
    member: TeamMember;
    canManage: boolean;
    isBusy: boolean;
    onRevoke: (memberId: string) => void;
}

const getInitial = (member: TeamMember) => (
    member.username?.charAt(0).toUpperCase() || String(member.telegram_id || '?').charAt(0)
);

export const TeamMemberCard = ({
    member,
    canManage,
    isBusy,
    onRevoke,
}: TeamMemberCardProps) => {
    const isOwner = member.role === 'owner';
    const canEdit = canManage && !isOwner;
    const displayName = member.username ? `@${member.username}` : `ID ${member.telegram_id || member.user_id.slice(0, 8)}`;

    return (
        <Card className="rounded-lg border border-border bg-card shadow-sm">
            <CardContent className="space-y-4 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-11 w-11 shrink-0 rounded-lg border border-border">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                                {getInitial(member) || <User size={18} />}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold leading-tight">{displayName}</h3>
                            <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                                TG: {member.telegram_id || 'не указан'}
                            </p>
                        </div>
                    </div>
                    <Badge
                        className={cn(
                            "h-7 shrink-0 rounded-md border px-2 text-[11px] font-medium",
                            isOwner ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"
                        )}
                    >
                        {getTeamRoleLabel(member.role)}
                    </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                        <p className="text-[10px] font-medium text-muted-foreground">Уровень</p>
                        <p className="mt-1 text-lg font-semibold">{member.level}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                        <p className="text-[10px] font-medium text-muted-foreground">Опыт</p>
                        <p className="mt-1 text-lg font-semibold">{member.xp} XP</p>
                    </div>
                </div>

                {isOwner ? (
                    <div className="flex min-h-11 items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 text-xs font-medium text-primary">
                        <ShieldCheck size={16} />
                        Владелец школы
                    </div>
                ) : (
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={!canEdit || isBusy}
                            className="h-11 rounded-lg px-3 text-danger hover:bg-danger/5 hover:text-danger"
                            onClick={() => onRevoke(member.id)}
                        >
                            <X size={16} />
                            Отозвать
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
