import { Check, ExternalLink, RotateCcw, Send, X } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { getCourseArtifact } from './agentRunDisplay';
import type { AgentRun, AgentRunAction } from './types';

interface AgentRunActionsProps {
    run: AgentRun;
    pendingAction: string | null;
    onAction: (run: AgentRun, action: AgentRunAction) => void;
    onOpenCourse: (run: AgentRun) => void;
}

export const AgentRunActions = ({
    run,
    pendingAction,
    onAction,
    onOpenCourse,
}: AgentRunActionsProps) => {
    const disabled = Boolean(pendingAction);
    const hasCourse = Boolean(getCourseArtifact(run));
    const canApprove = run.approval_status === 'pending' && run.status !== 'published';
    const canReject = run.status !== 'published' && run.approval_status !== 'rejected';
    const canPublish = run.approval_status === 'approved';
    const canRetry = run.status === 'failed' || run.status === 'rejected';

    const confirmAndRun = (action: AgentRunAction) => {
        if (action === 'reject' && !window.confirm('Отклонить draft?')) return;
        if (action === 'publish' && !window.confirm('Опубликовать курс для учеников?')) return;
        onAction(run, action);
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button
                type="button"
                size="icon"
                variant="secondary"
                disabled={disabled || !hasCourse}
                title="Открыть курс"
                aria-label="Открыть курс"
                onClick={() => onOpenCourse(run)}
            >
                <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                size="icon"
                disabled={disabled || !canApprove}
                title="Одобрить"
                aria-label="Одобрить"
                onClick={() => onAction(run, 'approve')}
            >
                <Check className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                size="icon"
                variant="secondary"
                disabled={disabled || !canPublish}
                title="Опубликовать"
                aria-label="Опубликовать"
                onClick={() => confirmAndRun('publish')}
            >
                <Send className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                size="icon"
                variant="destructive"
                disabled={disabled || !canReject}
                title="Отклонить"
                aria-label="Отклонить"
                onClick={() => confirmAndRun('reject')}
            >
                <X className="h-4 w-4" />
            </Button>
            <Button
                type="button"
                size="icon"
                variant="secondary"
                disabled={disabled || !canRetry}
                title="Повторить"
                aria-label="Повторить"
                onClick={() => onAction(run, 'retry')}
            >
                <RotateCcw className="h-4 w-4" />
            </Button>
        </div>
    );
};
