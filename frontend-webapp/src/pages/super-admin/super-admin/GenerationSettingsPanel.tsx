import { Database, Globe2 } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { cn } from '../../../lib/utils';
import type { GenerationSettings, NotebookGenerationProvider } from './types';


interface GenerationSettingsPanelProps {
    settings: GenerationSettings | null;
    isSaving: boolean;
    error: string | null;
    onProviderChange: (provider: NotebookGenerationProvider) => void;
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
    error,
    onProviderChange,
}: GenerationSettingsPanelProps) => {
    const activeProvider = settings?.notebook_provider || 'open_notebook';

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
                            disabled={isSaving}
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
                                        Нужна настройка backend
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Google profile: {settings?.google_notebooklm_profile || 'default'}</span>
                {isSaving && <span>Сохраняю...</span>}
                {error && <span className="font-medium text-danger">{error}</span>}
            </div>
        </section>
    );
};
