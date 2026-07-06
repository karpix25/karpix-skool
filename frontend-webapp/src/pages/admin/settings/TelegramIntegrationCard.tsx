import { useState } from 'react';
import { Bot, CheckCircle2, RefreshCw } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { copyTextToClipboard } from '../../../lib/shareLinks';
import { cn } from '../../../lib/utils';
import { createTenantSetupToken, type SetupTokenScope } from '../../../services/setupTokens';
import {
    disconnectTenantTelegramGroup,
    syncTenantAdmins,
    type TelegramGroupScope,
} from '../../../services/tenants';
import type { AdminTenant } from '../../../types/admin';
import { TelegramGroupStatus } from './TelegramGroupStatus';
import { TelegramSetupCommandBlock, type SetupTokenType } from './TelegramSetupCommandBlock';

interface TelegramIntegrationCardProps {
    tenant: AdminTenant;
    onTenantChange: (tenant: AdminTenant) => void;
}

export const TelegramIntegrationCard = ({ tenant, onTenantChange }: TelegramIntegrationCardProps) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [creatingTokenType, setCreatingTokenType] = useState<SetupTokenType | null>(null);
    const [disconnectingScope, setDisconnectingScope] = useState<TelegramGroupScope | null>(null);
    const [manualSetupCommand, setManualSetupCommand] = useState<{ type: SetupTokenType; command: string } | null>(null);
    const [copiedRegular, setCopiedRegular] = useState(false);
    const [copiedVip, setCopiedVip] = useState(false);
    const [syncResult, setSyncResult] = useState<{ total: number; promoted: string[] } | null>(null);

    const copySetupCommand = async (scope: SetupTokenScope, type: SetupTokenType) => {
        setCreatingTokenType(type);
        try {
            const issue = await createTenantSetupToken(tenant.id, scope);
            const copyStatus = await copyTextToClipboard(issue.setup_command);

            if (copyStatus === 'manual') {
                setManualSetupCommand({ type, command: issue.setup_command });
                return;
            }

            setManualSetupCommand(null);
            if (type === 'regular') {
                setCopiedRegular(true);
                window.setTimeout(() => setCopiedRegular(false), 2000);
            } else {
                setCopiedVip(true);
                window.setTimeout(() => setCopiedVip(false), 2000);
            }
        } catch (err) {
            console.error('Failed to create setup token:', err);
        } finally {
            setCreatingTokenType(null);
        }
    };

    const handleDisconnect = async (scope: TelegramGroupScope) => {
        const label = scope === 'vip' ? 'VIP группу' : 'обычную группу';
        if (!window.confirm(`Отвязать ${label}? Для новой привязки нужно будет создать свежую /setup команду.`)) return;

        setDisconnectingScope(scope);
        setManualSetupCommand(null);
        try {
            const updatedTenant = await disconnectTenantTelegramGroup(tenant.id, scope);
            onTenantChange(updatedTenant);
        } catch (err) {
            console.error('Failed to disconnect Telegram group:', err);
        } finally {
            setDisconnectingScope(null);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncResult(null);
        try {
            const result = await syncTenantAdmins(tenant.id);
            setSyncResult({
                total: result.total_admins,
                promoted: result.promoted,
            });
        } catch (err) {
            console.error('Sync failed:', err);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <Card className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <Bot size={20} />
                    </div>
                    <CardTitle className="text-lg">Интеграция с Telegram</CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                    Свяжите вашего бота с группами в Telegram через коды активации.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TelegramGroupStatus
                        label="Обычная группа"
                        isConnected={Boolean(tenant.telegram_group_id)}
                        isDisconnecting={disconnectingScope === 'regular'}
                        onDisconnect={() => handleDisconnect('regular')}
                    />
                    <TelegramGroupStatus
                        label="VIP группа"
                        isConnected={Boolean(tenant.telegram_group_id_vip)}
                        isVip
                        isDisconnecting={disconnectingScope === 'vip'}
                        onDisconnect={() => handleDisconnect('vip')}
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <TelegramSetupCommandBlock
                        type="regular"
                        title="Команда для обычной группы"
                        sample="/setup •••••••"
                        manualCommand={manualSetupCommand?.type === 'regular' ? manualSetupCommand.command : null}
                        copied={copiedRegular}
                        isCreating={creatingTokenType === 'regular'}
                        disabled={creatingTokenType !== null}
                        onCreate={() => copySetupCommand('free_group_link', 'regular')}
                    />
                    <TelegramSetupCommandBlock
                        type="vip"
                        title="Команда для VIP группы"
                        sample="/setup ••••••• vip"
                        manualCommand={manualSetupCommand?.type === 'vip' ? manualSetupCommand.command : null}
                        copied={copiedVip}
                        isCreating={creatingTokenType === 'vip'}
                        disabled={creatingTokenType !== null}
                        onCreate={() => copySetupCommand('vip_group_link', 'vip')}
                    />
                </div>

                <AdminSyncBlock
                    tenant={tenant}
                    isSyncing={isSyncing}
                    syncResult={syncResult}
                    onSync={handleSync}
                />
            </CardContent>
        </Card>
    );
};

interface AdminSyncBlockProps {
    tenant: AdminTenant;
    isSyncing: boolean;
    syncResult: { total: number; promoted: string[] } | null;
    onSync: () => void;
}

const AdminSyncBlock = ({ tenant, isSyncing, syncResult, onSync }: AdminSyncBlockProps) => (
    <div className="pt-4">
        <Button
            onClick={onSync}
            disabled={isSyncing || (!tenant.telegram_group_id && !tenant.telegram_group_id_vip)}
            variant="outline"
            className="h-12 w-full rounded-lg border-primary/20 font-bold shadow-sm transition-all hover:bg-primary/5 hover:text-primary"
        >
            <RefreshCw size={18} className={cn(isSyncing && 'animate-spin')} />
            Синхронизировать администраторов
        </Button>

        {syncResult && (
            <div className="mt-4 animate-in slide-in-from-top-2 rounded-lg border border-primary/10 bg-primary/5 p-4 duration-300 fade-in">
                <div className="mb-2 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-success" />
                    <p className="text-xs font-bold">Синхронизация завершена</p>
                </div>
                <p className="mb-2 text-[11px] text-muted-foreground italic">
                    Всего найдено администраторов в Telegram: <span className="font-bold text-foreground">{syncResult.total}</span>
                </p>
                {syncResult.promoted.length > 0 ? (
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Новые админы ({syncResult.promoted.length}):</p>
                        <div className="flex flex-wrap gap-1.5">
                            {syncResult.promoted.map((name, index) => (
                                <span key={`${name}-${index}`} className="rounded-md border border-success/20 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                                    @{name}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">Все администраторы уже были синхронизированы.</p>
                )}
            </div>
        )}
    </div>
);
