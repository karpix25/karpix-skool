import { useEffect, useMemo, useRef } from 'react';

import { copyTextToClipboard } from '../../../lib/shareLinks';
import { sanitizeLessonHtml } from '../lessonHtmlSafety';

interface LessonHtmlContentProps {
    html: string;
    isFavorite?: boolean;
    favoritePending?: boolean;
    onFavoriteToggle?: () => void;
}

export const LessonHtmlContent = ({
    html,
    isFavorite = false,
    favoritePending = false,
    onFavoriteToggle,
}: LessonHtmlContentProps) => {
    const safeHtml = useMemo(() => sanitizeLessonHtml(html), [html]);
    const contentRef = useRef<HTMLDivElement>(null);
    const favoriteToggleRef = useRef(onFavoriteToggle);
    const hasFavoriteToggle = Boolean(onFavoriteToggle);

    useEffect(() => {
        favoriteToggleRef.current = onFavoriteToggle;
    }, [onFavoriteToggle]);

    useEffect(() => {
        const content = contentRef.current;
        if (!content) return;

        const timers: number[] = [];
        const codeBlocks = Array.from(content.querySelectorAll('pre'));
        const createFavoriteButton = () => {
            const favoriteButton = document.createElement('button');
            favoriteButton.type = 'button';
            favoriteButton.className = 'lesson-code-favorite-button';
            favoriteButton.dataset.lessonFavoriteButton = 'true';
            favoriteButton.addEventListener('click', () => favoriteToggleRef.current?.());
            return favoriteButton;
        };

        codeBlocks.forEach((pre, index) => {
            const existingCard = pre.parentElement?.matches('[data-lesson-code-card]') ? pre.parentElement : null;
            if (existingCard) {
                const favoriteButton = existingCard.querySelector('[data-lesson-favorite-button]');
                if (index === 0 && hasFavoriteToggle && !favoriteButton) {
                    existingCard.querySelector('.lesson-code-actions')?.append(createFavoriteButton());
                } else if (index !== 0 || !hasFavoriteToggle) {
                    favoriteButton?.remove();
                }
                return;
            }

            const code = pre.firstElementChild?.tagName.toLowerCase() === 'code'
                ? pre.firstElementChild
                : pre;
            const codeText = code.textContent ?? '';
            const card = document.createElement('div');
            const isLong = codeText.split('\n').length > 8 || codeText.length > 480 || pre.scrollHeight > 320;
            card.className = `lesson-code-card${isLong ? ' is-collapsed' : ''}`;
            card.dataset.lessonCodeCard = 'true';
            pre.id = `lesson-code-block-${index}`;
            pre.classList.add('lesson-code-block');
            pre.setAttribute('data-lesson-code-content', 'true');
            pre.replaceWith(card);
            card.append(pre);

            if (isLong) {
                const fade = document.createElement('div');
                fade.className = 'lesson-code-fade';
                fade.setAttribute('aria-hidden', 'true');
                card.append(fade);

                const expandButton = document.createElement('button');
                expandButton.type = 'button';
                expandButton.className = 'lesson-code-expand-button';
                expandButton.setAttribute('aria-controls', pre.id);
                expandButton.setAttribute('aria-expanded', 'false');
                expandButton.setAttribute('aria-label', 'Развернуть код');
                expandButton.textContent = '⌄';
                expandButton.addEventListener('click', () => {
                    const expanded = card.classList.toggle('is-expanded');
                    card.classList.toggle('is-collapsed', !expanded);
                    expandButton.setAttribute('aria-expanded', String(expanded));
                    expandButton.setAttribute('aria-label', expanded ? 'Свернуть код' : 'Развернуть код');
                    expandButton.textContent = expanded ? '⌃' : '⌄';
                });
                card.append(expandButton);
            }

            const actions = document.createElement('div');
            actions.className = 'lesson-code-actions';
            const copyButton = document.createElement('button');
            copyButton.type = 'button';
            copyButton.className = 'lesson-code-copy-button';
            copyButton.setAttribute('aria-label', 'Скопировать код');
            copyButton.setAttribute('aria-live', 'polite');
            copyButton.textContent = 'Скопировать';

            copyButton.addEventListener('click', async () => {
                copyButton.disabled = true;
                copyButton.setAttribute('aria-label', 'Копирую код');
                copyButton.textContent = 'Копирую…';

                const status = await copyTextToClipboard(codeText);
                copyButton.disabled = false;
                if (status !== 'copied') {
                    copyButton.setAttribute('aria-label', 'Скопируйте код вручную');
                    copyButton.textContent = 'Скопируйте вручную';
                    timers.push(window.setTimeout(() => {
                        copyButton.setAttribute('aria-label', 'Скопировать код');
                        copyButton.textContent = 'Скопировать';
                    }, 3000));
                    return;
                }

                copyButton.setAttribute('aria-label', 'Скопировано');
                copyButton.textContent = 'Скопировано';
                timers.push(window.setTimeout(() => {
                    copyButton.setAttribute('aria-label', 'Скопировать код');
                    copyButton.textContent = 'Скопировать';
                }, 2000));
            });

            actions.append(copyButton);

            if (index === 0 && hasFavoriteToggle) actions.append(createFavoriteButton());

            card.append(actions);
        });

        return () => {
            timers.forEach((timer) => window.clearTimeout(timer));
        };
    }, [hasFavoriteToggle, safeHtml]);

    useEffect(() => {
        const favoriteButton = contentRef.current?.querySelector<HTMLButtonElement>('[data-lesson-favorite-button]');
        if (!favoriteButton) return;

        favoriteButton.disabled = favoritePending;
        favoriteButton.classList.toggle('is-active', isFavorite);
        favoriteButton.setAttribute('aria-pressed', String(isFavorite));
        favoriteButton.setAttribute('aria-label', isFavorite ? 'Убрать курс из избранного' : 'Добавить курс в избранное');
        favoriteButton.textContent = isFavorite ? '♥' : '♡';
    }, [favoritePending, hasFavoriteToggle, isFavorite, safeHtml]);

    return (
        <div
            ref={contentRef}
            className="lesson-html-content lesson-content-prose lesson-copy-guard prose min-w-0 max-w-none [&_iframe]:max-w-full [&_img]:h-auto [&_img]:max-w-full [&_pre]:max-w-full [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:whitespace-nowrap"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
    );
};
