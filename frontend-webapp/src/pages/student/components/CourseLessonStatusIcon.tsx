import React from 'react';
import { CheckCircle, Lock, PlayCircle } from 'lucide-react';

import { cn } from '../../../lib/utils';
import type { CourseLessonSummary } from '../../../types/course';

interface CourseLessonStatusIconProps {
    lesson: CourseLessonSummary;
    isLocked: boolean;
}

export const CourseLessonStatusIcon: React.FC<CourseLessonStatusIconProps> = ({ lesson, isLocked }) => {
    const isCompleted = Boolean(lesson.is_completed);
    const hasEmojiIcon = Boolean(lesson.icon_emoji && !isCompleted && !isLocked);

    return (
        <span
            className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                isCompleted
                    ? 'bg-green-500/10 text-green-600'
                    : isLocked
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary/10 text-primary',
                hasEmojiIcon && 'bg-card text-xl shadow-sm ring-1 ring-border',
            )}
            aria-hidden="true"
        >
            {isCompleted ? <CheckCircle size={18} /> : isLocked ? <Lock size={16} /> : lesson.icon_emoji || <PlayCircle size={20} />}
        </span>
    );
};
