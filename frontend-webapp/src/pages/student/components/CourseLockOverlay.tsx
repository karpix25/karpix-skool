import { Lock } from 'lucide-react';

import { cn } from '../../../lib/utils';
import type { StudentCourse } from '../../../types/course';
import { getCourseLockPreviewLabel } from './courseStatus';

interface CourseLockOverlayProps {
    course: StudentCourse;
    size?: 'tile' | 'card';
}

export const CourseLockOverlay = ({ course, size = 'tile' }: CourseLockOverlayProps) => {
    const label = getCourseLockPreviewLabel(course);
    if (!label) return null;

    return (
        <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/58 px-3 text-center text-white backdrop-blur-[1px]"
            aria-label={label}
        >
            <div className="flex max-w-full flex-col items-center gap-1.5">
                <span
                    className={cn(
                        "flex items-center justify-center rounded-xl border-2 border-white/90 bg-black/20 text-white shadow-lg",
                        size === 'card' ? "h-11 w-11" : "h-10 w-10"
                    )}
                >
                    <Lock className={size === 'card' ? "h-7 w-7" : "h-6 w-6"} strokeWidth={2.6} />
                </span>
                <span
                    className={cn(
                        "max-w-full break-words font-semibold leading-tight drop-shadow",
                        size === 'card' ? "text-sm" : "text-xs"
                    )}
                >
                    {label}
                </span>
            </div>
        </div>
    );
};
