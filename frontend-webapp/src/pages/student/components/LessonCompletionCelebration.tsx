import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

import { cn } from '../../../lib/utils';
import type { LessonCompletionResponse } from '../../../types/course';

interface LessonCompletionCelebrationProps {
    result: LessonCompletionResponse;
    className?: string;
}

type CelebrationPhase = 'visible' | 'leaving' | 'hidden';

interface CelebrationState {
    phase: CelebrationPhase;
    xp: number;
}

export const LessonCompletionCelebration: React.FC<LessonCompletionCelebrationProps> = ({ result, className }) => {
    const [celebrationState, setCelebrationState] = useState<CelebrationState>({
        phase: result.xp_granted > 0 ? 'visible' : 'hidden',
        xp: result.xp_granted,
    });
    const phase = celebrationState.xp === result.xp_granted ? celebrationState.phase : 'visible';
    const isVisible = result.xp_granted > 0 && phase !== 'hidden';
    const isLeaving = phase === 'leaving';

    useEffect(() => {
        if (result.xp_granted <= 0) return undefined;

        const leaveTimer = window.setTimeout(
            () => setCelebrationState({ phase: 'leaving', xp: result.xp_granted }),
            1400,
        );
        const hideTimer = window.setTimeout(
            () => setCelebrationState({ phase: 'hidden', xp: result.xp_granted }),
            1850,
        );

        return () => {
            window.clearTimeout(leaveTimer);
            window.clearTimeout(hideTimer);
        };
    }, [result.xp_granted]);

    if (!isVisible) return null;

    return (
        <aside
            role="status"
            aria-live="polite"
            className={cn(
                'pointer-events-none flex justify-center transition-all duration-500 ease-out motion-reduce:transition-none',
                isLeaving ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
                className,
            )}
        >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">
                <Sparkles size={16} aria-hidden="true" />
                +{result.xp_granted} XP
            </span>
        </aside>
    );
};
