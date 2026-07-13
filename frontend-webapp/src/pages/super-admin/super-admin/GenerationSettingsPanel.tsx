import { CheckCircle2, Database, Globe2, ShieldCheck } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import type { GenerationSettings, NotebookGenerationProvider } from './types';
import { getNotebookLmAuthMessage } from './notebookLmAuthStatus';


interface GenerationSettingsPanelProps {
    settings: GenerationSettings | null;
    isSaving: boolean;
    isAuthRefreshing: boolean;
    error: string | null;
    onProviderChange: (provider: NotebookGenerationProvider) => void;
    onAuthOpen: () => void;
}

const providerOptions: Array<{
    id: NotebookGenerationProvider;
    title: string;
    description: string;
    icon: typeof Database;
}> = [
    {
        id: 'open_notebook',
        title: 'Open Notebook',
        description: 'Локальный self-hosted обработчик',
        icon: Database,
    },
    {
        id: 'google_notebooklm',
        title: 'Google NotebookLM',
        description: 'Аккаунт Google через notebooklm-py',
        icon: Globe2,
    },
];

export const GenerationSettingsPanel = ({
    settings,
    isSaving,
    isAuthRefreshing,
    error,
    onProviderChange,
    onAuthOpen,
}: GenerationSettingsPanelProps) => {
    const activeProvider = settings?.notebook_provider || 'open_notebook';
    const googleAuth = settings?.google_notebooklm_auth;
    const isGoogleAuthenticated = Boolean(googleAuth?.authenticated);
    const isBusy = isSaving || isAuthRefreshing;

    return (
        <section className="rounded-lg border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-medium text-muted-foreground">Генерация курсов</p>
                    <h3 className="mt-1 text-xl font-semibold leading-tight">Notebook provider</h3>
                </div>
                <Badge variant={activeProvider === 'google_notebooklm' ? 'default' : 'outline'}>
                    {activeProvider === 'google_notebooklm' ? 'Google' : 'Open Notebook'}
                </Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
                {providerOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = option.id === activeProvider;
                    const showGoogleWarning = option.id === 'google_notebooklm'
                        && settings
                        && !settings.google_notebooklm_configured;

                    return (
                        <button
                            key={option.id}
                            type="button"
                            disabled={isBusy}
                            onClick={() => onProviderChange(option.id)}
                            className={cn(
                                'flex min-h-24 items-start gap-3 rounded-lg border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60',
                                isActive
                                    ? 'border-primary/40 bg-primary/10 text-foreground'
                                    : 'border-border/80 bg-background hover:bg-muted/50'
                            )}
                        >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-card">
                                <Icon size={18} />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold">{option.title}</span>
                                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                                    {option.description}
                                </span>
                                {showGoogleWarning && (
                                    <span className="mt-2 block text-xs font-medium text-danger">
                                        Нужна авторизация Google
                                    </span>
                                )}
                                {option.id === 'google_notebooklm' && googleAuth && (
                                    <span className={cn(
                                        'mt-2 inline-flex items-center gap-1 text-xs font-medium',
                                        isGoogleAuthenticated ? 'text-success' : 'text-amber-700'
                                    )}>
                                        {isGoogleAuthenticated && <CheckCircle2 size={13} />}
                                        {isGoogleAuthenticated ? 'Auth OK' : getNotebookLmAuthMessage(googleAuth)}
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Google profile: {googleAuth?.profile || settings?.google_notebooklm_profile || 'default'}</span>
                {googleAuth && <span>Статус: {googleAuth.status}</span>}
                {isSaving && <span>Сохраняю...</span>}
                {isAuthRefreshing && <span>Проверяю auth...</span>}
                {error && <span className="font-medium text-danger">{error}</span>}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg text-xs font-semibold"
                    disabled={isBusy}
                    onClick={onAuthOpen}
                >
                    <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                    Авторизовать Google
                </Button>
            </div>
        </section>
    );
};
