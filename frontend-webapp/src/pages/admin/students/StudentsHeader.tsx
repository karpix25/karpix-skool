import { Search } from 'lucide-react';

import { Input } from '../../../components/ui/input';

interface StudentsHeaderProps {
    onSearchTermChange: (value: string) => void;
    searchTerm: string;
}

export const StudentsHeader = ({ onSearchTermChange, searchTerm }: StudentsHeaderProps) => (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Роли школы</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-foreground md:text-3xl">
                Студенты
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Участники, роли и прогресс выбранной школы.
            </p>
        </div>

        <div className="w-full sm:max-w-sm lg:w-80">
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Поиск по имени..."
                    className="h-12 rounded-lg border-border bg-card pl-10 shadow-sm"
                    value={searchTerm}
                    onChange={(event) => onSearchTermChange(event.target.value)}
                />
            </div>
        </div>
    </header>
);
