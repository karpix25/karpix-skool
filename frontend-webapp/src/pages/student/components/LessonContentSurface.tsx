import React from 'react';
import { FileText } from 'lucide-react';

import type { LessonContent } from '../../../types/course';
import { LessonHeroHeader } from './LessonHeroHeader';
import { LessonHtmlContent } from './LessonHtmlContent';
import { LessonVideoPlayer } from './LessonVideoPlayer';
import { StudentStateMessage } from './StudentStateMessage';

interface LessonContentSurfaceProps {
    lesson: LessonContent;
}

export const LessonContentSurface: React.FC<LessonContentSurfaceProps> = ({ lesson }) => (
    <div className="flex-1 space-y-0">
        <LessonHeroHeader lesson={lesson} />
        <LessonVideoPlayer lesson={lesson} />

        <div className="mx-auto max-w-3xl space-y-8 p-5 min-[380px]:p-6 md:p-10">
            {lesson.content ? (
                <article className="prose prose-slate dark:prose-invert max-w-none pb-[calc(10rem+env(safe-area-inset-bottom))] text-foreground leading-relaxed font-sans min-[380px]:pb-[calc(8rem+env(safe-area-inset-bottom))]">
                    <LessonHtmlContent html={lesson.content} />
                </article>
            ) : (
                <StudentStateMessage
                    icon={FileText}
                    title="Материалы урока скоро появятся"
                    description="Когда автор добавит описание, оно появится здесь."
                    className="mb-[calc(10rem+env(safe-area-inset-bottom))] min-[380px]:mb-[calc(8rem+env(safe-area-inset-bottom))]"
                />
            )}
        </div>
    </div>
);
