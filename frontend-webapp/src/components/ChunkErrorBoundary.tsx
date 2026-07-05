import React from 'react';

import {
    getErrorMessage,
    isChunkLoadError,
    recoverFromChunkLoadError,
} from '../services/chunkRecovery';

interface ChunkErrorBoundaryProps {
    children: React.ReactNode;
}

interface ChunkErrorBoundaryState {
    error: unknown;
}

export class ChunkErrorBoundary extends React.Component<
    ChunkErrorBoundaryProps,
    ChunkErrorBoundaryState
> {
    state: ChunkErrorBoundaryState = {
        error: null,
    };

    static getDerivedStateFromError(error: unknown): ChunkErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: unknown, info: React.ErrorInfo) {
        if (recoverFromChunkLoadError(error)) return;
        console.error('Unhandled app render error:', error, info);
    }

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;

        const message = getErrorMessage(error);
        const isChunkError = isChunkLoadError(error);

        return (
            <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-foreground">
                <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 text-center shadow-sm">
                    <p className="text-base font-semibold">
                        {isChunkError ? 'Обновляем приложение' : 'Не удалось открыть экран'}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {isChunkError
                            ? 'После обновления версии Telegram Mini App нужно перезагрузить экран.'
                            : message || 'Попробуйте открыть экран ещё раз.'}
                    </p>
                    <button
                        type="button"
                        className="mt-4 h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px"
                        onClick={() => window.location.reload()}
                    >
                        Обновить
                    </button>
                </div>
            </div>
        );
    }
}
