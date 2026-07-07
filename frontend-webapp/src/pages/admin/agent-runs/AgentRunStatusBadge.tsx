import { Badge } from '../../../components/ui/badge';
import { approvalStatusLabels, runStatusLabels } from './agentRunDisplay';
import type { AgentApprovalStatus, AgentRunStatus, AgentStep } from './types';

interface AgentRunStatusBadgeProps {
    status: AgentRunStatus | AgentApprovalStatus | AgentStep['status'];
    kind?: 'run' | 'approval' | 'step';
}

const stepStatusLabels: Record<AgentStep['status'], string> = {
    running: 'В работе',
    completed: 'Готово',
    failed: 'Ошибка',
};

export const AgentRunStatusBadge = ({ status, kind = 'run' }: AgentRunStatusBadgeProps) => {
    const variant = status === 'failed' || status === 'rejected'
        ? 'destructive'
        : status === 'published' || status === 'approved' || status === 'completed'
            ? 'default'
            : 'outline';
    const label = kind === 'step'
        ? stepStatusLabels[status as AgentStep['status']]
        : kind === 'approval'
        ? approvalStatusLabels[status as AgentApprovalStatus]
        : runStatusLabels[status as AgentRunStatus];

    return <Badge variant={variant}>{label || status}</Badge>;
};
