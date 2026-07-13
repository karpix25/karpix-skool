import React from 'react';
import { FileText } from 'lucide-react';

import type { LessonContent } from '../../../types/course';
import { LessonAttachmentsList } from './LessonAttachmentsList';
import { LessonHeroHeader } from './LessonHeroHeader';
import { LessonHtmlContent } from './LessonHtmlContent';
import { LessonVideoPlayer } from './LessonVideoPlayer';
import { StudentStateMessage } from './StudentStateMessage';

interface LessonContentSurfaceProps {
    afterContent?: React.ReactNode;
    isLocked?: boolean;
    lesson: LessonContent;
}

export const LessonContentSurface: React.FC<LessonContentSurfaceProps> = ({ afterContent, isLocked = false, lesson }) => (
    <div className="flex-1 space-y-0">
        <LessonHeroHeader lesson={lesson} />
        <LessonVideoPlayer lesson={lesson} />

        <div className="mx-auto max-w-3xl space-y-8 p-5 min-[380px]:p-6 md:p-10">
            <LessonAttachmentsList
                attachments={lesson.attachments}
                isLocked={isLocked}
                lessonId={lesson.id}
            />

            {lesson.content ? (
                <article className="max-w-none font-sans leading-relaxed">
                    <LessonHtmlContent html={lesson.content} />
                </article>
            ) : (
                <StudentStateMessage
                    icon={FileText}
                    title="Материалы урока скоро появятся"
                    description="Когда автор добавит описание, оно появится здесь."
                />
            )}

            {afterContent}

            <div
                aria-hidden="true"
                className="h-[calc(10rem+env(safe-area-inset-bottom))] min-[380px]:h-[calc(8rem+env(safe-area-inset-bottom))]"
            />
        </div>
    </div>
);
