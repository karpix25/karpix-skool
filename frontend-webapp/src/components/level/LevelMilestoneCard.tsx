import React from 'react';
import { BookOpen, Check, FileText, FolderOpen, Gem } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { LevelUnlockTargetType, WebAppLevelMilestone, WebAppLevelUnlock } from '../../types/levels';

interface LevelMilestoneCardProps {
    milestone: WebAppLevelMilestone;
    currentLevel: number;
    getLevelName: (level: number) => string;
    isLast: boolean;
}

const unlockLabels: Record<LevelUnlockTargetType, string> = {
    course: 'Курс',
    module: 'Модуль',
    lesson: 'Урок',
};

const unlockIcons: Record<LevelUnlockTargetType, React.ElementType> = {
    course: BookOpen,
    module: FolderOpen,
    lesson: FileText,
};

const getUnlockContext = (unlock: WebAppLevelUnlock) => {
    if (unlock.target_type === 'course') return 'В каталоге курсов';
    if (unlock.target_type === 'module') return unlock.course_title || 'Внутри курса';

    return [unlock.course_title, unlock.module_title].filter(Boolean).join(' · ') || 'Внутри курса';
};

export const LevelMilestoneCard: React.FC<LevelMilestoneCardProps> = ({
    milestone,
    currentLevel,
    getLevelName,
    isLast,
}) => {
    const isAchieved = currentLevel >= milestone.level;
    const isCurrent = currentLevel === milestone.level;
    const visibleUnlocks = milestone.unlocks.slice(0, 3);
    const hiddenUnlockCount = Math.max(0, milestone.unlocks.length - visibleUnlocks.length);

    return (
        <div
            className={cn(
                'relative rounded-xl border p-3 transition-colors',
                isAchieved ? 'border-primary/25 bg-primary/5' : 'border-border/70 bg-card',
            )}
        >
            {!isLast && (
                <div
                    aria-hidden="true"
                    className={cn(
                        'absolute left-6 top-full h-3 w-0.5',
                        currentLevel > milestone.level ? 'bg-primary' : 'bg-border',
                    )}
                />
            )}

            <div className="relative z-10 flex items-start gap-3">
                <div
                    className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
                        isAchieved ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                >
                    {isAchieved ? <Check size={17} strokeWidth={3} /> : milestone.level}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold leading-snug text-foreground">
                                Уровень {milestone.level}: {getLevelName(milestone.level)}
                            </h3>
                            <p className="mt-0.5 text-xs font-medium text-primary">
                                {milestone.xp_threshold.toLocaleString()} XP
                            </p>
                        </div>
                        {isCurrent && (
                            <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                Сейчас
                            </span>
                        )}
                    </div>

                    {visibleUnlocks.length > 0 ? (
                        <div className="mt-3 space-y-2">
                            {visibleUnlocks.map((unlock) => {
                                const Icon = unlockIcons[unlock.target_type];
                                return (
                                    <div
                                        key={`${unlock.target_type}-${unlock.lesson_id || unlock.module_id || unlock.course_id}`}
                                        className="rounded-lg border border-border/70 bg-background/70 p-2"
                                    >
                                        <div className="flex items-start gap-2">
                                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="text-xs font-semibold text-foreground">
                                                        {unlockLabels[unlock.target_type]}
                                                    </span>
                                                    {unlock.is_vip && (
                                                        <span className="inline-flex items-center gap-1 rounded-md border border-vip/40 bg-vip/10 px-1.5 py-0.5 text-[10px] font-semibold text-vip">
                                                            <Gem size={11} />
                                                            VIP
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-0.5 break-words text-xs font-medium text-foreground">
                                                    {unlock.title}
                                                </p>
                                                <p className="mt-0.5 break-words text-[11px] text-muted-foreground">
                                                    {getUnlockContext(unlock)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {hiddenUnlockCount > 0 && (
                                <p className="text-[11px] font-medium text-muted-foreground">
                                    Еще {hiddenUnlockCount} привязанных открытия
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="mt-3 text-xs leading-5 text-muted-foreground">
                            На этом уровне пока нет привязанного курса, модуля или урока.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
