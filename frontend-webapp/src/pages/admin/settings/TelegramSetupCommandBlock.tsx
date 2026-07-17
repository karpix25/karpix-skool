import { CheckCircle2, Copy, Loader2 } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

export type SetupTokenType = 'regular' | 'vip';

interface TelegramSetupCommandBlockProps {
    type: SetupTokenType;
    title: string;
    sample: string;
    manualCommand: string | null;
    copied: boolean;
    isCreating: boolean;
    disabled: boolean;
    onCreate: () => void;
}

export const TelegramSetupCommandBlock = ({
    type,
    title,
    sample,
    manualCommand,
    copied,
    isCreating,
    disabled,
    onCreate,
}: TelegramSetupCommandBlockProps) => {
    const isVip = type === 'vip';
    return (
        <div className="space-y-4 rounded-lg border border-border/60 bg-muted/30 p-5">
            <p className="px-1 text-xs font-medium text-muted-foreground">{title}</p>
            <div>
                <code className={cn(
                    'block break-all rounded-lg border bg-background/50 p-3 text-[11px] font-black',
                    isVip ? 'border-vip/20 text-vip' : 'border-primary/10 text-primary'
                )}>
                    {sample}
                </code>
                <p className="mt-2 px-1 text-[11px] leading-5 text-muted-foreground">
                    Одноразовая команда создаётся при копировании и действует 7 дней.
                </p>
            </div>
            <Button
                variant="outline"
                className={cn(
                    'h-11 w-full rounded-lg text-xs font-semibold shadow-sm',
                    isVip
                        ? 'border-vip/25 text-vip hover:bg-vip/10'
                        : 'border-primary/10 hover:bg-primary/5'
                )}
                disabled={disabled}
                onClick={onCreate}
            >
                {isCreating ? <Loader2 className="animate-spin" size={14} /> : copied ? <CheckCircle2 size={14} className="text-success" /> : <Copy size={14} />}
                Создать и скопировать
            </Button>
            {manualCommand && (
                <div className={cn(
                    'rounded-lg border p-3',
                    isVip ? 'border-vip/25 bg-vip/10' : 'border-primary/20 bg-primary/5'
                )}>
                    <input
                        readOnly
                        value={manualCommand}
                        onFocus={(event) => event.currentTarget.select()}
                        className={cn(
                            'h-10 w-full rounded-md bg-background/70 px-2 text-[11px] font-bold outline-none focus-visible:ring-2',
                            isVip ? 'text-vip focus-visible:ring-vip/25' : 'text-primary focus-visible:ring-primary/20'
                        )}
                    />
                </div>
            )}
        </div>
    );
};
