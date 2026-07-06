import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, Loader2, TriangleAlert } from 'lucide-react';

import { DropdownMenuItem } from '../../../components/ui/dropdown-menu';
import { copyShareLinkUrl, type ShareCopyStatus } from '../../../lib/shareLinks';
import { getApiErrorMessage } from '../../../services/apiError';
import { getModuleShareLink } from '../../../services/deepLinks';

interface ModuleShareLinkMenuItemProps {
    moduleId: string;
}

export const ModuleShareLinkMenuItem = ({ moduleId }: ModuleShareLinkMenuItemProps) => {
    const [status, setStatus] = useState<ShareCopyStatus>('idle');
    const [errorText, setErrorText] = useState<string | null>(null);
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

        try {
            const shareLink = await getModuleShareLink(moduleId);
            setStatus(await copyShareLinkUrl(shareLink.url, 'Скопируйте ссылку на модуль'));
        } catch (err) {
            console.error('Failed to copy module link:', err);
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

    const label = status === 'copied' || status === 'manual'
        ? 'Ссылка скопирована'
        : status === 'error'
            ? errorText || 'Ошибка ссылки'
            : 'Скопировать ссылку';

    return (
        <DropdownMenuItem
            onSelect={handleCopy}
            disabled={status === 'loading'}
            className="cursor-pointer gap-3 rounded-lg py-2"
        >
            <Icon size={14} className={status === 'loading' ? 'animate-spin text-muted-foreground' : 'text-muted-foreground'} />
            <span className="font-bold text-[11px]">{label}</span>
        </DropdownMenuItem>
    );
};
