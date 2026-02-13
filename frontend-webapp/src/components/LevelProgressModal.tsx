import React from 'react';
import { X, Check, Zap, Flame, Trophy } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
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
    const { membership } = useAuth();

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

    const getLevelTitle = (lvl: number) => {
        if (lvl <= 2) return "Новичок";
        if (lvl <= 4) return "Ученик";
        if (lvl <= 6) return "Подмастерье";
        if (lvl <= 8) return "Эксперт";
        return "Грандмастер";
    };

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-md w-full bg-[#0a0f1c] border-white/10 p-0 overflow-hidden text-white rounded-[32px]">
                <div className="relative p-6 flex flex-col items-center">
                    {/* Close Button */}
                    <div className="absolute top-4 right-4 z-10">
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-white/60">
                            <X size={20} />
                        </Button>
                    </div>

                    {/* Circular Progress Header */}
                    <div className="mt-4 mb-6 relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r={radius}
                                fill="transparent"
                                stroke="#1e293b"
                                strokeWidth="8"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r={radius}
                                fill="transparent"
                                stroke="#3b82f6"
                                strokeWidth="8"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-white">{currentLevel}</span>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">УРОВЕНЬ</span>
                        </div>
                    </div>

                    {/* Title & Stats */}
                    <h2 className="text-xl font-bold mb-1">{getLevelTitle(currentLevel)}</h2>
                    <p className="text-sm text-white/60 font-medium mb-6">
                        {currentXP.toLocaleString()} / {isMaxLevel ? "MAX" : nextThreshold.toLocaleString()} опыта
                    </p>

                    {/* Next Level Banner */}
                    {!isMaxLevel && (
                        <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 flex items-center justify-center gap-2 mb-8">
                            <Zap size={16} className="text-blue-400 fill-blue-400" />
                            <span className="text-sm font-bold text-blue-400">
                                {nextThreshold - currentXP} опыта до следующего уровня
                            </span>
                        </div>
                    )}

                    {/* Levels Timeline */}
                    <div className="w-full space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                        {[1, 5, 6, 9].map((lvl, index, arr) => {
                            const isAchieved = currentLevel >= lvl;
                            const isCurrent = currentLevel === lvl || (currentLevel > lvl && (index === arr.length - 1 || currentLevel < arr[index + 1]));

                            return (
                                <div key={lvl} className={cn(
                                    "relative w-full rounded-2xl p-4 transition-all border",
                                    isAchieved || isCurrent
                                        ? "bg-[#1e293b]/50 border-white/10"
                                        : "bg-[#0f172a] border-white/5 opacity-60"
                                )}>
                                    {/* Connection Line */}
                                    {index < arr.length - 1 && (
                                        <div className={cn(
                                            "absolute left-[26px] top-[100%] h-4 w-0.5 z-0",
                                            currentLevel >= arr[index + 1] ? "bg-blue-500" : "bg-white/10"
                                        )} />
                                    )}

                                    <div className="flex items-start gap-4 relative z-10">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm",
                                            isAchieved ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                                : "bg-[#1e293b] text-white/30"
                                        )}>
                                            {isAchieved ? <Check size={18} strokeWidth={3} /> : lvl}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className={cn("font-bold text-sm", isAchieved ? "text-white" : "text-white/50")}>
                                                    Уровень {lvl}: {getLevelTitle(lvl)}
                                                </h3>
                                                {isCurrent && (
                                                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">СЕЙЧАС</span>
                                                )}
                                                {isAchieved && !isCurrent && (
                                                    <Check size={14} className="text-blue-500" />
                                                )}
                                            </div>

                                            <p className="text-xs text-blue-400 font-medium mb-3">
                                                Требуется {LEVEL_THRESHOLDS[lvl].toLocaleString()} опыта
                                            </p>

                                            <div className="flex items-center gap-2 text-xs text-white/50">
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
                    </div>
                </div>

                {/* Footer - How to earn */}
                <div className="bg-[#0f172a] p-6 border-t border-white/5">
                    <h3 className="font-bold mb-4 text-sm text-white/80">Как заработать опыт</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                    <Trophy size={20} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold">Прохождение уроков</div>
                                    <div className="text-xs text-white/40">Завершение модулей</div>
                                </div>
                            </div>
                            <span className="font-bold text-green-400 text-sm">+10 XP</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                                    <Flame size={20} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold">Активность</div>
                                    <div className="text-xs text-white/40">Участие в жизни школы</div>
                                </div>
                            </div>
                            <span className="font-bold text-green-400 text-sm">~ XP</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
