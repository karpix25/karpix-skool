import { Users } from 'lucide-react';

import { Card } from '../../../components/ui/card';

export const StudentsEmptyState = () => (
    <Card className="flex flex-col items-center justify-center rounded-xl border-dashed border-border/80 bg-card p-12 text-center sm:p-20">
        <Users className="h-16 w-16 text-muted-foreground/70" />
        <div className="mt-4 space-y-1">
            <h3 className="text-lg font-semibold text-foreground">Студенты не найдены</h3>
            <p className="text-sm text-muted-foreground">Попробуйте другой поиск или фильтр.</p>
        </div>
    </Card>
);
