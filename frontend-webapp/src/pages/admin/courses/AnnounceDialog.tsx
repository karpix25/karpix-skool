import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '../../../components/ui/dialog';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { CharCounter } from '../../../components/CharCounter';
import type { AdminCourse } from '../../../types/admin';
import type { CourseFeedback } from './courseFeedback';

interface AnnounceDialogProps {
    open: boolean;
    course: AdminCourse | null;
    message: string;
    isAnnouncing: boolean;
    feedback: CourseFeedback | null;
    onOpenChange: (open: boolean) => void;
    onMessageChange: (message: string) => void;
    onAnnounce: () => void;
    onFeedbackDismiss: () => void;
}

export const AnnounceDialog = ({
    open,
    course,
    message,
    isAnnouncing,
    feedback,
    onOpenChange,
    onMessageChange,
    onAnnounce,
    onFeedbackDismiss,
}: AnnounceDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border border-border shadow-md bg-card text-foreground">
            <div className="p-6 sm:p-8 space-y-6">
                <div className="text-center space-y-2">
                    <DialogTitle className="text-xl font-semibold text-primary">
                        Анонс курса
                    </DialogTitle>
                    <p className="truncate text-xs font-medium text-muted-foreground">
                        {course?.title}
                    </p>
                </div>

                {feedback && (
                    <InlineAlert
                        key={feedback.id}
                        variant={feedback.variant}
                        title={feedback.title}
                        description={feedback.description}
                        onDismiss={onFeedbackDismiss}
                    />
                )}

                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <Label className="text-xs font-medium text-muted-foreground">Ваше сообщение</Label>
                        <CharCounter current={message.length} max={200} />
                    </div>
                    <Textarea
                        className="min-h-[120px] w-full rounded-lg border-border bg-muted/20 px-4 py-3 text-sm font-medium transition-all focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed border"
                        value={message}
                        onChange={(e) => onMessageChange(e.target.value.slice(0, 200))}
                        placeholder="Напишите что-нибудь вдохновляющее..."
                    />
                    <p className="px-1 text-xs leading-5 text-muted-foreground">
                        Сообщение будет отправлено в группу школы вместе с обложкой курса и кнопкой для перехода.
                    </p>
                </div>

                <div className="flex flex-col gap-3 py-2">
                    <Button
                        onClick={onAnnounce}
                        disabled={isAnnouncing}
                        className="h-12 w-full rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                    >
                        {isAnnouncing ? "Отправка..." : "Опубликовать в группу"}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="h-11 w-full rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                        Отмена
                    </Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>
);
