import { AlertCircle, CheckCircle2, Image, RefreshCw } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { cn } from '../../../lib/utils';
import { getMediaStatusLabel } from './status';
import type {
    CourseGenerationMediaPlan,
    CourseGenerationMediaPlanItem,
    CourseGenerationMediaStatus,
} from './types';

interface MediaPlanPanelProps {
    mediaPlan?: CourseGenerationMediaPlan | null;
    disabled?: boolean;
    pendingItemId?: string | null;
    onApproveItem?: (item: CourseGenerationMediaPlanItem) => void;
    onRegenerateItem?: (item: CourseGenerationMediaPlanItem) => void;
    className?: string;
}

const mediaBadgeVariant = (status: CourseGenerationMediaStatus) => (
    status === 'failed' ? 'destructive' : status === 'approved' || status === 'ready' ? 'default' : 'outline'
);

export const MediaPlanPanel = ({
    mediaPlan,
    disabled = false,
    pendingItemId = null,
    onApproveItem,
    onRegenerateItem,
    className,
}: MediaPlanPanelProps) => {
    const items = mediaPlan?.items || [];
    const readyCount = items.filter((item) => item.status === 'ready' || item.status === 'approved').length;

    return (
        <section className={cn('rounded-xl border border-border/80 bg-card p-4 sm:p-5', className)}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Image className="h-4 w-4 text-primary" />
                        Медиа-план
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground">
                        {items.length > 0 ? `${readyCount}/${items.length} готово` : 'Медиа еще не запланировано'}
                    </p>
                </div>
                {items.length > 0 && <Badge variant="outline">{items.length} медиа</Badge>}
            </div>

            {items.length === 0 ? (
                <InlineAlert
                    title="Media plan появится после blueprint"
                    description="Обложки, скриншоты и иллюстрации будут проверены отдельно."
                />
            ) : (
                <div className="space-y-3">
                    {mediaPlan?.notes && (
                        <p className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm leading-6 text-muted-foreground">
                            {mediaPlan.notes}
                        </p>
                    )}

                    {items.map((item) => {
                        const isPending = pendingItemId === item.id;
                        const canReview = !disabled && !isPending && (item.status === 'ready' || item.status === 'needs_review');
                        const canRegenerate = !disabled && !isPending && item.status !== 'generating';

                        return (
                            <article
                                key={item.id}
                                className="grid gap-3 rounded-lg border border-border/70 bg-background p-3 sm:grid-cols-[84px_1fr_auto]"
                            >
                                <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-muted/30 sm:w-20">
                                    {item.asset_url ? (
                                        <img
                                            src={item.asset_url}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <Image className="h-6 w-6 text-muted-foreground" />
                                    )}
                                </div>

                                <div className="min-w-0 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-foreground">{item.target_title}</p>
                                        <Badge variant={mediaBadgeVariant(item.status)}>
                                            {getMediaStatusLabel(item.status)}
                                        </Badge>
                                    </div>
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {item.kind} · {item.target_type}
                                    </p>
                                    {item.prompt && (
                                        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.prompt}</p>
                                    )}
                                    {item.error && (
                                        <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            {item.error}
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-2 sm:flex-col sm:items-end">
                                    {onApproveItem && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={!canReview}
                                            onClick={() => onApproveItem(item)}
                                            className="h-10 rounded-lg text-xs font-semibold"
                                        >
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            {isPending ? '...' : 'Ок'}
                                        </Button>
                                    )}
                                    {onRegenerateItem && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            disabled={!canRegenerate}
                                            onClick={() => onRegenerateItem(item)}
                                            className="h-10 rounded-lg text-xs font-semibold"
                                        >
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            Еще раз
                                        </Button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
};
