import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LessonHtmlContent } from './LessonHtmlContent';

describe('LessonHtmlContent', () => {
    it('keeps wide lesson HTML contained inside the lesson body', () => {
        const { container } = render(
            <LessonHtmlContent html="<table><tbody><tr><td>Wide</td></tr></tbody></table><pre>code</pre><img src='https://cdn.example.com/a.jpg' alt='Cover' />" />
        );

        const wrapper = container.firstElementChild;
        const forbiddenThemeClass = ['dark', 'prose', 'invert'].join(':');
        expect(wrapper).toHaveClass('min-w-0');
        expect(wrapper).toHaveClass('prose');
        expect(wrapper).toHaveClass('lesson-content-prose');
        expect(wrapper?.className).not.toContain(forbiddenThemeClass);
        expect(wrapper).toHaveClass('[&_table]:overflow-x-auto');
        expect(wrapper).toHaveClass('[&_pre]:overflow-x-auto');
        expect(wrapper).toHaveClass('[&_img]:max-w-full');
        expect(screen.getByRole('img', { name: 'Cover' })).toBeInTheDocument();
    });

    it('renders lesson headings and emphasis inside the fixed light content theme', () => {
        const { container } = render(
            <LessonHtmlContent html="<h2>Практическое задание</h2><p>Создайте <strong>отчет</strong>.</p>" />
        );

        expect(screen.getByRole('heading', { name: 'Практическое задание' })).toBeInTheDocument();
        expect(screen.getByText('отчет')).toBeInTheDocument();
        expect(container.firstElementChild).toHaveClass('lesson-content-prose');
    });
});
