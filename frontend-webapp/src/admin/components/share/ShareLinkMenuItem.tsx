import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Link2, Loader2, TriangleAlert } from 'lucide-react';

import { DropdownMenuItem } from '../../../components/ui/dropdown-menu';
import { copyShareLinkUrl, type ShareCopyStatus } from '../../../lib/shareLinks';
import { getApiErrorMessage } from '../../../services/apiError';
import type { ShareLinkResponse } from '../../../services/deepLinks';

interface ShareLinkMenuItemProps {
    getShareLink: () => Promise<ShareLinkResponse>;
    idleLabel: string;
    logLabel: string;
    disabled?: boolean;
    disabledLabel?: string;
}

export const ShareLinkMenuItem = ({
    getShareLink,
    idleLabel,
    logLabel,
    disabled = false,
    disabledLabel = idleLabel,
}: ShareLinkMenuItemProps) => {
    const [status, setStatus] = useState<ShareCopyStatus>('idle');
    const [errorText, setErrorText] = useState<string | null>(null);
    const [manualUrl, setManualUrl] = useState<string | null>(null);
    const resetTimerRef = useRef<number | null>(null);

    useEffect(() => () => {
        if (resetTimerRef.current) {
            window.clearTimeout(resetTimerRef.current);
        }
    }, []);

    const resetStatusSoon = () => {
        if (resetTimerRef.current) {
            window.clearTimeout(resetTimerRef.current);
        }
        resetTimerRef.current = window.setTimeout(() => {
            setStatus('idle');
            setErrorText(null);
        }, 2200);
    };

    const handleCopy = async (event: Event) => {
        event.preventDefault();
        setStatus('loading');
        setErrorText(null);
        setManualUrl(null);

        try {
            const shareLink = await getShareLink();
            const copyStatus = await copyShareLinkUrl(shareLink.url);
            setStatus(copyStatus);
            if (copyStatus === 'manual') {
                setManualUrl(shareLink.url);
            }
        } catch (err) {
            console.error(`Failed to copy ${logLabel} link:`, err);
            setErrorText(getApiErrorMessage(err, 'Не удалось создать ссылку'));
            setStatus('error');
        } finally {
            resetStatusSoon();
        }
    };

    const isSuccess = status === 'copied' || status === 'manual';
    const Icon = status === 'loading'
        ? Loader2
        : isSuccess
            ? CheckCircle2
            : status === 'error'
                ? TriangleAlert
                : Link2;

    const getLabel = () => {
        if (disabled) return disabledLabel;
        if (status === 'manual') return 'Ссылка готова';
        if (status === 'copied') return 'Ссылка скопирована';
        if (status === 'error') return errorText || 'Ошибка ссылки';
        return idleLabel;
    };

    return (
        <>
            <DropdownMenuItem
                onSelect={handleCopy}
                disabled={disabled || status === 'loading'}
                className="cursor-pointer gap-3 rounded-lg py-2"
            >
                <Icon size={14} className={status === 'loading' ? 'animate-spin text-muted-foreground' : 'text-muted-foreground'} />
                <span className="font-bold text-[11px]">{getLabel()}</span>
            </DropdownMenuItem>
            {manualUrl && (
                <div
                    className="mx-1 mb-1 rounded-lg border border-primary/20 bg-primary/5 p-2"
                    onClick={(event) => event.stopPropagation()}
                >
                    <input
                        readOnly
                        value={manualUrl}
                        onFocus={(event) => event.currentTarget.select()}
                        className="h-9 w-full rounded-md border border-primary/10 bg-background/70 px-2 text-[11px] font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                </div>
            )}
        </>
    );
};
