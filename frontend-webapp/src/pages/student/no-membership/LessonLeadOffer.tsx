import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import type { DeepLinkResolveResponse } from '../../../services/deepLinks';
import { getLessonLeadDescription, getLessonLeadTitle } from './lessonLeadOfferCopy';


interface LessonLeadOfferProps {
    offer: DeepLinkResolveResponse | null;
    tenantName?: string | null;
    joinLink?: string | null;
    isRefreshing: boolean;
    onJoin: () => void;
    onOpenLesson: () => void;
}


export const LessonLeadOffer = ({
    offer,
    tenantName,
    joinLink,
    isRefreshing,
    onJoin,
    onOpenLesson,
}: LessonLeadOfferProps) => (
    <div className="space-y-5 pt-5 text-center">
        <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Бесплатный материал</p>
            <h1 className="text-2xl font-semibold leading-tight">{getLessonLeadTitle(offer)}</h1>
            <p className="text-sm leading-6 text-muted-foreground">
                {getLessonLeadDescription(offer, tenantName)}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
                Вступите в группу и вернитесь сюда, чтобы сразу открыть урок.
            </p>
        </div>

        <div className="grid gap-2">
            {joinLink && (
                <Button className="h-12 rounded-lg" onClick={onJoin}>
                    <ExternalLink size={16} />
                    Вступить в группу
                </Button>
            )}
            <Button
                variant={joinLink ? 'outline' : 'default'}
                className="h-12 rounded-lg"
                onClick={onOpenLesson}
                disabled={isRefreshing}
            >
                {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Я вступил, открыть урок
            </Button>
        </div>
    </div>
);
