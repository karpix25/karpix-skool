import { RefreshCw } from 'lucide-react';

import { Button } from '../../../components/ui/button';

interface AgentRunsHeaderProps {
    loading: boolean;
    onRefresh: () => void;
}

export const AgentRunsHeader = ({ loading, onRefresh }: AgentRunsHeaderProps) => (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-5 py-4 backdrop-blur sm:px-6 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">Agentic workspace</p>
                <h1 className="mt-1 truncate text-2xl font-semibold tracking-normal text-foreground">AI drafts</h1>
            </div>
            <Button
                type="button"
                variant="secondary"
                size="icon"
                disabled={loading}
                onClick={onRefresh}
                title="Обновить"
                aria-label="Обновить"
            >
                <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </Button>
        </div>
    </header>
);
