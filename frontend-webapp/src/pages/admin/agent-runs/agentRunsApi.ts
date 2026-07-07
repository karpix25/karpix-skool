import api from '../../../api/client';
import type { AgentPublishResult, AgentRun } from './types';

interface DecisionPayload {
    note?: string;
}

interface PublishPayload extends DecisionPayload {
    notify_subscribers?: boolean;
}

export const fetchAgentRuns = async (): Promise<AgentRun[]> => {
    const response = await api.get<AgentRun[]>('/agent/runs');
    return response.data;
};

export const approveAgentRun = async (runId: string, payload: DecisionPayload = {}): Promise<AgentRun> => {
    const response = await api.post<AgentRun>(`/agent/runs/${runId}/approve`, payload);
    return response.data;
};

export const rejectAgentRun = async (runId: string, payload: DecisionPayload = {}): Promise<AgentRun> => {
    const response = await api.post<AgentRun>(`/agent/runs/${runId}/reject`, payload);
    return response.data;
};

export const publishAgentRun = async (runId: string, payload: PublishPayload = {}): Promise<AgentPublishResult> => {
    const response = await api.post<AgentPublishResult>(`/agent/runs/${runId}/publish`, payload);
    return response.data;
};

export const retryAgentRun = async (runId: string): Promise<AgentRun> => {
    const response = await api.post<AgentRun>(`/agent/runs/${runId}/retry`);
    return response.data;
};
