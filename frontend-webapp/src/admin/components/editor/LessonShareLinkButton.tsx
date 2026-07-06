import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, Loader2, TriangleAlert } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '../../../components/ui/dialog';
import { copyShareLinkUrl, shareLinkStatusLabel, type ShareCopyStatus } from '../../../lib/shareLinks';
import { cn } from '../../../lib/utils';
import { getApiErrorMessage } from '../../../services/apiError';
import { getLessonShareLink } from '../../../services/deepLinks';


interface LessonShareLinkButtonProps {
    lessonId?: string;
    disabled?: boolean;
    compact?: boolean;
    className?: string;
}

export const LessonShareLinkButton = ({ lessonId, disabled, compact = false, className }: LessonShareLinkButtonProps) => {
    const [status, setStatus] = useState<ShareCopyStatus>('idle');
    const [errorText, setErrorText] = useState<string | null>(null);
    const [manualUrl, setManualUrl] = useState<string | null>(null);
    const resetTimerRef = useRef<number | null>(null);

    useEffect(() => () => {
        if (resetTimerRef.current) {
            window.clearTimeout(resetTimerRef.current);
        }
    }, []);

    if (!lessonId || lessonId === 'new') return null;

    const resetStatusSoon = () => {
        if (resetTimerRef.current) {
            window.clearTimeout(resetTimerRef.current);
        }
        resetTimerRef.current = window.setTimeout(() => {
            setStatus('idle');
            setErrorText(null);
        }, 2200);
    };

    const handleCopy = async () => {
        setStatus('loading');
        setErrorText(null);
        setManualUrl(null);

        try {
            const shareLink = await getLessonShareLink(lessonId);
            const copyStatus = await copyShareLinkUrl(shareLink.url);
            setStatus(copyStatus);
            if (copyStatus === 'manual') {
                setManualUrl(shareLink.url);
            }
        } catch (err) {
            console.error('Failed to copy lesson link:', err);
            setErrorText(getApiErrorMessage(err, 'Не удалось создать ссылку'));
            setStatus('error');
        } finally {
            resetStatusSoon();
        }
    };

    const Icon = status === 'loading'
        ? Loader2
        : status === 'copied' || status === 'manual'
            ? CheckCircle2
            : status === 'error'
                ? TriangleAlert
                : Copy;

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || status === 'loading'}
                onClick={(event) => {
                    event.stopPropagation();
                    void handleCopy();
                }}
                title={errorText || 'Скопировать ссылку для соцсетей'}
                aria-label={errorText || 'Скопировать ссылку для соцсетей'}
                className={cn(compact ? 'h-11 w-11 px-0' : 'max-sm:w-11 max-sm:px-0', className)}
            >
                <Icon className={status === 'loading' ? 'animate-spin' : ''} />
                <span className={compact ? 'sr-only' : 'hidden sm:inline'}>{shareLinkStatusLabel[status]}</span>
            </Button>

            <Dialog open={Boolean(manualUrl)} onOpenChange={(open) => !open && setManualUrl(null)}>
                <DialogContent className="max-w-md overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-md">
                    <div className="space-y-4 p-5 pr-12">
                        <DialogTitle className="text-base font-semibold">Ссылка для соцсетей</DialogTitle>
                        <input
                            readOnly
                            value={manualUrl || ''}
                            onFocus={(event) => event.currentTarget.select()}
                            className="h-11 w-full rounded-lg border border-border bg-muted/30 px-3 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default LessonShareLinkButton;
