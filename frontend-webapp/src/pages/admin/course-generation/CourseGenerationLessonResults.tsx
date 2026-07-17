import { AlertTriangle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import type { CourseStructureGenerationState } from './courseStructureGenerationTypes';

interface CourseGenerationLessonResultsProps {
    state: CourseStructureGenerationState;
    isResuming?: boolean;
    onResume?: (includeSourceGaps: boolean) => void;
}

export const CourseGenerationLessonResults = ({
    state,
    isResuming = false,
    onResume,
}: CourseGenerationLessonResultsProps) => {
    const planned = state.planned_lesson_count || 0;
    const ready = state.ready_lesson_count ?? state.created_lessons_count ?? 0;
    const failed = state.failed_lesson_count || 0;
    const sourceGap = state.source_gap_lesson_count || 0;
    const showResults = planned > 0 || ready > 0 || failed > 0 || sourceGap > 0;

    if (!showResults) return null;

    return (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <ResultCount label="Запланировано" value={planned} />
                <ResultCount label="Готово" value={ready} tone="success" />
                <ResultCount label="С ошибкой" value={failed} tone={failed ? 'danger' : 'default'} />
                <ResultCount label="Мало материала" value={sourceGap} tone={sourceGap ? 'warning' : 'default'} />
            </div>

            {state.current_stage && (
                <p className="text-xs text-muted-foreground">Этап: {getStageLabel(state.current_stage)}</p>
            )}

            {state.can_resume && onResume && (
                <div className="flex flex-col gap-2 sm:flex-row">
                    {failed > 0 && (
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={isResuming}
                            onClick={() => onResume(false)}
                            className="h-10 flex-1 rounded-lg text-xs font-semibold"
                        >
                            {isResuming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                            Продолжить генерацию
                        </Button>
                    )}
                    {sourceGap > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isResuming}
                            onClick={() => onResume(true)}
                            className="h-10 flex-1 rounded-lg text-xs font-semibold"
                        >
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Повторить уроки без материала
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};

const ResultCount = ({
    label,
    value,
    tone = 'default',
}: {
    label: string;
    value: number;
    tone?: 'default' | 'success' | 'warning' | 'danger';
}) => {
    const toneClass = {
        default: 'text-foreground',
        success: 'text-success',
        warning: 'text-vip',
        danger: 'text-destructive',
    }[tone];

    return (
        <div className="rounded-md bg-background p-2">
            <div className={`flex items-center gap-1 text-base font-semibold ${toneClass}`}>
                {tone === 'success' && <CheckCircle2 className="h-4 w-4" />}
                {value}
            </div>
            <div className="text-muted-foreground">{label}</div>
        </div>
    );
};

const getStageLabel = (stage: string) => ({
    sources: 'обработка источников',
    planning: 'план курса',
    blueprint: 'структура курса',
    lessons: 'создание уроков',
    review: 'проверка качества',
    drafts: 'сохранение черновиков',
}[stage.toLowerCase()] || stage);
