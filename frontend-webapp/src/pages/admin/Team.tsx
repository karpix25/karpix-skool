import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Users } from 'lucide-react';

import { InlineAlert } from '../../components/ui/inline-alert';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../services/apiError';
import { addTeamMember, fetchTeamMembers, revokeTeamMemberRole, updateTeamMemberRole } from './team/teamApi';
import { TeamInviteForm } from './team/TeamInviteForm';
import { TeamMemberCard } from './team/TeamMemberCard';
import type { AssignableTeamRole, TeamMember } from './team/types';

const getActiveTenantId = (
    activeTenantId: string | null,
    tenantId?: string | null,
    membershipTenantId?: string | null,
) => activeTenantId || tenantId || membershipTenantId || null;

export const Team: React.FC = () => {
    const { activeTenantId, tenant, membership, isSuperAdmin } = useAuth();
    const tenantId = getActiveTenantId(activeTenantId, tenant?.id, membership?.tenant_id);
    const canManageTeam = isSuperAdmin || membership?.role === 'owner';

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [identifier, setIdentifier] = useState('');
    const [role, setRole] = useState<AssignableTeamRole>('admin');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const managersCount = useMemo(
        () => members.filter((member) => member.role === 'admin').length,
        [members],
    );

    const loadTeam = useCallback(async () => {
        if (!tenantId) return;
        setIsLoading(true);
        setError(null);
        try {
            setMembers(await fetchTeamMembers(tenantId));
        } catch (err) {
            setError(getApiErrorMessage(err, 'Не удалось загрузить команду'));
        } finally {
            setIsLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        void loadTeam();
    }, [loadTeam]);

    const upsertMember = (nextMember: TeamMember) => {
        setMembers((current) => {
            const visible = nextMember.role !== 'student';
            const exists = current.some((member) => member.id === nextMember.id);
            if (!visible) return current.filter((member) => member.id !== nextMember.id);
            if (!exists) return [...current, nextMember];
            return current.map((member) => member.id === nextMember.id ? nextMember : member);
        });
    };

    const handleAdd = async () => {
        if (!tenantId || !identifier.trim()) return;
        setIsSaving(true);
        setError(null);
        setNotice(null);
        try {
            const member = await addTeamMember(tenantId, identifier.trim(), role);
            upsertMember(member);
            setIdentifier('');
            setNotice('Менеджер добавлен');
        } catch (err) {
            setError(getApiErrorMessage(err, 'Не удалось добавить менеджера'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleRoleChange = async (memberId: string, nextRole: AssignableTeamRole) => {
        if (!tenantId) return;
        setBusyMemberId(memberId);
        setError(null);
        setNotice(null);
        try {
            upsertMember(await updateTeamMemberRole(tenantId, memberId, nextRole));
            setNotice('Роль обновлена');
        } catch (err) {
            setError(getApiErrorMessage(err, 'Не удалось изменить роль'));
        } finally {
            setBusyMemberId(null);
        }
    };

    const handleRevoke = async (memberId: string) => {
        if (!tenantId) return;
        setBusyMemberId(memberId);
        setError(null);
        setNotice(null);
        try {
            upsertMember(await revokeTeamMemberRole(tenantId, memberId));
            setNotice('Доступ отозван');
        } catch (err) {
            setError(getApiErrorMessage(err, 'Не удалось отозвать доступ'));
        } finally {
            setBusyMemberId(null);
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-5 p-5 pb-24 sm:p-6 md:p-10 md:pb-12">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Роли школы</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-normal text-foreground md:text-3xl">Команда</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Владелец и админы выбранной школы.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:min-w-64">
                    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
                        <p className="text-[10px] font-medium text-muted-foreground">Команда</p>
                        <p className="mt-1 text-2xl font-semibold">{members.length}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
                        <p className="text-[10px] font-medium text-muted-foreground">Менеджеры</p>
                        <p className="mt-1 text-2xl font-semibold text-primary">{managersCount}</p>
                    </div>
                </div>
            </header>

            {!canManageTeam && (
                <InlineAlert
                    variant="info"
                    title="Управление ролями доступно владельцу школы"
                    description="Вы можете видеть команду, но добавление и отзыв ролей ограничены."
                />
            )}
            {error && <InlineAlert variant="error" title={error} onDismiss={() => setError(null)} />}
            {notice && <InlineAlert variant="success" title={notice} onDismiss={() => setNotice(null)} />}

            <TeamInviteForm
                identifier={identifier}
                role={role}
                isSaving={isSaving}
                canManage={canManageTeam}
                onIdentifierChange={setIdentifier}
                onRoleChange={setRole}
                onSubmit={handleAdd}
            />

            <section className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Состав команды</h2>
                </div>

                {isLoading ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="rounded-lg border border-border bg-card p-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-11 w-11 rounded-lg" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                                <Skeleton className="mt-4 h-16 w-full rounded-lg" />
                            </div>
                        ))}
                    </div>
                ) : members.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {members.map((member) => (
                            <TeamMemberCard
                                key={member.id}
                                member={member}
                                canManage={canManageTeam}
                                isBusy={busyMemberId === member.id}
                                onRoleChange={handleRoleChange}
                                onRevoke={handleRevoke}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-8 text-center">
                        <Users className="h-10 w-10 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Команда пуста</h3>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                            После добавления менеджеры появятся здесь.
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
};
