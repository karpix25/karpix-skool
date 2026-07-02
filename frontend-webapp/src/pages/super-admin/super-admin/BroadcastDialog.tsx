import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Textarea } from '../../../components/ui/textarea';

interface BroadcastDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const BroadcastDialog = ({ open, onOpenChange }: BroadcastDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border rounded-2xl p-6 md:p-8 max-w-[95vw] md:max-w-lg shadow-md">
            <DialogHeader className="mb-6">
                <DialogTitle className="pr-10 text-xl font-semibold">Рассылка</DialogTitle>
                <p className="text-muted-foreground text-xs font-medium">Отправить уведомление всем пользователям.</p>
            </DialogHeader>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted p-1">
                    <Button className="h-11 rounded-lg bg-primary text-xs font-medium text-white shadow-sm hover:bg-primary/90">Админам</Button>
                    <Button variant="ghost" className="h-11 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground">Студентам</Button>
                </div>
                <Textarea
                    placeholder="Введите сообщение..."
                    className="bg-muted/30 border border-border rounded-lg p-4 md:p-5 min-h-[140px] focus-visible:ring-primary/20 text-xs leading-relaxed"
                />
                <Button className="w-full h-12 rounded-lg bg-primary text-white font-bold text-xs shadow-sm active:scale-[0.99] transition-all">
                    Отправить
                </Button>
            </div>
        </DialogContent>
    </Dialog>
);
