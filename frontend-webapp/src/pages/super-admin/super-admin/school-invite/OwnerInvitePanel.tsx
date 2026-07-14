import { useState } from 'react';
import { Check, Copy, KeyRound, Loader2, RefreshCw, ShieldX } from 'lucide-react';

import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { InlineAlert } from '../../../../components/ui/inline-alert';
import { Skeleton } from '../../../../components/ui/skeleton';
import { copyTextToClipboard } from '../../../../lib/shareLinks';
import type { Tenant } from '../types';
import type { OwnerInviteStatusValue } from './types';
import { useOwnerInvite } from './useOwnerInvite';


const STATUS_LABELS: Record<OwnerInviteStatusValue, string> = {
    not_issued: 'Не выпущено',
    active: 'Ожидает владельца',
    expired: 'Истекло',
    claimed: 'Владелец подключён',
    revoked: 'Отозвано',
};

const formatDateTime = (value: string | null) => value
    ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : 'Не задан';

interface OwnerInvitePanelProps {
    tenant: Tenant | null;
}

export const OwnerInvitePanel = ({ tenant }: OwnerInvitePanelProps) => {
    const invite = useOwnerInvite(tenant?.id || null);
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle');

    if (!tenant) return null;

    if (invite.isLoading && !invite.status) {
        return (
            <section aria-label="Загрузка приглашения" className="space-y-3 rounded-2xl border border-border/80 bg-card p-5">
                <Skeleton className="h-6 w-52" />
                <Skeleton className="h-16 w-full" />
            </section>
        );
    }

    const handleCopy = async () => {
        if (!invite.secretCommand) return;
        setCopyState(await copyTextToClipboard(invite.secretCommand));
    };
    const handleRotate = async () => {
        if (await invite.rotate()) setCopyState('idle');
    };
    const handleRevoke = async () => {
        if (await invite.revoke()) setCopyState('idle');
    };
    const isClaimed = invite.status?.status === 'claimed';
    const isActive = invite.status?.status === 'active';

    return (
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Доступ владельца · {tenant.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">Приглашение в школу</h3>
                        {invite.status && <Badge variant="outline">{STATUS_LABELS[invite.status.status]}</Badge>}
                    </div>
                    {invite.status && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            Срок действия: {invite.status.expires_at
                                ? `до ${formatDateTime(invite.status.expires_at)}`
                                : 'не задан'}
                        </p>
                    )}
                </div>
                {invite.status && !isClaimed && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                        {isActive && (
                            <Button variant="outline" onClick={() => void handleRevoke()} disabled={invite.isSaving}>
                                <ShieldX aria-hidden="true" /> Отозвать
                            </Button>
                        )}
                        <Button onClick={() => void handleRotate()} disabled={invite.isSaving}>
                            {invite.isSaving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
                            {isActive ? 'Обновить код' : 'Выдать новый код'}
                        </Button>
                    </div>
                )}
            </div>

            {invite.error && (
                <div className="space-y-2">
                    <InlineAlert
                        variant="error"
                        title="Приглашение недоступно"
                        description={invite.error}
                    />
                    <Button variant="outline" onClick={() => void invite.reload()}>Повторить</Button>
                </div>
            )}

            {invite.secretCommand && (
                <div className="space-y-3 rounded-xl border border-danger/20 bg-danger/5 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium"><KeyRound className="h-4 w-4" /> Новый секретный код</div>
                    <p className="text-xs text-muted-foreground">Команда отображается только сейчас. Старые активные коды уже отозваны.</p>
                    <code className="block overflow-x-auto whitespace-pre rounded-lg bg-background px-3 py-3 font-mono text-sm">
                        {invite.secretCommand}
                    </code>
                    {copyState === 'manual' && <p className="text-xs text-danger">Скопируйте команду вручную.</p>}
                    <Button variant="outline" onClick={handleCopy}>
                        {copyState === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                        {copyState === 'copied' ? 'Скопировано' : 'Скопировать'}
                    </Button>
                </div>
            )}
        </section>
    );
};
