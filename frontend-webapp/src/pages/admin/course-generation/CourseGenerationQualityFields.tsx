import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import type { CourseStructureGenerationFormState } from './courseStructureGenerationTypes';

interface CourseGenerationQualityFieldsProps {
    form: CourseStructureGenerationFormState;
    disabled?: boolean;
    onChange: (
        form: CourseStructureGenerationFormState | ((prev: CourseStructureGenerationFormState) => CourseStructureGenerationFormState)
    ) => void;
}

export const CourseGenerationQualityFields = ({
    form,
    disabled = false,
    onChange,
}: CourseGenerationQualityFieldsProps) => (
    <div className="space-y-4">
        <div className="space-y-2">
            <Label className="ml-1 text-xs font-medium text-muted-foreground">Цель курса</Label>
            <Textarea
                value={form.courseGoal}
                onChange={(event) => onChange(prev => ({ ...prev, courseGoal: event.target.value }))}
                placeholder="Какую практическую трансформацию должен получить студент"
                disabled={disabled}
                className="min-h-20 rounded-lg border-border bg-muted/30 text-sm font-medium"
            />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
                <Label className="ml-1 text-xs font-medium text-muted-foreground">Аудитория</Label>
                <Input
                    value={form.targetAudience}
                    onChange={(event) => onChange(prev => ({ ...prev, targetAudience: event.target.value }))}
                    placeholder="Например: владельцы малого бизнеса"
                    disabled={disabled}
                    className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                />
            </div>
            <div className="space-y-2">
                <Label className="ml-1 text-xs font-medium text-muted-foreground">Уровень</Label>
                <Input
                    value={form.level}
                    onChange={(event) => onChange(prev => ({ ...prev, level: event.target.value }))}
                    placeholder="Новичок, средний, профи"
                    disabled={disabled}
                    className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                />
            </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
                <Label className="ml-1 text-xs font-medium text-muted-foreground">Формат уроков</Label>
                <Input
                    value={form.lessonFormat}
                    onChange={(event) => onChange(prev => ({ ...prev, lessonFormat: event.target.value }))}
                    placeholder="Объяснение, пример, задание"
                    disabled={disabled}
                    className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                />
            </div>
            <div className="space-y-2">
                <Label className="ml-1 text-xs font-medium text-muted-foreground">Глубина</Label>
                <Input
                    value={form.depth}
                    onChange={(event) => onChange(prev => ({ ...prev, depth: event.target.value }))}
                    placeholder="Коротко, подробно, экспертно"
                    disabled={disabled}
                    className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                />
            </div>
        </div>

        <div className="space-y-2">
            <Label className="ml-1 text-xs font-medium text-muted-foreground">Практика</Label>
            <Input
                value={form.practiceLevel}
                onChange={(event) => onChange(prev => ({ ...prev, practiceLevel: event.target.value }))}
                placeholder="Например: чеклист в каждом уроке и финальное задание в папке"
                disabled={disabled}
                className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
            />
        </div>

        <div className="space-y-2">
            <Label className="ml-1 text-xs font-medium text-muted-foreground">Стиль текста</Label>
            <Textarea
                value={form.style}
                onChange={(event) => onChange(prev => ({ ...prev, style: event.target.value }))}
                placeholder="Живой, конкретный, без воды, с примерами из источников"
                disabled={disabled}
                className="min-h-20 rounded-lg border-border bg-muted/30 text-sm font-medium"
            />
        </div>

        <div className="space-y-2">
            <Label className="ml-1 text-xs font-medium text-muted-foreground">Медиа</Label>
            <Textarea
                value={form.mediaStrategy}
                onChange={(event) => onChange(prev => ({ ...prev, mediaStrategy: event.target.value }))}
                placeholder="Где ставить картинки, схемы, скриншоты или ручные вставки"
                disabled={disabled}
                className="min-h-20 rounded-lg border-border bg-muted/30 text-sm font-medium"
            />
        </div>

        <div className="space-y-2">
            <Label className="ml-1 text-xs font-medium text-muted-foreground">Free/VIP</Label>
            <Input
                value={form.monetizationStrategy}
                onChange={(event) => onChange(prev => ({ ...prev, monetizationStrategy: event.target.value }))}
                placeholder="Что оставить бесплатным, а что логично сделать VIP"
                disabled={disabled}
                className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
            />
        </div>
    </div>
);
