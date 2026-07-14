import { useCallback, useEffect, useState } from 'react';

import api from '../../../api/client';
import { getApiErrorMessage } from '../../../services/apiError';
import type { OwnerSubscription } from './types';

export const useOwnerSubscription = (tenantId: string | null) => {
    const [subscription, setSubscription] = useState<OwnerSubscription | null>(null);
    const [isLoading, setIsLoading] = useState(Boolean(tenantId));
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        if (!tenantId) {
            setSubscription(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get<OwnerSubscription>(`/tenants/${tenantId}/subscription`);
            setSubscription(response.data);
        } catch (requestError) {
            console.error('Failed to load owner subscription:', requestError);
            setSubscription(null);
            setError(getApiErrorMessage(requestError, 'Не удалось загрузить тариф школы.'));
        } finally {
            setIsLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        void reload();
    }, [reload]);

    return { subscription, isLoading, error, reload };
};
