import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CatalogFilterBar } from './CatalogFilterBar';
import { defaultCatalogFilters } from './catalogFilters';

describe('CatalogFilterBar', () => {
    it('renders compact search and horizontally scrollable filter groups', () => {
        render(
            <CatalogFilterBar
                filters={defaultCatalogFilters}
                categories={['AI']}
                tags={['ChatGPT']}
                onChange={vi.fn()}
            />,
        );

        expect(screen.getByRole('textbox', { name: 'Поиск материалов' })).toHaveAttribute('placeholder', 'Поиск по каталогу...');
        expect(screen.getByRole('group', { name: 'Фильтр по типу материала' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Фильтр по доступу' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Фильтр по категории' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Фильтр по тегу' })).toBeInTheDocument();
        expect(within(screen.getByRole('group', { name: 'Фильтр по типу материала' })).getByRole('button', { name: 'Все' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('keeps chip selection and sort controls wired to the existing filter state', () => {
        const onChange = vi.fn();

        render(
            <CatalogFilterBar
                filters={{ ...defaultCatalogFilters, contentType: 'prompt', sort: 'title' }}
                categories={['AI']}
                tags={['ChatGPT']}
                onChange={onChange}
            />,
        );

        expect(screen.getByRole('button', { name: 'Промпты' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'AI' }));
        expect(onChange).toHaveBeenCalledWith({ category: 'AI' });

        fireEvent.click(screen.getByRole('button', { name: 'Открыть дополнительные фильтры' }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Сортировка' })).toHaveValue('title');
    });

    it('resets every catalog filter from the compact settings dialog', () => {
        const onChange = vi.fn();

        render(
            <CatalogFilterBar
                filters={{ ...defaultCatalogFilters, query: 'ai', contentType: 'prompt', access: 'vip', category: 'AI', tag: 'ChatGPT', sort: 'title' }}
                categories={['AI']}
                tags={['ChatGPT']}
                onChange={onChange}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Открыть дополнительные фильтры' }));
        fireEvent.click(screen.getByRole('button', { name: 'Сбросить' }));

        expect(onChange).toHaveBeenCalledWith(defaultCatalogFilters);
    });
});
