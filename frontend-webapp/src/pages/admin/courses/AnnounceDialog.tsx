import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { CharCounter } from '../../../components/CharCounter';
import type { AdminCourse } from '../../../types/admin';

interface AnnounceDialogProps {
    open: boolean;
    course: AdminCourse | null;
    message: string;
    isAnnouncing: boolean;
    onOpenChange: (open: boolean) => void;
    onMessageChange: (message: string) => void;
    onAnnounce: () => void;
}

export const AnnounceDialog = ({
    open,
    course,
    message,
    isAnnouncing,
    onOpenChange,
    onMessageChange,
    onAnnounce,
}: AnnounceDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="dark max-w-md p-0 overflow-hidden rounded-[32px] border-none shadow-2xl bg-[#09090b] text-slate-100">
            <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-black uppercase tracking-widest text-primary">Анонс курса</h2>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                        {course?.title}
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Ваше сообщение</Label>
                        <CharCounter current={message.length} max={200} />
                    </div>
                    <Textarea
                        className="min-h-[120px] w-full rounded-2xl border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition-all focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed border"
                        value={message}
                        onChange={(e) => onMessageChange(e.target.value.slice(0, 200))}
                        placeholder="Напишите что-нибудь вдохновляющее..."
                    />
                    <p className="text-[9px] text-muted-foreground px-1 italic">
                        Сообщение будет отправлено в группу школы вместе с обложкой курса и кнопкой для перехода.
                    </p>
                </div>

                <div className="flex flex-col gap-3 py-2">
                    <Button
                        onClick={onAnnounce}
                        disabled={isAnnouncing}
                        className="w-full h-14 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all"
                    >
                        {isAnnouncing ? "Отправка..." : "Опубликовать в группу"}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white"
                    >
                        Отмена
                    </Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>
);
