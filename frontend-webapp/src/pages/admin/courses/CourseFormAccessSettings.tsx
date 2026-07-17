import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { cn } from '../../../lib/utils';
import type { CourseFormState } from '../../../types/admin';
import { courseUnlockOptions } from './courseOptions';

interface CourseFormAccessSettingsProps {
    course: CourseFormState;
    onCourseChange: (course: CourseFormState | ((prev: CourseFormState) => CourseFormState)) => void;
}

export const CourseFormAccessSettings = ({
    course,
    onCourseChange,
}: CourseFormAccessSettingsProps) => (
    <div className="space-y-8">
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
                            'inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-md px-2 text-xs font-medium transition-[background-color,color,box-shadow]',
                            course.unlock_type === type.id ? 'border border-border bg-card text-primary shadow-sm ring-1 ring-ring/15' : 'opacity-60 hover:text-foreground/80',
                        )}
                        type="button"
                    >
                        {type.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-4">
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
                <Select value={course.unlock_value} onValueChange={(value) => onCourseChange(prev => ({ ...prev, unlock_value: value }))}>
                    <SelectTrigger className="h-12 w-full rounded-lg border-border/60 bg-muted/20 px-4 font-bold">
                        <SelectValue placeholder="Выбрать" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-border/60 p-1 shadow-md">
                        {course.unlock_type === 'level_based' ? (
                            [1, 2, 3, 5, 10, 20].map(level => (
                                <SelectItem key={level} value={level.toString()} className="min-h-11 rounded-xl text-xs font-medium">
                                    Уровень {level}
                                </SelectItem>
                            ))
                        ) : (
                            <>
                                {[1, 2, 3, 5, 10, 20].map(days => (
                                    <SelectItem key={days} value={days.toString()} className="min-h-11 rounded-xl text-xs font-medium">
                                        {days} дн.
                                    </SelectItem>
                                ))}
                                {[1, 2, 3].map(month => (
                                    <SelectItem key={`m${month}`} value={`${month}m`} className="min-h-11 rounded-xl text-xs font-medium">
                                        {month} {month === 1 ? 'месяц' : 'месяца'}
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
);
