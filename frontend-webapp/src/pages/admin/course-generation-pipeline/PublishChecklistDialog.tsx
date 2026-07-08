import { Loader2, Send } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../../components/ui/dialog';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { Switch } from '../../../components/ui/switch';
import { getPublishChecklistSummary } from './status';
import type { CourseGenerationPublishChecklistItem } from './types';

interface PublishChecklistDialogProps {
    open: boolean;
    items: CourseGenerationPublishChecklistItem[];
    title?: string;
    description?: string;
    isPublishing?: boolean;
    onOpenChange: (open: boolean) => void;
    onToggleItem?: (itemId: string, checked: boolean) => void;
    onPublish?: () => void;
}

export const PublishChecklistDialog = ({
    open,
    items,
    title = 'Публикация курса',
    description = 'Финальная проверка перед выпуском черновиков.',
    isPublishing = false,
    onOpenChange,
    onToggleItem,
    onPublish,
}: PublishChecklistDialogProps) => {
    const summary = getPublishChecklistSummary(items);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    {summary.blockedItems.length > 0 && (
                        <InlineAlert
                            variant="info"
                            title={`${summary.completedRequiredCount}/${summary.requiredCount} обязательных пунктов`}
                            description={summary.blockedItems.map((item) => item.label).join(' · ')}
                        />
                    )}

                    <div className="space-y-2">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-3"
                            >
                                <Switch
                                    checked={item.checked}
                                    disabled={isPublishing || !onToggleItem}
                                    onCheckedChange={(checked) => onToggleItem?.(item.id, Boolean(checked))}
                                    aria-label={item.label}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                                        {item.required && (
                                            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                                Обязательно
                                            </span>
                                        )}
                                    </div>
                                    {item.description && (
                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                                    )}
                                    {!item.checked && item.blocking_reason && (
                                        <p className="mt-1 text-xs font-medium text-destructive">{item.blocking_reason}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={isPublishing}
                        onClick={() => onOpenChange(false)}
                        className="h-11 rounded-lg text-xs font-semibold"
                    >
                        Закрыть
                    </Button>
                    <Button
                        type="button"
                        disabled={!summary.canPublish || isPublishing || !onPublish}
                        onClick={onPublish}
                        className="h-11 rounded-lg text-xs font-semibold"
                    >
                        {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        {isPublishing ? 'Публикуем' : 'Опубликовать'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
