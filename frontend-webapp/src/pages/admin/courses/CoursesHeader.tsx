import { Plus, Search } from 'lucide-react';

import { Button } from '../../../components/ui/button';

interface CoursesHeaderProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    onCreate: () => void;
}

export const CoursesHeader = ({ searchQuery, onSearchChange, onCreate }: CoursesHeaderProps) => (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/40 px-6 pt-8 pb-5">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Курсы</h1>
                <p className="text-xs text-muted-foreground">Управление учебным планом</p>
            </div>
            <Button
                onClick={onCreate}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20 h-10 px-5"
            >
                <Plus className="w-5 h-5" />
                Добавить курс
            </Button>
        </div>

        <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
                placeholder="Поиск по курсам..."
                className="w-full bg-secondary/50 border-none rounded-2xl py-3.5 pl-11 pr-5 text-[15px] focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60 transition-all font-medium"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
            />
        </div>
    </header>
);
