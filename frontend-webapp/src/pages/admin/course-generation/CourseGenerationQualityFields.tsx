import { ChevronDown } from 'lucide-react';

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
        <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
                <Label className="ml-1 text-xs font-medium text-muted-foreground">Кто студент</Label>
                <Input
                    value={form.targetAudience}
                    onChange={(event) => onChange(prev => ({ ...prev, targetAudience: event.target.value }))}
                    placeholder="Владельцы малого бизнеса"
                    disabled={disabled}
                    className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                />
            </div>
            <div className="space-y-2">
                <Label className="ml-1 text-xs font-medium text-muted-foreground">Точка А</Label>
                <Input
                    value={form.pointA}
                    onChange={(event) => onChange(prev => ({ ...prev, pointA: event.target.value }))}
                    placeholder="Что умеет сейчас"
                    disabled={disabled}
                    className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                />
            </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
                <Label className="ml-1 text-xs font-medium text-muted-foreground">Точка Б</Label>
                <Input
                    value={form.pointB}
                    onChange={(event) => onChange(prev => ({ ...prev, pointB: event.target.value }))}
                    placeholder="Что должен уметь"
                    disabled={disabled}
                    className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                />
            </div>
            <div className="space-y-2">
                <Label className="ml-1 text-xs font-medium text-muted-foreground">Главная выгода</Label>
                <Input
                    value={form.globalBenefit}
                    onChange={(event) => onChange(prev => ({ ...prev, globalBenefit: event.target.value }))}
                    placeholder="Результат после курса"
                    disabled={disabled}
                    className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                />
            </div>
        </div>

        <div className="space-y-2">
            <Label className="ml-1 text-xs font-medium text-muted-foreground">Опыт автора</Label>
            <Textarea
                value={form.authorExperience}
                onChange={(event) => onChange(prev => ({ ...prev, authorExperience: event.target.value }))}
                placeholder="Кейсы, подход, личный опыт"
                disabled={disabled}
                className="min-h-20 rounded-lg border-border bg-muted/30 text-sm font-medium"
            />
        </div>

        <details className="group rounded-lg border border-border/60 bg-muted/20 p-3">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground">
                Дополнительно
                <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
            </summary>
            <div className="mt-3 space-y-4">
                <div className="space-y-2">
                    <Label className="ml-1 text-xs font-medium text-muted-foreground">Цель курса</Label>
                    <Textarea
                        value={form.courseGoal}
                        onChange={(event) => onChange(prev => ({ ...prev, courseGoal: event.target.value }))}
                        placeholder="Практическая трансформация"
                        disabled={disabled}
                        className="min-h-20 rounded-lg border-border bg-background/70 text-sm font-medium"
                    />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label className="ml-1 text-xs font-medium text-muted-foreground">Уровень</Label>
                        <Input
                            value={form.level}
                            onChange={(event) => onChange(prev => ({ ...prev, level: event.target.value }))}
                            placeholder="Новичок, средний, профи"
                            disabled={disabled}
                            className="h-12 rounded-lg border-border bg-background/70 px-4 text-sm font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="ml-1 text-xs font-medium text-muted-foreground">Формат уроков</Label>
                        <Input
                            value={form.lessonFormat}
                            onChange={(event) => onChange(prev => ({ ...prev, lessonFormat: event.target.value }))}
                            placeholder="Объяснение, пример, задание"
                            disabled={disabled}
                            className="h-12 rounded-lg border-border bg-background/70 px-4 text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label className="ml-1 text-xs font-medium text-muted-foreground">Глубина</Label>
                        <Input
                            value={form.depth}
                            onChange={(event) => onChange(prev => ({ ...prev, depth: event.target.value }))}
                            placeholder="Коротко, подробно, экспертно"
                            disabled={disabled}
                            className="h-12 rounded-lg border-border bg-background/70 px-4 text-sm font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="ml-1 text-xs font-medium text-muted-foreground">Практика</Label>
                        <Input
                            value={form.practiceLevel}
                            onChange={(event) => onChange(prev => ({ ...prev, practiceLevel: event.target.value }))}
                            placeholder="Чеклисты, задания, разборы"
                            disabled={disabled}
                            className="h-12 rounded-lg border-border bg-background/70 px-4 text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="ml-1 text-xs font-medium text-muted-foreground">Стиль текста</Label>
                    <Textarea
                        value={form.style}
                        onChange={(event) => onChange(prev => ({ ...prev, style: event.target.value }))}
                        placeholder="Живой, конкретный, без воды"
                        disabled={disabled}
                        className="min-h-20 rounded-lg border-border bg-background/70 text-sm font-medium"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="ml-1 text-xs font-medium text-muted-foreground">Медиа</Label>
                    <Textarea
                        value={form.mediaStrategy}
                        onChange={(event) => onChange(prev => ({ ...prev, mediaStrategy: event.target.value }))}
                        placeholder="Где ставить картинки, схемы, скриншоты или ручные вставки"
                        disabled={disabled}
                        className="min-h-20 rounded-lg border-border bg-background/70 text-sm font-medium"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="ml-1 text-xs font-medium text-muted-foreground">Free/VIP</Label>
                    <Input
                        value={form.monetizationStrategy}
                        onChange={(event) => onChange(prev => ({ ...prev, monetizationStrategy: event.target.value }))}
                        placeholder="Что оставить бесплатным, а что логично сделать VIP"
                        disabled={disabled}
                        className="h-12 rounded-lg border-border bg-background/70 px-4 text-sm font-medium"
                    />
                </div>
            </div>
        </details>
    </div>
);
