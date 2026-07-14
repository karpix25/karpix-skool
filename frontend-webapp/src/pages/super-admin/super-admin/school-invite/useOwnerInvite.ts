import { useCallback, useEffect, useState } from 'react';

import api from '../../../../api/client';
import { getApiErrorMessage } from '../../../../services/apiError';
import type { OwnerInviteIssueResult, OwnerInviteStatus } from './types';


export const useOwnerInvite = (tenantId: string | null) => {
    const [status, setStatus] = useState<OwnerInviteStatus | null>(null);
    const [secretCommand, setSecretCommand] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!tenantId) {
            setStatus(null);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get<OwnerInviteStatus>(`/super/tenants/${tenantId}/owner-invite`);
            setStatus(response.data);
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Не удалось загрузить приглашение'));
        } finally {
            setIsLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        setSecretCommand(null);
        void load();
    }, [load]);

    const rotate = async () => {
        if (!tenantId) return false;
        setIsSaving(true);
        setError(null);
        try {
            const response = await api.post<OwnerInviteIssueResult>(
                `/super/tenants/${tenantId}/owner-invite/rotate`
            );
            setStatus(response.data);
            setSecretCommand(response.data.setup_command);
            return true;
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Не удалось выпустить новое приглашение'));
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const revoke = async () => {
        if (!tenantId) return false;
        setIsSaving(true);
        setError(null);
        try {
            const response = await api.delete<OwnerInviteStatus>(`/super/tenants/${tenantId}/owner-invite`);
            setStatus(response.data);
            setSecretCommand(null);
            return true;
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Не удалось отозвать приглашение'));
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    return {
        status,
        secretCommand,
        isLoading,
        isSaving,
        error,
        reload: load,
        rotate,
        revoke,
    };
};
