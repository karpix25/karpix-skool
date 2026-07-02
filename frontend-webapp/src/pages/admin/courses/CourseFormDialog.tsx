import type { ChangeEvent, RefObject } from 'react';
import { Image as ImageIcon } from 'lucide-react';

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
    isSubmitting: boolean;
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
    isSubmitting,
    onClose,
    onSubmit,
    onCourseChange,
    onThumbnailUpload,
}: CourseFormDialogProps) => (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl sm:rounded-2xl border border-border shadow-md bg-card text-foreground flex flex-col h-[90vh] sm:h-[85vh]">
            <div className="sticky top-0 z-50 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-border bg-card/90 px-4 py-3 font-sans backdrop-blur-xl sm:px-6">
                <button onClick={onClose} className="flex h-11 items-center justify-self-start rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25">
                    Отмена
                </button>
                <DialogTitle className="min-w-0 truncate text-center text-base font-semibold text-foreground">
                    {editingCourseId ? 'Редактирование курса' : 'Новый курс'}
                </DialogTitle>
                <button
                    onClick={onSubmit}
                    disabled={!course.title || isUploading || isSubmitting}
                    className="flex h-11 items-center justify-self-end rounded-lg px-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-30"
                >
                    {isSubmitting ? '...' : editingCourseId ? 'Сохр.' : 'Создать'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8 space-y-10 pb-32">
                <div className="space-y-3">
                    <Label className="text-xs font-medium text-muted-foreground">Обложка курса</Label>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        aria-label={course.cover_url ? 'Изменить обложку курса' : 'Загрузить обложку курса'}
                        className={cn(
                            "group relative aspect-video w-full rounded-lg border border-dashed transition-colors cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-75",
                            course.cover_url ? "border-transparent" : "border-border hover:border-primary/50 bg-muted/30"
                        )}
                    >
                        {course.cover_url ? (
                            <img src={course.cover_url} className="w-full h-full object-cover" alt="Course Thumbnail" />
                        ) : (
                            <>
                                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shadow-sm border border-border">
                                    {isUploading ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                                    ) : (
                                        <ImageIcon size={24} />
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-medium text-muted-foreground">Загрузить изображение</p>
                                    <p className="mt-1 text-[11px] font-medium text-muted-foreground/60">Рекомендуем 16:9</p>
                                </div>
                            </>
                        )}
                        {course.cover_url && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="rounded-md border border-border bg-card/90 px-4 py-2 text-xs font-medium text-foreground backdrop-blur-md">
                                    Изменить
                                </div>
                            </div>
                        )}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onThumbnailUpload} />
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label className="text-xs font-medium text-muted-foreground">Название</Label>
                        <CharCounter current={course.title.length} max={50} />
                    </div>
                    <Input
                        className="h-12 w-full rounded-lg border-border bg-muted/20 px-4 text-sm font-bold transition-all focus:ring-2 focus:ring-primary/20"
                        value={course.title}
                        onChange={(e) => onCourseChange(prev => ({ ...prev, title: e.target.value.slice(0, 50) }))}
                        placeholder="Напр. Мастер технического анализа"
                    />
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label className="text-xs font-medium text-muted-foreground">Описание</Label>
                        <CharCounter current={(course.description || '').length} max={500} />
                    </div>
                    <Textarea
                        className="min-h-[120px] w-full rounded-lg border-border bg-muted/20 px-4 py-3 text-sm font-medium transition-all focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
                        value={course.description}
                        onChange={(e) => onCourseChange(prev => ({ ...prev, description: e.target.value.slice(0, 500) }))}
                        placeholder="Кратко опишите, чему научатся студенты..."
                    />
                </div>

                <div className="space-y-4">
                    <Label className="text-xs font-medium text-muted-foreground">Стратегия доступа</Label>
                    <div
                        className="grid grid-cols-1 items-center justify-center rounded-lg border border-border/40 bg-muted/30 p-1 text-muted-foreground min-[360px]:grid-cols-3"
                        role="group"
                        aria-label="Стратегия доступа курса"
                    >
                        {courseUnlockOptions.map((type) => (
                            <button
                                key={type.id}
                                aria-pressed={course.unlock_type === type.id}
                                onClick={() => onCourseChange(prev => ({ ...prev, unlock_type: type.id }))}
                                className={cn(
                                    "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-md px-2 text-xs font-medium transition-all",
                                    course.unlock_type === type.id ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'hover:text-foreground/80 opacity-60'
                                )}
                                type="button"
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/40 rounded-lg">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-semibold text-foreground">Только VIP</Label>
                        <p className="text-xs font-medium text-muted-foreground opacity-70">Доступ для платной группы</p>
                    </div>
                    <Switch checked={course.is_vip} onCheckedChange={(checked) => onCourseChange(prev => ({ ...prev, is_vip: checked }))} />
                </div>

                {course.unlock_type !== 'open' && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                        <Label className="text-xs font-medium text-muted-foreground">
                            {course.unlock_type === 'level_based' ? 'Требуемый уровень' : 'Задержка (дни)'}
                        </Label>
                        <Select value={course.unlock_value} onValueChange={(v) => onCourseChange(prev => ({ ...prev, unlock_value: v }))}>
                            <SelectTrigger className="h-12 w-full rounded-lg border-border/60 bg-muted/20 px-4 font-bold">
                                <SelectValue placeholder="Выбрать" />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg border-border/60 shadow-md p-1">
                                {course.unlock_type === 'level_based' ? (
                                    [1, 2, 3, 5, 10, 20].map(lv => (
                                        <SelectItem key={lv} value={lv.toString()} className="min-h-11 rounded-xl text-xs font-medium">
                                            Уровень {lv}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <>
                                        {[1, 2, 3, 5, 10, 20].map(lv => (
                                            <SelectItem key={lv} value={lv.toString()} className="min-h-11 rounded-xl text-xs font-medium">
                                                {lv} дн.
                                            </SelectItem>
                                        ))}
                                        {[1, 2, 3].map(m => (
                                            <SelectItem key={`m${m}`} value={`${m}m`} className="min-h-11 rounded-xl text-xs font-medium">
                                                {m} {m === 1 ? 'месяц' : 'месяца'}
                                            </SelectItem>
                                        ))}
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-5">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-semibold text-foreground">Опубликован</Label>
                        <p className="text-xs font-medium text-muted-foreground opacity-70">Сразу виден студентам</p>
                    </div>
                    <Switch checked={course.is_published} onCheckedChange={(checked) => onCourseChange(prev => ({ ...prev, is_published: checked }))} />
                </div>
            </div>

            <div className="sticky bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border px-6 pt-5 pb-10 z-50">
                <Button
                    onClick={onSubmit}
                    disabled={!course.title || isUploading || isSubmitting}
                    className="h-12 w-full rounded-lg bg-primary text-xs font-medium text-white shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99]"
                >
                    {isUploading ? "Загрузка..." : isSubmitting ? "Сохранение..." : editingCourseId ? "Сохранить" : "Создать курс"}
                </Button>
            </div>
        </DialogContent>
    </Dialog>
);
