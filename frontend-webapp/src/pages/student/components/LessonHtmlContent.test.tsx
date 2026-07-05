import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LessonHtmlContent } from './LessonHtmlContent';

describe('LessonHtmlContent', () => {
    it('keeps wide lesson HTML contained inside the lesson body', () => {
        const { container } = render(
            <LessonHtmlContent html="<table><tbody><tr><td>Wide</td></tr></tbody></table><pre>code</pre><img src='https://cdn.example.com/a.jpg' alt='Cover' />" />
        );

        const wrapper = container.firstElementChild;
        expect(wrapper).toHaveClass('min-w-0');
        expect(wrapper).toHaveClass('[&_table]:overflow-x-auto');
        expect(wrapper).toHaveClass('[&_pre]:overflow-x-auto');
        expect(wrapper).toHaveClass('[&_img]:max-w-full');
        expect(screen.getByRole('img', { name: 'Cover' })).toBeInTheDocument();
    });
});
