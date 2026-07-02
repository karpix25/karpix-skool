import { AlertTriangle } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import type { Tenant } from './types';

interface DeleteSchoolDialogProps {
    open: boolean;
    tenant: Tenant | null;
    confirmName: string;
    isDeleting: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirmNameChange: (value: string) => void;
    onConfirm: () => void;
}

export const DeleteSchoolDialog = ({
    open,
    tenant,
    confirmName,
    isDeleting,
    onOpenChange,
    onConfirmNameChange,
    onConfirm,
}: DeleteSchoolDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border rounded-2xl p-6 md:p-8 max-w-[90vw] md:max-w-sm shadow-md">
            <DialogHeader className="space-y-4">
                <div className="bg-danger/10 w-14 h-14 md:w-16 md:h-16 rounded-lg flex items-center justify-center text-danger mx-auto">
                    <AlertTriangle size={28} />
                </div>
                <DialogTitle className="text-lg md:text-xl font-semibold text-center">Удалить школу?</DialogTitle>
                <DialogDescription className="text-center text-xs font-medium leading-relaxed text-muted-foreground">
                    Удаление <span className="font-semibold text-foreground">{tenant?.name}</span> мгновенно удалит все данные и логи студентов.
                </DialogDescription>
            </DialogHeader>
            <div className="mt-8 space-y-4">
                <Input
                    placeholder="Подтвердите название"
                    className="h-12 rounded-lg border border-border bg-muted/30 px-4 text-center text-sm font-medium focus-visible:ring-danger/20 md:h-14"
                    value={confirmName}
                    onChange={(e) => onConfirmNameChange(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="ghost" className="h-11 rounded-lg text-xs font-medium" onClick={() => onOpenChange(false)}>Отмена</Button>
                    <Button variant="destructive" className="h-11 rounded-lg text-xs font-medium" disabled={confirmName !== tenant?.name || isDeleting} onClick={onConfirm}>
                        {isDeleting ? '...' : 'Удалить'}
                    </Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>
);
