import { CheckCircle2, ClipboardCheck, MessageSquareText } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { cn } from '../../../lib/utils';
import { getApprovalStatusLabel } from './status';
import type {
    CourseGenerationApprovalStatus,
    CourseGenerationBlueprint,
} from './types';

interface BlueprintReviewPanelProps {
    blueprint?: CourseGenerationBlueprint | null;
    approvalStatus?: CourseGenerationApprovalStatus;
    disabled?: boolean;
    pendingAction?: 'approve' | 'request_changes' | null;
    onApprove?: (blueprint: CourseGenerationBlueprint) => void;
    onRequestChanges?: (blueprint: CourseGenerationBlueprint) => void;
    className?: string;
}

export const BlueprintReviewPanel = ({
    blueprint,
    approvalStatus = 'pending',
    disabled = false,
    pendingAction = null,
    onApprove,
    onRequestChanges,
    className,
}: BlueprintReviewPanelProps) => {
    const lessonCount = blueprint?.modules.reduce((total, module) => total + module.lessons.length, 0) || 0;
    const canAct = Boolean(blueprint) && !disabled;

    return (
        <section className={cn('rounded-xl border border-border/80 bg-card p-4 sm:p-5', className)}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                        Проверка blueprint
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground">
                        {blueprint ? `${blueprint.modules.length} модулей · ${lessonCount} уроков` : 'План курса еще не создан'}
                    </p>
                </div>
                <Badge variant={approvalStatus === 'rejected' ? 'destructive' : 'outline'}>
                    {getApprovalStatusLabel(approvalStatus)}
                </Badge>
            </div>

            {!blueprint ? (
                <InlineAlert
                    title="Blueprint появится после обработки источников"
                    description="NotebookLM-черновик останется на проверке перед публикацией."
                />
            ) : (
                <div className="space-y-4">
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                        <p className="text-sm font-semibold text-foreground">{blueprint.title}</p>
                        {blueprint.summary && (
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{blueprint.summary}</p>
                        )}
                    </div>

                    {blueprint.warnings && blueprint.warnings.length > 0 && (
                        <InlineAlert
                            variant="info"
                            title="Есть предупреждения"
                            description={blueprint.warnings.join(' · ')}
                        />
                    )}

                    <div className="space-y-3">
                        {blueprint.modules.map((module, moduleIndex) => (
                            <article
                                key={module.id || `${module.title}-${moduleIndex}`}
                                className="rounded-lg border border-border/70 bg-background p-4"
                            >
                                <div className="mb-3">
                                    <p className="text-sm font-semibold text-foreground">{module.title}</p>
                                    {module.summary && (
                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{module.summary}</p>
                                    )}
                                </div>
                                <ol className="space-y-2">
                                    {module.lessons.map((lesson, lessonIndex) => (
                                        <li
                                            key={lesson.id || `${lesson.title}-${lessonIndex}`}
                                            className="flex gap-3 rounded-md bg-muted/30 px-3 py-2"
                                        >
                                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                                                {lessonIndex + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground">{lesson.title}</p>
                                                {lesson.learning_goal && (
                                                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                                                        {lesson.learning_goal}
                                                    </p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </article>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        {onRequestChanges && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={!canAct || pendingAction !== null}
                                onClick={() => blueprint && onRequestChanges(blueprint)}
                                className="h-11 rounded-lg text-xs font-semibold"
                            >
                                <MessageSquareText className="mr-2 h-4 w-4" />
                                {pendingAction === 'request_changes' ? 'Отправляем' : 'Запросить правки'}
                            </Button>
                        )}
                        {onApprove && (
                            <Button
                                type="button"
                                disabled={!canAct || pendingAction !== null}
                                onClick={() => blueprint && onApprove(blueprint)}
                                className="h-11 rounded-lg text-xs font-semibold"
                            >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                {pendingAction === 'approve' ? 'Одобряем' : 'Одобрить blueprint'}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};
