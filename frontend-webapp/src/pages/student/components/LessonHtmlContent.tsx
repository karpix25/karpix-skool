import { useMemo } from 'react';

import { sanitizeLessonHtml } from '../lessonHtmlSafety';

interface LessonHtmlContentProps {
    html: string;
}

export const LessonHtmlContent = ({ html }: LessonHtmlContentProps) => {
    const safeHtml = useMemo(() => sanitizeLessonHtml(html), [html]);

    return (
        <div
            className="lesson-html-content lesson-content-prose lesson-copy-guard prose min-w-0 max-w-none [&_code]:break-words [&_iframe]:max-w-full [&_img]:h-auto [&_img]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:whitespace-nowrap"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
    );
};
