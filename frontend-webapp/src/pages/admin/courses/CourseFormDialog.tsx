import type { ChangeEvent, RefObject } from 'react';
import { Image as ImageIcon } from 'lucide-react';

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
import { Textarea } from '../../../components/ui/textarea';
import { CharCounter } from '../../../components/CharCounter';
import { cn } from '../../../lib/utils';
import type { CourseFormState } from '../../../types/admin';
import { courseUnlockOptions } from './courseOptions';

interface CourseFormDialogProps {
    open: boolean;
    editingCourseId: string | null;
    course: CourseFormState;
    fileInputRef: RefObject<HTMLInputElement | null>;
    isUploading: boolean;
    onClose: () => void;
    onSubmit: () => void;
    onCourseChange: (course: CourseFormState | ((prev: CourseFormState) => CourseFormState)) => void;
    onThumbnailUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const CourseFormDialog = ({
    open,
    editingCourseId,
    course,
    fileInputRef,
    isUploading,
    onClose,
    onSubmit,
    onCourseChange,
    onThumbnailUpload,
}: CourseFormDialogProps) => (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="dark max-w-md p-0 overflow-hidden rounded-[32px] sm:rounded-[32px] border-none shadow-2xl bg-[#09090b] text-slate-100 flex flex-col h-[90vh] sm:h-[85vh]">
            <div className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between font-sans">
                <button onClick={onClose} className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
                    Отмена
                </button>
                <h2 className="text-base font-black uppercase tracking-widest text-foreground">
                    {editingCourseId ? 'Редактирование курса' : 'Новый курс'}
                </h2>
                <button
                    onClick={onSubmit}
                    disabled={!course.title || isUploading}
                    className="text-sm font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors disabled:opacity-30"
                >
                    {editingCourseId ? 'Сохр.' : 'Создать'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8 space-y-10 pb-32">
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Обложка курса</Label>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "group relative aspect-video w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-3",
                            course.cover_url ? "border-transparent" : "border-border hover:border-primary/50 bg-muted/30"
                        )}
                    >
                        {course.cover_url ? (
                            <img src={course.cover_url} className="w-full h-full object-cover" alt="Course Thumbnail" />
                        ) : (
                            <>
                                <div className="w-12 h-12 rounded-2xl bg-[#18181b] flex items-center justify-center text-muted-foreground group-hover:text-primary transition-all group-hover:scale-110 shadow-sm border border-white/5">
                                    {isUploading ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                                    ) : (
                                        <ImageIcon size={24} />
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Загрузить изображение</p>
                                    <p className="text-[8px] font-bold text-muted-foreground/40 mt-1 uppercase tracking-wider">Рекомендуем 16:9</p>
                                </div>
                            </>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onThumbnailUpload} />

                        {course.cover_url && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-widest text-white">
                                    Изменить
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Название</Label>
                        <CharCounter current={course.title.length} max={50} />
                    </div>
                    <Input
                        className="h-12 w-full rounded-2xl border-border/60 bg-muted/20 px-4 text-sm font-bold transition-all focus:ring-2 focus:ring-primary/20"
                        value={course.title}
                        onChange={(e) => onCourseChange(prev => ({ ...prev, title: e.target.value.slice(0, 50) }))}
                        placeholder="Напр. Мастер технического анализа"
                    />
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Описание</Label>
                        <CharCounter current={(course.description || '').length} max={500} />
                    </div>
                    <Textarea
                        className="min-h-[120px] w-full rounded-2xl border-border/60 bg-muted/20 px-4 py-3 text-sm font-medium transition-all focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
                        value={course.description}
                        onChange={(e) => onCourseChange(prev => ({ ...prev, description: e.target.value.slice(0, 500) }))}
                        placeholder="Кратко опишите, чему научатся студенты..."
                    />
                </div>

                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Стратегия доступа</Label>
                    <div className="grid grid-cols-3 items-center justify-center rounded-2xl bg-muted/30 p-1.5 text-muted-foreground border border-border/40">
                        {courseUnlockOptions.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => onCourseChange(prev => ({ ...prev, unlock_type: type.id }))}
                                className={cn(
                                    "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-2 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all",
                                    course.unlock_type === type.id ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'hover:text-foreground/80 opacity-60'
                                )}
                                type="button"
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/40 rounded-2xl">
                    <div className="space-y-0.5">
                        <Label className="text-xs font-black uppercase tracking-tight text-foreground">Только VIP</Label>
                        <p className="text-[9px] font-bold text-muted-foreground opacity-60 uppercase tracking-tighter">Доступ для платной группы</p>
                    </div>
                    <Switch checked={course.is_vip} onCheckedChange={(checked) => onCourseChange(prev => ({ ...prev, is_vip: checked }))} />
                </div>

                {course.unlock_type !== 'open' && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                            {course.unlock_type === 'level_based' ? 'Требуемый уровень' : 'Задержка (дни)'}
                        </Label>
                        <Select value={course.unlock_value} onValueChange={(v) => onCourseChange(prev => ({ ...prev, unlock_value: v }))}>
                            <SelectTrigger className="h-12 w-full rounded-2xl border-border/60 bg-muted/20 px-4 font-bold">
                                <SelectValue placeholder="Выбрать" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-border/60 shadow-xl p-1">
                                {course.unlock_type === 'level_based' ? (
                                    [1, 2, 3, 5, 10, 20].map(lv => (
                                        <SelectItem key={lv} value={lv.toString()} className="rounded-xl h-10 font-bold text-xs uppercase tracking-widest">
                                            Уровень {lv}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <>
                                        {[1, 2, 3, 5, 10, 20].map(lv => (
                                            <SelectItem key={lv} value={lv.toString()} className="rounded-xl h-10 font-bold text-xs uppercase tracking-widest">
                                                {lv} дн.
                                            </SelectItem>
                                        ))}
                                        {[1, 2, 3].map(m => (
                                            <SelectItem key={`m${m}`} value={`${m}m`} className="rounded-xl h-10 font-bold text-xs uppercase tracking-widest">
                                                {m} {m === 1 ? 'месяц' : 'месяца'}
                                            </SelectItem>
                                        ))}
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="flex items-center justify-between rounded-3xl border border-border/40 bg-muted/20 p-5">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-black uppercase tracking-tight text-foreground">Опубликован</Label>
                        <p className="text-[10px] font-bold text-muted-foreground opacity-60">Сразу виден студентам</p>
                    </div>
                    <Switch checked={course.is_published} onCheckedChange={(checked) => onCourseChange(prev => ({ ...prev, is_published: checked }))} className="data-[state=checked]:bg-primary" />
                </div>
            </div>

            <div className="sticky bottom-0 left-0 right-0 bg-[#09090b]/95 backdrop-blur-xl border-t border-white/10 px-6 pt-5 pb-10 z-50">
                <Button
                    onClick={onSubmit}
                    disabled={!course.title || isUploading}
                    className="w-full h-14 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
                >
                    {isUploading ? "Загрузка..." : editingCourseId ? "СОХРАНИТЬ" : "Создать курс"}
                </Button>
            </div>
        </DialogContent>
    </Dialog>
);
