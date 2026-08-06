import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as shareLinks from '../../../lib/shareLinks';
import { LessonHtmlContent } from './LessonHtmlContent';

describe('LessonHtmlContent', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

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
        expect(wrapper).toHaveClass('[&_pre]:max-w-full');
        expect(wrapper).toHaveClass('[&_img]:max-w-full');
        expect(screen.getByRole('img', { name: 'Cover' })).toBeInTheDocument();
    });

    it('renders lesson headings and emphasis inside the lesson content theme', () => {
        const { container } = render(
            <LessonHtmlContent html="<h2>Практическое задание</h2><p>Создайте <strong>отчет</strong>.</p>" />
        );

        expect(screen.getByRole('heading', { name: 'Практическое задание' })).toBeInTheDocument();
        expect(screen.getByText('отчет')).toBeInTheDocument();
        expect(container.firstElementChild).toHaveClass('lesson-content-prose');
    });

    it('disables regular lesson text selection while keeping code selectable', () => {
        const { container } = render(
            <LessonHtmlContent html="<p>Нельзя копировать</p><pre><code>copy_me()</code></pre>" />
        );

        expect(container.firstElementChild).toHaveClass('lesson-copy-guard');
        expect(screen.getByText('copy_me()')).toBeInTheDocument();
    });

    it('keeps code multiline, wraps long lines, and copies only code text', async () => {
        const copyTextToClipboard = vi.spyOn(shareLinks, 'copyTextToClipboard').mockResolvedValue('copied');
        render(<LessonHtmlContent html={'<pre><code>const first = 1;\nconst second = 2;</code></pre>'} />);

        const code = screen.getByText(/const first/);
        const pre = code.closest('pre');
        const button = screen.getByRole('button', { name: 'Скопировать код' });

        expect(pre).toHaveClass('lesson-code-block');
        expect(pre?.textContent).toContain('const first = 1;\nconst second = 2;');

        fireEvent.click(button);

        await waitFor(() => expect(button).toHaveTextContent('Скопировано'));
        expect(button).toHaveAccessibleName('Скопировано');
        expect(copyTextToClipboard).toHaveBeenCalledWith('const first = 1;\nconst second = 2;');
        expect(screen.queryByRole('button', { name: 'Развернуть код' })).not.toBeInTheDocument();
    });

    it('collapses long code, expands it, and shows the course favorite only on the first card', () => {
        const onFavoriteToggle = vi.fn();
        const longCode = Array.from({ length: 10 }, (_, index) => `const line${index} = ${index};`).join('\n');

        render(
            <LessonHtmlContent
                html={`<pre><code>${longCode}</code></pre><pre><code>short()</code></pre>`}
                isFavorite
                onFavoriteToggle={onFavoriteToggle}
            />
        );

        const expandButton = screen.getByRole('button', { name: 'Развернуть код' });
        expect(expandButton).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getAllByRole('button', { name: 'Убрать курс из избранного' })).toHaveLength(1);
        expect(screen.queryAllByRole('button', { name: 'Добавить курс в избранное' })).toHaveLength(0);

        expandButton.click();

        expect(screen.getByRole('button', { name: 'Свернуть код' })).toHaveAttribute('aria-expanded', 'true');
        screen.getByRole('button', { name: 'Убрать курс из избранного' }).click();
        expect(onFavoriteToggle).toHaveBeenCalledOnce();
    });

    it('explains when the platform requires manual copying', async () => {
        vi.spyOn(shareLinks, 'copyTextToClipboard').mockResolvedValue('manual');
        render(<LessonHtmlContent html="<pre><code>copy_me()</code></pre>" />);

        const button = screen.getByRole('button', { name: 'Скопировать код' });
        fireEvent.click(button);

        await waitFor(() => expect(button).toHaveTextContent('Скопируйте вручную'));
        expect(button).toHaveAccessibleName('Скопируйте код вручную');
    });
});
