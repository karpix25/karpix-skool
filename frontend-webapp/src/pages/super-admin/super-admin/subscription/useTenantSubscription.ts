import { useCallback, useEffect, useRef, useState } from 'react';

import api from '../../../../api/client';
import { getApiErrorMessage } from '../../../../services/apiError';
import { TENANTS_CHANGED_EVENT } from '../school-invite/events';
import type { SubscriptionUpdateInput, TenantPlan, TenantSubscription } from './types';

export const useTenantSubscription = (tenantId: string | null) => {
    const requestId = useRef(0);
    const [plans, setPlans] = useState<TenantPlan[]>([]);
    const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const loadPlans = useCallback(async () => {
        try {
            const response = await api.get<TenantPlan[]>('/super/plans');
            setPlans(response.data);
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Не удалось загрузить тарифы'));
        }
    }, []);

    const loadSubscription = useCallback(async () => {
        const currentRequestId = ++requestId.current;
        setSuccessMessage(null);
        if (!tenantId) {
            setSubscription(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get<TenantSubscription>(`/super/tenants/${tenantId}/subscription`);
            if (requestId.current === currentRequestId) setSubscription(response.data);
        } catch (requestError) {
            if (requestId.current === currentRequestId) {
                setSubscription(null);
                setError(getApiErrorMessage(requestError, 'Не удалось загрузить подписку школы'));
            }
        } finally {
            if (requestId.current === currentRequestId) setIsLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        void loadPlans();
    }, [loadPlans]);

    useEffect(() => {
        void loadSubscription();
    }, [loadSubscription]);

    const updateSubscription = async (updates: SubscriptionUpdateInput) => {
        if (!tenantId) return false;
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const response = await api.patch<TenantSubscription>(
                `/super/tenants/${tenantId}/subscription`,
                updates
            );
            setSubscription(response.data);
            setSuccessMessage('Тариф и доступ школы обновлены.');
            window.dispatchEvent(new CustomEvent(TENANTS_CHANGED_EVENT));
            return true;
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Не удалось обновить подписку'));
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    return {
        plans,
        subscription,
        isLoading,
        isSaving,
        error,
        successMessage,
        reload: loadSubscription,
        updateSubscription,
    };
};
