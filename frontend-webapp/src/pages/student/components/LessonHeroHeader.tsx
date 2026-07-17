import React from 'react';

import { toUploadedMediaUrl } from '../../../lib/uploadedMedia';
import type { LessonContent } from '../../../types/course';
import { cn } from '../../../lib/utils';

interface LessonHeroHeaderProps {
    lesson: LessonContent;
}

export const LessonHeroHeader: React.FC<LessonHeroHeaderProps> = ({ lesson }) => {
    const coverUrl = toUploadedMediaUrl(lesson.cover_url);
    const hasIcon = Boolean(lesson.icon_emoji);

    return (
        <header className="border-b border-border/70 bg-background">
            {coverUrl && (
                <div className="h-36 overflow-hidden bg-muted sm:h-48">
                    <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                </div>
            )}

            <div
                className={cn(
                    'mx-auto max-w-3xl px-5 pb-5 min-[380px]:px-6 md:px-10',
                    coverUrl ? '-mt-8' : 'pt-6',
                )}
            >
                {hasIcon && (
                    <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl border border-border bg-card text-4xl shadow-sm dark:shadow-none">
                        {lesson.icon_emoji}
                    </div>
                )}
                <h2 className="break-words text-2xl font-semibold leading-tight text-foreground min-[380px]:text-3xl">
                    {lesson.title}
                </h2>
            </div>
        </header>
    );
};
