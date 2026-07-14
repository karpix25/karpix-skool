import { RadioTower } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { InlineAlert } from '../../../components/ui/inline-alert';

interface BroadcastDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const BroadcastDialog = ({ open, onOpenChange }: BroadcastDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border rounded-2xl p-6 md:p-8 max-w-[95vw] md:max-w-lg shadow-md">
            <DialogHeader>
                <DialogTitle className="pr-10 text-xl font-semibold">Рассылка</DialogTitle>
                <DialogDescription>Массовые уведомления пользователям платформы.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                    <RadioTower className="h-5 w-5" aria-hidden="true" />
                </div>
                <InlineAlert
                    title="Рассылка пока недоступна"
                    description="К панели не подключён канал массовой отправки. Сообщения отсюда не отправляются."
                />
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Закрыть</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);
