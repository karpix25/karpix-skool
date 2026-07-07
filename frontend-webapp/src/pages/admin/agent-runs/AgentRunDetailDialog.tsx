import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../../../components/ui/dialog';
import {
    countArtifacts,
    formatDateTime,
    getCourseTitle,
    getMediaUrl,
} from './agentRunDisplay';
import { AgentRunActions } from './AgentRunActions';
import { AgentRunStatusBadge } from './AgentRunStatusBadge';
import type { AgentArtifact, AgentRun, AgentRunAction } from './types';

interface AgentRunDetailDialogProps {
    run: AgentRun | null;
    pendingAction: string | null;
    onClose: () => void;
    onAction: (run: AgentRun, action: AgentRunAction) => void;
    onOpenCourse: (run: AgentRun) => void;
}

export const AgentRunDetailDialog = ({
    run,
    pendingAction,
    onClose,
    onAction,
    onOpenCourse,
}: AgentRunDetailDialogProps) => (
    <Dialog open={Boolean(run)} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl">
            {run && (
                <>
                    <DialogHeader>
                        <DialogTitle>{getCourseTitle(run)}</DialogTitle>
                        <DialogDescription>
                            Создан {formatDateTime(run.created_at)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 p-4">
                        <div className="flex flex-wrap gap-2">
                            <AgentRunStatusBadge status={run.status} />
                            <AgentRunStatusBadge status={run.approval_status} kind="approval" />
                        </div>
                        <AgentRunActions
                            run={run}
                            pendingAction={pendingAction}
                            onAction={onAction}
                            onOpenCourse={onOpenCourse}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold text-foreground">Steps</h3>
                            <div className="space-y-2">
                                {run.steps.map((step) => (
                                    <div key={step.id} className="rounded-lg border border-border/70 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-medium text-foreground">{step.name}</p>
                                            <AgentRunStatusBadge status={step.status} kind="step" />
                                        </div>
                                        {step.error && <p className="mt-2 text-xs text-destructive">{step.error}</p>}
                                    </div>
                                ))}
                            </div>

                            <h3 className="pt-2 text-sm font-semibold text-foreground">Summary</h3>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <Stat label="Модули" value={countArtifacts(run, 'module')} />
                                <Stat label="Уроки" value={countArtifacts(run, 'lesson')} />
                                <Stat label="Медиа" value={countArtifacts(run, 'media')} />
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold text-foreground">Artifacts</h3>
                            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                                {run.artifacts.map((artifact) => (
                                    <ArtifactRow key={artifact.id} artifact={artifact} />
                                ))}
                            </div>
                        </section>
                    </div>
                </>
            )}
        </DialogContent>
    </Dialog>
);

const Stat = ({ label, value }: { label: string; value: number }) => (
    <div className="rounded-lg border border-border/70 bg-card p-3">
        <p className="text-lg font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
    </div>
);

const ArtifactRow = ({ artifact }: { artifact: AgentArtifact }) => {
    const mediaUrl = getMediaUrl(artifact);

    return (
        <div className="flex items-center gap-3 rounded-lg border border-border/70 p-3">
            {mediaUrl && (
                <img
                    src={mediaUrl}
                    alt=""
                    className="h-12 w-12 rounded-lg border border-border object-cover"
                />
            )}
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                    {artifact.title || artifact.resource_type}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                    {artifact.artifact_type} · {artifact.resource_type}
                </p>
            </div>
        </div>
    );
};
