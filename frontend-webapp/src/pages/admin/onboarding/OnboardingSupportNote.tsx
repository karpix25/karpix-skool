import React from 'react';
import { HelpCircle } from 'lucide-react';

export const OnboardingSupportNote: React.FC = () => (
    <div className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3 text-muted-foreground">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-xs leading-5">
            Канал поддержки пока не настроен. Если шаг не проходит, сохраните текст ошибки — он поможет быстрее разобраться.
        </p>
    </div>
);
