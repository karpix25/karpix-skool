import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

import { useAuth } from '../context/AuthContext';
import { parseStartParamDeepLink, resolveDeepLink } from '../services/deepLinks';
import type { TelegramInitDataUnsafe } from '../types/telegram';


const getStartParam = () => (
    (WebApp as { initDataUnsafe?: TelegramInitDataUnsafe }).initDataUnsafe?.start_param
);

export const DeepLinkNavigator = () => {
    const navigate = useNavigate();
    const { user, isLoading, refreshProfile, setActiveTenantId } = useAuth();
    const handledStartParamRef = useRef<string | null>(null);

    useEffect(() => {
        if (isLoading || !user) return;

        const startParam = getStartParam();
        if (!startParam || !parseStartParamDeepLink(startParam)) return;
        if (handledStartParamRef.current === startParam) return;

        handledStartParamRef.current = startParam;
        let cancelled = false;

        const openDeepLink = async () => {
            try {
                const target = await resolveDeepLink(startParam);
                setActiveTenantId(target.tenant_id);
                await refreshProfile(target.tenant_id);
                if (!cancelled) {
                    navigate(target.target_path, { replace: true });
                }
            } catch (err) {
                console.error('Failed to open deep link:', err);
            }
        };

        void openDeepLink();

        return () => {
            cancelled = true;
        };
    }, [isLoading, navigate, refreshProfile, setActiveTenantId, user]);

    return null;
};
