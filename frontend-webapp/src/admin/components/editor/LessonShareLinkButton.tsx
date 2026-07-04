import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, Loader2, TriangleAlert } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { getApiErrorMessage } from '../../../services/apiError';
import { getLessonShareLink } from '../../../services/deepLinks';


type CopyStatus = 'idle' | 'loading' | 'copied' | 'manual' | 'error';

interface LessonShareLinkButtonProps {
    lessonId?: string;
    disabled?: boolean;
}

const copyLessonUrl = async (url: string) => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return 'copied' as const;
    }

    window.prompt('Скопируйте ссылку на урок', url);
    return 'manual' as const;
};

const statusLabel: Record<CopyStatus, string> = {
    idle: 'Ссылка',
    loading: 'Готовлю',
    copied: 'Скопировано',
    manual: 'Ссылка готова',
    error: 'Ошибка',
};

export const LessonShareLinkButton = ({ lessonId, disabled }: LessonShareLinkButtonProps) => {
    const [status, setStatus] = useState<CopyStatus>('idle');
    const [errorText, setErrorText] = useState<string | null>(null);
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

        try {
            const shareLink = await getLessonShareLink(lessonId);
            setStatus(await copyLessonUrl(shareLink.url));
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
        <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || status === 'loading'}
            onClick={handleCopy}
            title={errorText || 'Скопировать ссылку на урок'}
            aria-label={errorText || 'Скопировать ссылку на урок'}
            className="max-sm:w-11 max-sm:px-0"
        >
            <Icon className={status === 'loading' ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{statusLabel[status]}</span>
        </Button>
    );
};

export default LessonShareLinkButton;
