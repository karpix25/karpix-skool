import { Plus, Search } from 'lucide-react';

import { Button } from '../../../components/ui/button';

interface CoursesHeaderProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    onCreate: () => void;
}

export const CoursesHeader = ({ searchQuery, onSearchChange, onCreate }: CoursesHeaderProps) => (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border px-5 sm:px-6 pt-6 pb-5">
        <div className="flex items-center justify-between gap-4 mb-5">
            <div>
                <h1 className="text-2xl font-bold">Контент</h1>
                <p className="text-xs text-muted-foreground">Курсы и учебный план</p>
            </div>
            <Button
                onClick={onCreate}
                className="h-11 rounded-lg bg-primary px-4 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.99] sm:px-5"
            >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Добавить курс</span>
            </Button>
        </div>

        <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
                placeholder="Поиск по курсам..."
                className="w-full bg-card border border-border rounded-lg py-3 pl-11 pr-5 text-[15px] focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60 transition-all font-medium shadow-sm"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
            />
        </div>
    </header>
);
