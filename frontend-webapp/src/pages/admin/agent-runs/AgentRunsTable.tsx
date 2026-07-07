import { Eye } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../../components/ui/table';
import {
    countArtifacts,
    formatDateTime,
    getCourseTitle,
    getNotebookJobArtifact,
} from './agentRunDisplay';
import { AgentRunActions } from './AgentRunActions';
import { AgentRunStatusBadge } from './AgentRunStatusBadge';
import type { AgentRun, AgentRunAction } from './types';

interface AgentRunsTableProps {
    loading: boolean;
    pendingAction: string | null;
    runs: AgentRun[];
    onAction: (run: AgentRun, action: AgentRunAction) => void;
    onOpenCourse: (run: AgentRun) => void;
    onSelectRun: (runId: string) => void;
}

export const AgentRunsTable = ({
    loading,
    pendingAction,
    runs,
    onAction,
    onOpenCourse,
    onSelectRun,
}: AgentRunsTableProps) => {
    if (loading) return <AgentRunsLoadingTable />;

    if (runs.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
                <p className="text-sm font-medium text-foreground">AI drafts пока пустые</p>
                <p className="mt-1 text-sm text-muted-foreground">Когда агент создаст курс, запуск появится здесь.</p>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Draft</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Артефакты</TableHead>
                    <TableHead>Создан</TableHead>
                    <TableHead className="w-[260px]">Действия</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {runs.map((run) => (
                    <TableRow key={run.id}>
                        <TableCell>
                            <div className="flex min-w-[220px] items-center gap-3">
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="secondary"
                                    title="Открыть детали"
                                    aria-label="Открыть детали"
                                    onClick={() => onSelectRun(run.id)}
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-foreground">{getCourseTitle(run)}</p>
                                    <p className="truncate text-xs text-muted-foreground">{run.id}</p>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col items-start gap-1.5">
                                <AgentRunStatusBadge status={run.status} />
                                <AgentRunStatusBadge status={run.approval_status} kind="approval" />
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="min-w-[160px] text-sm text-muted-foreground">
                                <p>{countArtifacts(run, 'module')} модулей</p>
                                <p>{countArtifacts(run, 'lesson')} уроков</p>
                                {getNotebookJobArtifact(run) && <p>NotebookLM job</p>}
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDateTime(run.created_at)}
                        </TableCell>
                        <TableCell>
                            <AgentRunActions
                                run={run}
                                pendingAction={pendingAction}
                                onAction={onAction}
                                onOpenCourse={onOpenCourse}
                            />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

const AgentRunsLoadingTable = () => (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
        {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-8 w-28" />
            </div>
        ))}
    </div>
);
