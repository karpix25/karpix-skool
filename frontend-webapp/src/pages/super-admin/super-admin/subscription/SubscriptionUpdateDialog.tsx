import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '../../../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../../../components/ui/dialog';
import { InlineAlert } from '../../../../components/ui/inline-alert';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import {
    ALLOWED_SUBSCRIPTION_TRANSITIONS,
    SUBSCRIPTION_STATUS_LABELS,
} from './types';
import type { SubscriptionStatus, SubscriptionUpdateInput, TenantPlan, TenantSubscription } from './types';

const toLocalDateTime = (value: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

interface SubscriptionUpdateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subscription: TenantSubscription;
    plans: TenantPlan[];
    isSaving: boolean;
    error: string | null;
    onSave: (updates: SubscriptionUpdateInput) => Promise<boolean>;
}

export const SubscriptionUpdateDialog = ({
    open,
    onOpenChange,
    subscription,
    plans,
    isSaving,
    error,
    onSave,
}: SubscriptionUpdateDialogProps) => {
    const [planCode, setPlanCode] = useState(subscription.plan.code);
    const [status, setStatus] = useState<SubscriptionStatus>(subscription.status);
    const [periodEnd, setPeriodEnd] = useState(toLocalDateTime(subscription.current_period_end));
    const [reason, setReason] = useState('');
    const [reasonTouched, setReasonTouched] = useState(false);
    const reasonError = reasonTouched && reason.trim().length < 3
        ? 'Укажите причину изменения — минимум 3 символа.'
        : null;
    const statusOptions = [
        subscription.status,
        ...ALLOWED_SUBSCRIPTION_TRANSITIONS[subscription.status],
    ];

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setReasonTouched(true);
        if (reason.trim().length < 3) return;

        const saved = await onSave({
            plan_code: planCode,
            status,
            ...(periodEnd ? { current_period_end: new Date(periodEnd).toISOString() } : {}),
            reason: reason.trim(),
        });
        if (saved) onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>Изменить подписку</DialogTitle>
                        <DialogDescription>
                            Изменение применяется сразу и записывается в историю с вашей причиной.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="subscription-plan">Тариф</Label>
                            <Select value={planCode} onValueChange={setPlanCode} disabled={isSaving}>
                                <SelectTrigger id="subscription-plan"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {plans.map((plan) => (
                                        <SelectItem key={plan.id} value={plan.code}>{plan.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subscription-status">Статус</Label>
                            <Select value={status} onValueChange={(value) => setStatus(value as SubscriptionStatus)} disabled={isSaving}>
                                <SelectTrigger id="subscription-status"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((option) => (
                                        <SelectItem key={option} value={option}>{SUBSCRIPTION_STATUS_LABELS[option]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subscription-end">Доступ до</Label>
                        <Input
                            id="subscription-end"
                            type="datetime-local"
                            value={periodEnd}
                            onChange={(event) => setPeriodEnd(event.target.value)}
                            disabled={isSaving}
                        />
                        <p className="text-xs text-muted-foreground">Оставьте пустым, чтобы не менять текущую дату окончания.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subscription-reason">Причина изменения</Label>
                        <Textarea
                            id="subscription-reason"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            onBlur={() => setReasonTouched(true)}
                            aria-invalid={Boolean(reasonError)}
                            aria-describedby="subscription-reason-help"
                            placeholder="Например, продление после оплаты"
                            disabled={isSaving}
                            className="min-h-24 resize-y"
                        />
                        <p id="subscription-reason-help" className="min-h-5 text-xs text-muted-foreground">
                            {reasonError || 'Причина обязательна и будет сохранена в журнале изменений.'}
                        </p>
                    </div>

                    {error && <InlineAlert variant="error" title="Изменения не сохранены" description={error} />}

                    <DialogFooter className="gap-2 sm:space-x-0">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                            Отмена
                        </Button>
                        <Button type="submit" disabled={isSaving || Boolean(reasonError)} className="whitespace-nowrap">
                            {isSaving && <Loader2 className="animate-spin" aria-hidden="true" />}
                            {isSaving ? 'Сохраняем…' : 'Сохранить изменения'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
