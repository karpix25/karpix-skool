import React, { useMemo, useState } from 'react';
import { Filter, Search } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { defaultCatalogFilters, type CatalogAccess, type CatalogContentType, type CatalogFilters } from './catalogFilters';
import { CatalogChipRail, type CatalogChipOption } from './CatalogChipRail';

interface CatalogFilterBarProps {
    filters: CatalogFilters;
    categories: string[];
    tags: string[];
    onChange: (update: Partial<CatalogFilters>) => void;
}

const contentTypeOptions: CatalogChipOption[] = [
    { value: 'all', label: 'Все' },
    { value: 'course', label: 'Курсы' },
    { value: 'guide', label: 'Гайды' },
    { value: 'prompt', label: 'Промпты' },
    { value: 'checklist', label: 'Чек-листы' },
];

const accessOptions: CatalogChipOption[] = [
    { value: 'all', label: 'Все' },
    { value: 'in-progress', label: 'В процессе' },
    { value: 'open', label: 'Открытые' },
    { value: 'vip', label: 'VIP' },
    { value: 'locked', label: 'Заблокированные' },
    { value: 'completed', label: 'Завершённые' },
];

const toOptions = (items: string[], allLabel: string): CatalogChipOption[] => [
    { value: 'all', label: allLabel },
    ...items.map((item) => ({ value: item, label: item })),
];

const hasRareFilter = (filters: CatalogFilters) => (
    filters.sort !== 'newest' || filters.category !== 'all' || filters.tag !== 'all'
);

export const CatalogFilterBar: React.FC<CatalogFilterBarProps> = ({
    filters,
    categories,
    tags,
    onChange,
}) => {
    const [isSortOpen, setIsSortOpen] = useState(false);
    const categoryOptions = useMemo(() => toOptions(categories, 'Все'), [categories]);
    const tagOptions = useMemo(() => toOptions(tags, 'Все'), [tags]);
    const rareFilterActive = hasRareFilter(filters);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/80 p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <Search size={17} className="ml-2 shrink-0 text-muted-foreground" aria-hidden="true" />
                <Input
                    aria-label="Поиск материалов"
                    value={filters.query}
                    onChange={(event) => onChange({ query: event.target.value })}
                    placeholder="Поиск по каталогу..."
                    className="h-10 min-h-10 border-0 bg-transparent px-2 shadow-none focus-visible:border-transparent focus-visible:ring-0"
                />
                <button
                    type="button"
                    aria-label="Открыть дополнительные фильтры"
                    aria-expanded={isSortOpen}
                    onClick={() => setIsSortOpen(true)}
                    className={cn(
                        'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                        rareFilterActive && 'bg-primary/10 text-primary',
                    )}
                >
                    <Filter size={17} aria-hidden="true" />
                    {rareFilterActive && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
                </button>
            </div>

            <CatalogChipRail
                label="Тип материала"
                ariaLabel="Фильтр по типу материала"
                options={contentTypeOptions}
                value={filters.contentType}
                onChange={(contentType) => onChange({ contentType: contentType as CatalogContentType })}
            />
            <CatalogChipRail
                label="Доступ"
                ariaLabel="Фильтр по доступу"
                options={accessOptions}
                value={filters.access}
                onChange={(access) => onChange({ access: access as CatalogAccess })}
            />
            {categories.length > 0 && (
                <CatalogChipRail
                    label="Категория"
                    ariaLabel="Фильтр по категории"
                    options={categoryOptions}
                    value={filters.category}
                    onChange={(category) => onChange({ category })}
                />
            )}
            {tags.length > 0 && (
                <CatalogChipRail
                    label="Теги"
                    ariaLabel="Фильтр по тегу"
                    options={tagOptions}
                    value={filters.tag}
                    onChange={(tag) => onChange({ tag })}
                />
            )}

            <Dialog open={isSortOpen} onOpenChange={setIsSortOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Настройки каталога</DialogTitle>
                        <DialogDescription>Настройте порядок отображения материалов.</DialogDescription>
                    </DialogHeader>
                    <label className="space-y-2 text-sm font-semibold">
                        <span>Сортировка</span>
                        <select
                            aria-label="Сортировка"
                            value={filters.sort}
                            onChange={(event) => onChange({ sort: event.target.value as CatalogFilters['sort'] })}
                            className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-normal"
                        >
                            <option value="newest">Сначала новые</option>
                            <option value="title">По названию</option>
                        </select>
                    </label>
                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => {
                                onChange(defaultCatalogFilters);
                                setIsSortOpen(false);
                            }}
                            className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                        >
                            Сбросить
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
