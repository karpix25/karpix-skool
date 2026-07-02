import React from 'react';
import { Check, Zap, Flame, Trophy } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface LevelProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LEVEL_THRESHOLDS: Record<number, number> = {
    1: 0,
    2: 100,
    3: 300,
    4: 800,
    5: 2000,
    6: 3000,
    7: 5000,
    8: 7500,
    9: 10000
};

export const LevelProgressModal: React.FC<LevelProgressModalProps> = ({ isOpen, onClose }) => {
    const { membership, getLevelName } = useAuth();

    if (!membership) return null;

    const currentLevel = membership.level;
    const currentXP = membership.xp;
    const nextLevel = Math.min(currentLevel + 1, 9);
    const prevThreshold = LEVEL_THRESHOLDS[currentLevel] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[nextLevel] || 10000;

    // Progress calculation relative to current level range
    const xpInLevel = Math.max(0, currentXP - prevThreshold);
    const xpNeededForLevel = Math.max(1, nextThreshold - prevThreshold);
    const progressPercent = Math.min(100, (xpInLevel / xpNeededForLevel) * 100);
    const isMaxLevel = currentLevel >= 9;

    // Circular Progress Calculation
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border-border bg-card p-0 text-card-foreground">
                <div className="relative flex flex-1 flex-col items-center overflow-y-auto p-5 scrollbar-hide">

                    {/* Circular Progress Header */}
                    <div className="relative mb-5 mt-3 flex h-32 w-32 items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r={radius}
                                fill="transparent"
                                stroke="#e2e8f0"
                                strokeWidth="8"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r={radius}
                                fill="transparent"
                                stroke="#135bec"
                                strokeWidth="8"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold text-foreground">{currentLevel}</span>
                            <span className="text-[11px] font-semibold text-muted-foreground">уровень</span>
                        </div>
                    </div>

                    {/* Title & Stats */}
                    <DialogTitle className="mb-1 pr-0 text-center text-xl font-semibold">{getLevelName(currentLevel)}</DialogTitle>
                    <p className="mb-6 text-sm font-medium text-muted-foreground">
                        {(currentXP ?? 0).toLocaleString()} / {isMaxLevel ? "MAX" : (nextThreshold ?? 10000).toLocaleString()} опыта
                    </p>

                    {/* Next Level Banner */}
                    {!isMaxLevel && (
                        <div className="mb-8 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                            <Zap size={16} className="fill-primary text-primary" />
                            <span className="text-sm font-semibold text-primary">
                                {nextThreshold - currentXP} опыта до следующего уровня
                            </span>
                        </div>
                    )}

                    {/* Levels Timeline */}
                    <div className="w-full space-y-3 pb-4 pr-1">
                        {Array.from({ length: 9 }, (_, i) => i + 1).map((lvl, index, arr) => {
                            const isAchieved = currentLevel >= lvl;
                            const isCurrent = currentLevel === lvl || (currentLevel > lvl && (index === arr.length - 1 || currentLevel < arr[index + 1]));

                            return (
                                <div key={lvl} className={cn(
                                    "relative w-full rounded-xl border p-4 transition-colors",
                                    isAchieved || isCurrent
                                        ? "border-primary/20 bg-primary/5"
                                        : "border-border/70 bg-muted/20 opacity-80"
                                )}>
                                    {/* Connection Line */}
                                    {index < arr.length - 1 && (
                                        <div className={cn(
                                            "absolute left-[26px] top-[100%] h-4 w-0.5 z-0",
                                            currentLevel >= arr[index + 1] ? "bg-primary" : "bg-border"
                                        )} />
                                    )}

                                    <div className="flex items-start gap-4 relative z-10">
                                        <div className={cn(
                                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
                                            isAchieved ? "bg-primary text-white"
                                                : "bg-background text-muted-foreground"
                                        )}>
                                            {isAchieved ? <Check size={18} strokeWidth={3} /> : lvl}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className={cn("text-sm font-semibold", isAchieved ? "text-foreground" : "text-muted-foreground")}>
                                                    Уровень {lvl}: {getLevelName(lvl)}
                                                </h3>
                                                {isCurrent && (
                                                    <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">Сейчас</span>
                                                )}
                                                {isAchieved && !isCurrent && (
                                                    <Check size={14} className="text-primary" />
                                                )}
                                            </div>

                                            <p className="mb-3 text-xs font-medium text-primary">
                                                Требуется {(LEVEL_THRESHOLDS[lvl] ?? 0).toLocaleString()} опыта
                                            </p>

                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                {lvl === 1 && "🎓 Базовый доступ к сообществу"}
                                                {lvl === 5 && "🎨 Разблокировка кастомных баннеров профиля"}
                                                {lvl === 6 && "📂 Доступ к библиотеке ресурсов"}
                                                {lvl === 9 && "🏆 VIP значок и секретный канал"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Footer - How to earn (Now inside the scrollable area) */}
                        <div className="mt-8 border-t border-border/70 pt-6">
                            <h3 className="mb-4 text-sm font-semibold text-foreground">Как заработать опыт</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <Trophy size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold">Прохождение уроков</div>
                                            <div className="text-xs text-muted-foreground">Завершение модулей</div>
                                        </div>
                                    </div>
                                    <span className="text-sm font-semibold text-green-600">+10 XP</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                                            <Flame size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold">Активность</div>
                                            <div className="text-xs text-muted-foreground">Участие в жизни школы</div>
                                        </div>
                                    </div>
                                    <span className="text-sm font-semibold text-green-600">~ XP</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
