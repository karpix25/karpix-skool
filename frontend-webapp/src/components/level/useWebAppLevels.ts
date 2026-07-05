import React from 'react';
import { fetchWebAppLevels } from '../../services/levels';
import type { WebAppLevelsResponse } from '../../types/levels';

interface UseWebAppLevelsResult {
    data: WebAppLevelsResponse | null;
    isLoading: boolean;
    error: string | null;
}

export const useWebAppLevels = (
    enabled: boolean,
    tenantId?: string | null,
): UseWebAppLevelsResult => {
    const [data, setData] = React.useState<WebAppLevelsResponse | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!enabled) {
            setData(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        let isCancelled = false;
        setData(null);
        setIsLoading(true);
        setError(null);

        fetchWebAppLevels(tenantId)
            .then((nextData) => {
                if (!isCancelled) {
                    setData(nextData);
                }
            })
            .catch(() => {
                if (!isCancelled) {
                    setData(null);
                    setError('Не удалось загрузить правила уровней');
                }
            })
            .finally(() => {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [enabled, tenantId]);

    return { data, isLoading, error };
};
