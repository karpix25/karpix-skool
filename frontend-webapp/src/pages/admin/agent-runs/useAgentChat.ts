import { useCallback, useRef, useState } from 'react';

import { buildAgentRunCreateInput, createAgentRunMessage, createDefaultAgentChatForm } from './agentChatDraft';
import { createAgentRun } from './agentRunsApi';
import { uploadPendingAgentGenerationSourceFiles } from './agentSourceFilesApi';
import { getErrorMessage } from './agentRunDisplay';
import type { AgentChatFormState, AgentChatMessage, AgentRun, AgentRunsFeedback } from './types';

interface UseAgentChatParams {
    onFeedback: (feedback: Omit<AgentRunsFeedback, 'id'>) => void;
    onRunCreated: (run: AgentRun) => void;
}

export const useAgentChat = ({ onFeedback, onRunCreated }: UseAgentChatParams) => {
    const [form, setForm] = useState<AgentChatFormState>(createDefaultAgentChatForm);
    const [messages, setMessages] = useState<AgentChatMessage[]>([
        {
            id: 1,
            role: 'assistant',
            content: 'Готов создать draft курса.',
        },
    ]);
    const [submitting, setSubmitting] = useState(false);
    const messageIdRef = useRef(1);

    const updateForm = useCallback(<Key extends keyof AgentChatFormState>(
        key: Key,
        value: AgentChatFormState[Key]
    ) => {
        setForm((current) => ({ ...current, [key]: value }));
    }, []);

    const addMessage = useCallback((message: Omit<AgentChatMessage, 'id'>) => {
        messageIdRef.current += 1;
        setMessages((current) => [...current, { ...message, id: messageIdRef.current }]);
    }, []);

    const submit = useCallback(async () => {
        const task = form.task.trim();
        const tenantId = window.localStorage.getItem('activeTenantId');
        const hasSources = form.sources.some(source => source.content?.trim() || source.url?.trim() || source.file);
        if ((!task && !hasSources) || submitting) return;

        if (!tenantId) {
            onFeedback({
                variant: 'error',
                title: 'Выберите школу',
                description: 'Перед запуском AI ассистента нужен активный tenant.',
            });
            return;
        }

        try {
            setSubmitting(true);
            addMessage({ role: 'user', content: task || `Создать курс из материалов: ${form.sources.length}` });
            const sources = await uploadPendingAgentGenerationSourceFiles(form.sources);
            const run = await createAgentRun(buildAgentRunCreateInput({ ...form, sources }, tenantId));
            onRunCreated(run);
            addMessage({ role: 'assistant', content: createAgentRunMessage(run), runId: run.id });
            setForm((current) => ({
                ...createDefaultAgentChatForm(),
                moduleCount: current.moduleCount,
                lessonsPerModule: current.lessonsPerModule,
                audienceLevel: current.audienceLevel,
                style: current.style,
            }));
            onFeedback({ variant: 'success', title: 'AI draft создан' });
        } catch (error) {
            const description = getErrorMessage(error, 'Сервер не смог создать draft.');
            addMessage({ role: 'assistant', content: description });
            onFeedback({ variant: 'error', title: 'AI ассистент не запустился', description });
        } finally {
            setSubmitting(false);
        }
    }, [addMessage, form, onFeedback, onRunCreated, submitting]);

    return {
        form,
        messages,
        submitting,
        submit,
        updateForm,
    };
};
