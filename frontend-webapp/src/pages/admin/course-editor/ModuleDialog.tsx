import { Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { cn } from '../../../lib/utils';
import type { AdminModule, ModuleFormState } from '../../../types/admin';
import { moduleUnlockOptions } from './moduleOptions';

interface ModuleDialogProps {
    open: boolean;
    editingModule: AdminModule | null;
    moduleForm: ModuleFormState;
    onOpenChange: (open: boolean) => void;
    onFormChange: (form: ModuleFormState | ((prev: ModuleFormState) => ModuleFormState)) => void;
    onSave: () => void;
    onDelete: (id: string) => void;
}

export const ModuleDialog = ({
    open,
    editingModule,
    moduleForm,
    onOpenChange,
    onFormChange,
    onSave,
    onDelete,
}: ModuleDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border border-border shadow-md bg-card text-foreground">
            <div className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <DialogTitle className="text-lg font-semibold">
                        {editingModule ? 'Редактировать модуль' : 'Новый модуль'}
                    </DialogTitle>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="ml-1 text-xs font-medium text-muted-foreground">Название</Label>
                        <Input
                            placeholder="Введите название..."
                            className="h-12 bg-muted/30 border-border rounded-lg p-4 text-sm font-medium focus:ring-1 focus:ring-primary transition-all"
                            value={moduleForm.title}
                            onChange={(e) => onFormChange({ ...moduleForm, title: e.target.value })}
                        />
                    </div>

                    <div className="space-y-4">
                        <Label className="ml-1 text-xs font-medium text-muted-foreground">Стратегия доступа</Label>
                        <div
                            className="grid grid-cols-1 items-center justify-center rounded-lg border border-border/40 bg-muted/30 p-1 text-muted-foreground min-[360px]:grid-cols-3"
                            role="group"
                            aria-label="Стратегия доступа модуля"
                        >
                            {moduleUnlockOptions.map((type) => (
                                <button
                                    key={type.id}
                                    aria-pressed={moduleForm.unlock_type === type.id}
                                    onClick={() => onFormChange(prev => ({ ...prev, unlock_type: type.id }))}
                                    className={cn(
                                        "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-md px-2 text-xs font-medium transition-all",
                                        moduleForm.unlock_type === type.id
                                            ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                                            : 'hover:text-foreground/80 opacity-60'
                                    )}
                                    type="button"
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {moduleForm.unlock_type !== 'immediate' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                            <Label className="ml-1 text-xs font-medium text-muted-foreground">
                                {moduleForm.unlock_type === 'level_based' ? 'Требуемый уровень' : 'Задержка'}
                            </Label>
                            <Select value={moduleForm.unlock_value} onValueChange={(v) => onFormChange(prev => ({ ...prev, unlock_value: v }))}>
                                <SelectTrigger className="h-12 w-full rounded-lg border-border/60 bg-muted/20 px-4 font-bold text-sm">
                                    <SelectValue placeholder="Выбрать" />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg border-border/60 shadow-md p-1">
                                    {moduleForm.unlock_type === 'level_based' ? (
                                        [1, 2, 3, 5, 10, 20].map(lv => (
                                            <SelectItem key={lv} value={lv.toString()} className="min-h-11 rounded-lg text-xs font-medium">
                                                Уровень {lv}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <>
                                            {[1, 2, 3, 5, 10, 20].map(lv => (
                                                <SelectItem key={lv} value={lv.toString()} className="min-h-11 rounded-lg text-xs font-medium">
                                                    {lv} дн.
                                                </SelectItem>
                                            ))}
                                            {[1, 2, 3].map(m => (
                                                <SelectItem key={`m${m}`} value={`${m}m`} className="min-h-11 rounded-lg text-xs font-medium">
                                                    {m} {m === 1 ? 'месяц' : 'месяца'}
                                                </SelectItem>
                                            ))}
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/40 rounded-lg">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-semibold text-foreground">Только VIP</Label>
                            <p className="text-xs font-medium text-muted-foreground opacity-70">Доступ для платной группы</p>
                        </div>
                        <Switch checked={moduleForm.is_vip} onCheckedChange={(checked) => onFormChange(prev => ({ ...prev, is_vip: checked }))} />
                    </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                    <Button onClick={onSave} disabled={!moduleForm.title} className="h-12 rounded-lg bg-primary text-xs font-medium text-white hover:bg-primary/90">
                        {editingModule ? 'Сохранить' : 'Создать модуль'}
                    </Button>

                    {editingModule && (
                        <Button
                            variant="ghost"
                            className="h-12 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onDelete(editingModule.id)}
                        >
                            <Trash2 size={14} className="mr-2" /> Удалить навсегда
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="h-11 text-xs font-medium text-muted-foreground/70 transition-colors hover:text-foreground"
                    >
                        Отмена
                    </Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>
);
