import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';

import {
    parseStartParamDeepLink,
    resolveDeepLink,
    type DeepLinkResolveResponse,
} from '../../../services/deepLinks';
import { getTelegramStartParam } from '../../../services/telegramStartParam';


interface LessonLeadOfferState {
    offer: DeepLinkResolveResponse | null;
    startParam: string | null;
    isLoading: boolean;
}


const getLessonStartParam = () => {
    const startParam = getTelegramStartParam(WebApp);
    const parsed = parseStartParamDeepLink(startParam);
    return startParam && parsed?.type === 'lesson' ? startParam : null;
};


export const useLessonLeadOffer = (): LessonLeadOfferState => {
    const [state, setState] = useState<LessonLeadOfferState>(() => {
        const startParam = getLessonStartParam();
        return {
            offer: null,
            startParam,
            isLoading: Boolean(startParam),
        };
    });

    useEffect(() => {
        const startParam = getLessonStartParam();
        if (!startParam) return undefined;

        let cancelled = false;

        const loadOffer = async () => {
            try {
                const offer = await resolveDeepLink(startParam);
                if (!cancelled && offer.type === 'lesson') {
                    setState({ offer, startParam, isLoading: false });
                }
            } catch (err) {
                console.error('Failed to load lesson lead offer:', err);
                if (!cancelled) {
                    setState({ offer: null, startParam, isLoading: false });
                }
            }
        };

        void loadOffer();

        return () => {
            cancelled = true;
        };
    }, []);

    return state;
};
