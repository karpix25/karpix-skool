import { useEffect, useRef } from 'react';
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import type { NotebookLmAuthState } from './types';
import { getNotebookLmAuthMessage } from './notebookLmAuthStatus';

interface NotebookLmAuthModalProps {
    open: boolean;
    authState: NotebookLmAuthState | null | undefined;
    isLoading: boolean;
    isProviderSaving: boolean;
    error: string | null;
    shouldSwitchProviderAfterAuth: boolean;
    onOpenChange: (open: boolean) => void;
    onLogin: () => void;
    onRefresh: () => void;
}

export const NotebookLmAuthModal = ({
    open,
    authState,
    isLoading,
    isProviderSaving,
    error,
    shouldSwitchProviderAfterAuth,
    onOpenChange,
    onLogin,
    onRefresh,
}: NotebookLmAuthModalProps) => {
    const isAuthenticated = Boolean(authState?.authenticated);
    const isBusy = isLoading || isProviderSaving;
    const browserUrl = getEmbeddableBrowserUrl(authState?.browser_url);
    const hasBlockedBrowserUrl = Boolean(authState?.browser_url?.trim()) && !browserUrl;
    const onRefreshRef = useRef(onRefresh);

    useEffect(() => {
        onRefreshRef.current = onRefresh;
    }, [onRefresh]);

    useEffect(() => {
        if (!open) return;
        void onRefreshRef.current();
    }, [open]);

    useEffect(() => {
        if (!open || isAuthenticated || isLoading) return;
        const timer = window.setInterval(() => onRefreshRef.current(), 4000);
        return () => window.clearInterval(timer);
    }, [isAuthenticated, isLoading, open]);

    useEffect(() => {
        if (!open || !isAuthenticated || isProviderSaving) return;
        const timer = window.setTimeout(() => onOpenChange(false), 700);
        return () => window.clearTimeout(timer);
    }, [isAuthenticated, isProviderSaving, onOpenChange, open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`${browserUrl ? 'max-w-5xl' : 'max-w-md'} rounded-2xl border-border bg-card p-0 text-foreground shadow-md`}>
                <div className="p-5">
                    <DialogHeader className="space-y-2 pr-8">
                        <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Google NotebookLM
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-5 text-muted-foreground">
                            Авторизуйте Google аккаунт для генерации через NotebookLM.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-5 rounded-xl border border-border/80 bg-background p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-muted-foreground">Профиль</p>
                                <p className="mt-1 truncate text-sm font-semibold">
                                    {authState?.profile || 'default'}
                                </p>
                            </div>
                            <Badge variant={isAuthenticated ? 'default' : 'outline'}>
                                {isAuthenticated ? 'Auth OK' : authState?.status || 'checking'}
                            </Badge>
                        </div>

                        <p className="mt-3 text-sm leading-5 text-muted-foreground">
                            {getNotebookLmAuthMessage(authState)}
                        </p>

                        {shouldSwitchProviderAfterAuth && (
                            <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                                После авторизации переключу provider на Google NotebookLM.
                            </p>
                        )}

                        {error && (
                            <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
                                {error}
                            </p>
                        )}
                    </div>

                    {browserUrl ? (
                        <div className="mt-4 overflow-hidden rounded-xl border border-border/80 bg-background">
                            <iframe
                                src={browserUrl}
                                title="NotebookLM auth browser"
                                className="h-[560px] w-full border-0"
                                allow="clipboard-read; clipboard-write; fullscreen"
                            />
                        </div>
                    ) : (
                        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                            {hasBlockedBrowserUrl
                                ? 'NOTEBOOKLM_AUTH_BROWSER_URL указывает на страницу Google. Нужен URL noVNC браузера.'
                                : 'VNC браузер не настроен. Добавьте NOTEBOOKLM_AUTH_BROWSER_URL на сервере.'}
                        </p>
                    )}

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-10 rounded-lg text-sm font-semibold"
                            disabled={isBusy}
                            onClick={onRefresh}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Проверить
                        </Button>
                        <Button
                            type="button"
                            className="h-10 rounded-lg text-sm font-semibold"
                            disabled={isBusy || isAuthenticated}
                            onClick={onLogin}
                        >
                            {isAuthenticated ? (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                            ) : isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <ShieldCheck className="mr-2 h-4 w-4" />
                            )}
                            {isAuthenticated ? 'Готово' : 'Авторизовать'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const getEmbeddableBrowserUrl = (url: string | null | undefined): string | null => {
    const cleanUrl = url?.trim();
    if (!cleanUrl) return null;

    try {
        const host = new URL(cleanUrl).hostname.toLowerCase();
        if (host === 'notebooklm.google.com' || host.endsWith('.google.com')) return null;
    } catch {
        return null;
    }

    return cleanUrl;
};
