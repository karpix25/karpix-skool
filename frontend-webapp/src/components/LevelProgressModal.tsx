import React from 'react';
import { AlertCircle, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { useAuth } from '../context/AuthContext';
import {
    DEFAULT_LEVEL_THRESHOLDS,
    getLevelProgress,
    milestonesFromThresholds,
    thresholdsFromMilestones,
} from './level/levelProgress';
import { LevelMilestoneCard } from './level/LevelMilestoneCard';
import { DEFAULT_XP_SOURCES } from './level/defaultXpSources';
import { useWebAppLevels } from './level/useWebAppLevels';
import { XpSourceList } from './level/XpSourceList';

interface LevelProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LevelProgressModal: React.FC<LevelProgressModalProps> = ({ isOpen, onClose }) => {
    const { membership, getLevelName, activeTenantId } = useAuth();
    const { data, isLoading, error } = useWebAppLevels(isOpen && !!membership, activeTenantId);

    if (!membership) return null;

    const currentLevel = membership.level || 1;
    const currentXP = membership.xp || 0;
    const thresholds = thresholdsFromMilestones(data?.milestones);
    const milestones = data?.milestones?.length
        ? data.milestones
        : milestonesFromThresholds(DEFAULT_LEVEL_THRESHOLDS);
    const xpSources = data?.xp_sources?.length ? data.xp_sources : DEFAULT_XP_SOURCES;
    const progress = getLevelProgress(currentXP, currentLevel, thresholds);
    const center = 60;
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress.progressPercent / 100) * circumference;

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1rem)] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-border bg-background p-0 text-foreground">
                <div className="sticky top-0 z-10 border-b border-border/70 bg-background px-5 pb-4 pt-5">
                    <div className="flex items-start gap-4 pr-10">
                        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                            <svg aria-hidden="true" viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                                <circle
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    fill="transparent"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    className="text-muted"
                                />
                                <circle
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    fill="transparent"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    className="text-primary transition-all duration-700"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-semibold leading-none text-foreground">
                                    {currentLevel}
                                </span>
                                <span className="mt-1 text-[11px] font-medium text-muted-foreground">
                                    уровень
                                </span>
                            </div>
                        </div>

                        <div className="min-w-0 flex-1 pt-1">
                            <DialogTitle className="pr-0 text-xl font-semibold leading-tight">
                                {getLevelName(currentLevel)}
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-sm">
                                {(currentXP ?? 0).toLocaleString()} / {progress.isMaxLevel ? 'MAX' : progress.nextThreshold.toLocaleString()} XP
                            </DialogDescription>

                            {!progress.isMaxLevel && (
                                <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
                                    <Zap size={16} className="shrink-0 fill-primary" />
                                    <span className="min-w-0">
                                        {progress.xpToNextLevel.toLocaleString()} XP до уровня {progress.nextLevel}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
                    {error && (
                        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}. Показываю базовые пороги XP.</span>
                        </div>
                    )}

                    {isLoading && !data && (
                        <div className="rounded-xl border border-border/70 bg-card p-3 text-sm text-muted-foreground">
                            Загружаю правила уровней...
                        </div>
                    )}

                    <section>
                        <div className="mb-3 flex items-end justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">Уровни и доступы</h3>
                                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                                    Здесь показаны только реальные открытия, привязанные к курсам, модулям и урокам.
                                </p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {milestones.map((milestone, index) => (
                                <LevelMilestoneCard
                                    key={milestone.level}
                                    milestone={milestone}
                                    currentLevel={currentLevel}
                                    getLevelName={getLevelName}
                                    isLast={index === milestones.length - 1}
                                />
                            ))}
                        </div>
                    </section>

                    <XpSourceList sources={xpSources} />
                </div>
            </DialogContent>
        </Dialog>
    );
};
