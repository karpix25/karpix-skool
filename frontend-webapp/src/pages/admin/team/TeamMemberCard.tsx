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

const getDisplayName = (member: TeamMember) => (
    member.username ? `@${member.username}` : `ID ${member.telegram_id || member.user_id.slice(0, 8)}`
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
        <Card className="rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="p-4">
                <div className="flex min-w-0 items-start gap-3">
                    <Avatar className="h-12 w-12 shrink-0 rounded-lg border border-border">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                            {getInitial(member) || <User size={18} />}
                        </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="truncate text-base font-semibold leading-tight text-foreground">{displayName}</h3>
                                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                                    TG: {member.telegram_id || 'не указан'}
                                </p>
                            </div>
                            <Badge
                                className={cn(
                                    "h-7 shrink-0 rounded-md border px-2.5 text-[11px] font-medium",
                                    isOwner ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"
                                )}
                            >
                                {getTeamRoleLabel(member.role)}
                            </Badge>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                            <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
                                <span className="text-muted-foreground">Уровень</span>
                                <span className="ml-2 font-semibold text-foreground">{member.level}</span>
                            </div>
                            <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
                                <span className="text-muted-foreground">Опыт</span>
                                <span className="ml-2 font-semibold text-foreground">{member.xp} XP</span>
                            </div>
                        </div>

                        {isOwner ? (
                            <div className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border border-primary/15 bg-primary/5 px-3 text-xs font-medium text-primary">
                                <ShieldCheck size={15} />
                                Владелец школы
                            </div>
                        ) : (
                            <div className="mt-4 flex justify-end border-t border-border/70 pt-3">
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
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
