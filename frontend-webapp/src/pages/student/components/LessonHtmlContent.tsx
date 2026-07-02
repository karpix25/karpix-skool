import { useMemo } from 'react';

import { sanitizeLessonHtml } from '../lessonHtmlSafety';

interface LessonHtmlContentProps {
    html: string;
}

export const LessonHtmlContent = ({ html }: LessonHtmlContentProps) => {
    const safeHtml = useMemo(() => sanitizeLessonHtml(html), [html]);

    return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />;
};
