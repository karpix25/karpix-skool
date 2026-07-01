import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '../../../components/ui/dialog';
import { Textarea } from '../../../components/ui/textarea';

interface BroadcastDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const BroadcastDialog = ({ open, onOpenChange }: BroadcastDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card-dark border-zinc-800 rounded-[40px] p-8 md:p-10 max-w-[95vw] md:max-w-lg border-none shadow-2xl">
            <DialogHeader className="mb-6">
                <h4 className="text-xl font-black uppercase tracking-tighter italic">Рассылка</h4>
                <p className="text-zinc-500 text-xs font-medium">Отправить уведомление всем пользователям.</p>
            </DialogHeader>
            <div className="space-y-6">
                <div className="p-1.5 bg-background-dark rounded-2xl flex gap-1">
                    <Button className="flex-1 rounded-xl h-10 text-[9px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/10">Всем админам</Button>
                    <Button variant="ghost" className="flex-1 rounded-xl h-10 text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-300">Всем студентам</Button>
                </div>
                <Textarea
                    placeholder="Введите сообщение..."
                    className="bg-background-dark border-none rounded-[24px] p-5 md:p-6 min-h-[140px] focus-visible:ring-primary/20 text-xs italic leading-relaxed"
                />
                <Button className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-[0.3em] shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
                    Отправить
                </Button>
            </div>
        </DialogContent>
    </Dialog>
);
