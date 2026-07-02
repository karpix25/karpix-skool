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
                <div className="p-1 bg-muted rounded-lg flex gap-1 border border-border">
                    <Button className="h-11 flex-1 rounded-md bg-primary text-[9px] font-bold text-white shadow-sm hover:bg-primary/90">Всем админам</Button>
                    <Button variant="ghost" className="h-11 flex-1 rounded-md text-[9px] font-bold text-muted-foreground hover:text-foreground">Всем студентам</Button>
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
