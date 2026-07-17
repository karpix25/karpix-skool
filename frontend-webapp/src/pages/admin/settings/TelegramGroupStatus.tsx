import type { ReactNode } from 'react';
import { Loader2, ShieldCheck, Unlink2 } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

interface TelegramGroupStatusProps {
    label: string;
    isConnected: boolean;
    isVip?: boolean;
    isDisconnecting: boolean;
    onDisconnect: () => void;
}

export const TelegramGroupStatus = ({
    label,
    isConnected,
    isVip = false,
    isDisconnecting,
    onDisconnect,
}: TelegramGroupStatusProps) => (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <ShieldCheck size={18} className={isConnected ? (isVip ? 'text-vip' : 'text-success') : 'text-muted-foreground opacity-40'} />
                <span className="text-xs font-semibold">{label}</span>
            </div>
            <Badge className={cn(
                'border-none px-2 py-0.5 text-[11px] font-medium',
                isConnected
                    ? isVip ? 'bg-vip/10 text-vip' : 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive'
            )}>
                {isConnected ? 'СВЯЗАНА' : 'НЕТ'}
            </Badge>
        </div>
        {isConnected && (
            <Button
                type="button"
                variant="outline"
                disabled={isDisconnecting}
                onClick={onDisconnect}
                className="h-10 w-full rounded-lg border-destructive/20 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
                {isDisconnecting ? <Loader2 className="animate-spin" size={14} /> : <Unlink2 size={14} />}
                Отвязать
            </Button>
        )}
    </div>
);

const Badge = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        className
    )}>
        {children}
    </div>
);
