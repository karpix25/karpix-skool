import { useCallback, useState } from 'react';

import api from '../../../../api/client';
import { getApiErrorMessage } from '../../../../services/apiError';
import type { TenantInviteResult } from './types';

export const useSchoolInvite = () => {
    const [result, setResult] = useState<TenantInviteResult | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createInvite = async (name: string) => {
        setIsCreating(true);
        setError(null);
        try {
            const response = await api.post<TenantInviteResult>('/super/tenants/invite', { name });
            setResult(response.data);
            return response.data;
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Не удалось создать школу'));
            return null;
        } finally {
            setIsCreating(false);
        }
    };

    const reset = useCallback(() => {
        setResult(null);
        setError(null);
        setIsCreating(false);
    }, []);

    return { result, isCreating, error, createInvite, reset };
};
