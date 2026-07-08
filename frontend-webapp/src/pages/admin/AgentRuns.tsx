import React from 'react';

import { InlineAlert } from '../../components/ui/inline-alert';
import { AgentChatPanel } from './agent-runs/AgentChatPanel';
import { AgentRunDetailDialog } from './agent-runs/AgentRunDetailDialog';
import { AgentRunsHeader } from './agent-runs/AgentRunsHeader';
import { AgentRunsTable } from './agent-runs/AgentRunsTable';
import { useAgentRuns } from './agent-runs/useAgentRuns';

export const AgentRuns: React.FC = () => {
    const agentRuns = useAgentRuns();

    return (
        <div className="flex min-h-dvh flex-col animate-in fade-in duration-500">
            <AgentRunsHeader loading={agentRuns.loading} onRefresh={agentRuns.refreshRuns} />

            <main className="mx-auto w-full max-w-6xl space-y-5 px-5 py-5 sm:px-6 md:px-10">
                {agentRuns.feedback && (
                    <InlineAlert
                        key={agentRuns.feedback.id}
                        variant={agentRuns.feedback.variant}
                        title={agentRuns.feedback.title}
                        description={agentRuns.feedback.description}
                        onDismiss={agentRuns.clearFeedback}
                    />
                )}

                <AgentChatPanel
                    form={agentRuns.chat.form}
                    messages={agentRuns.chat.messages}
                    submitting={agentRuns.chat.submitting}
                    onSubmit={agentRuns.chat.submit}
                    onUpdateForm={agentRuns.chat.updateForm}
                    onSelectRun={agentRuns.selectRun}
                />

                <AgentRunsTable
                    loading={agentRuns.loading}
                    pendingAction={agentRuns.pendingAction}
                    runs={agentRuns.runs}
                    onAction={agentRuns.runAction}
                    onOpenCourse={agentRuns.openCourseEditor}
                    onSelectRun={agentRuns.selectRun}
                />
            </main>

            <AgentRunDetailDialog
                run={agentRuns.selectedRun}
                pendingAction={agentRuns.pendingAction}
                onClose={agentRuns.closeSelectedRun}
                onAction={agentRuns.runAction}
                onOpenCourse={agentRuns.openCourseEditor}
            />
        </div>
    );
};
