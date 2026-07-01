import { Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent } from '../../../components/ui/dialog';
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
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[32px] border border-border/50 shadow-2xl bg-card text-foreground">
            <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black uppercase tracking-widest">
                        {editingModule ? 'Редактировать модуль' : 'Новый модуль'}
                    </h3>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Название</Label>
                        <Input
                            placeholder="Введите название..."
                            className="h-12 bg-muted/30 border-border rounded-xl p-4 text-sm font-medium focus:ring-1 focus:ring-primary transition-all"
                            value={moduleForm.title}
                            onChange={(e) => onFormChange({ ...moduleForm, title: e.target.value })}
                        />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Стратегия доступа</Label>
                        <div className="grid grid-cols-3 items-center justify-center rounded-2xl bg-muted/30 p-1.5 text-muted-foreground border border-border/40">
                            {moduleUnlockOptions.map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => onFormChange(prev => ({ ...prev, unlock_type: type.id }))}
                                    className={cn(
                                        "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-2 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all",
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
                            <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">
                                {moduleForm.unlock_type === 'level_based' ? 'Требуемый уровень' : 'Задержка'}
                            </Label>
                            <Select value={moduleForm.unlock_value} onValueChange={(v) => onFormChange(prev => ({ ...prev, unlock_value: v }))}>
                                <SelectTrigger className="h-12 w-full rounded-xl border-border/60 bg-muted/20 px-4 font-bold text-sm">
                                    <SelectValue placeholder="Выбрать" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-border/60 shadow-xl p-1">
                                    {moduleForm.unlock_type === 'level_based' ? (
                                        [1, 2, 3, 5, 10, 20].map(lv => (
                                            <SelectItem key={lv} value={lv.toString()} className="rounded-lg h-10 font-bold text-[11px] uppercase tracking-widest">
                                                Уровень {lv}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <>
                                            {[1, 2, 3, 5, 10, 20].map(lv => (
                                                <SelectItem key={lv} value={lv.toString()} className="rounded-lg h-10 font-bold text-[11px] uppercase tracking-widest">
                                                    {lv} дн.
                                                </SelectItem>
                                            ))}
                                            {[1, 2, 3].map(m => (
                                                <SelectItem key={`m${m}`} value={`${m}m`} className="rounded-lg h-10 font-bold text-[11px] uppercase tracking-widest">
                                                    {m} {m === 1 ? 'месяц' : 'месяца'}
                                                </SelectItem>
                                            ))}
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/40 rounded-2xl">
                        <div className="space-y-0.5">
                            <Label className="text-xs font-black uppercase tracking-tight text-foreground">Только VIP</Label>
                            <p className="text-[9px] font-bold text-muted-foreground opacity-60 uppercase tracking-tighter">Доступ для платной группы</p>
                        </div>
                        <Switch checked={moduleForm.is_vip} onCheckedChange={(checked) => onFormChange(prev => ({ ...prev, is_vip: checked }))} />
                    </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                    <Button onClick={onSave} disabled={!moduleForm.title} className="h-12 bg-primary text-white hover:bg-primary/90 rounded-xl font-bold uppercase text-[10px] tracking-widest">
                        {editingModule ? 'Сохранить' : 'Создать модуль'}
                    </Button>

                    {editingModule && (
                        <Button
                            variant="ghost"
                            className="h-12 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl font-bold uppercase text-[9px] tracking-widest"
                            onClick={() => onDelete(editingModule.id)}
                        >
                            <Trash2 size={14} className="mr-2" /> Удалить навсегда
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="h-10 text-muted-foreground/60 hover:text-foreground font-bold uppercase text-[10px] tracking-widest transition-colors"
                    >
                        Отмена
                    </Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>
);
