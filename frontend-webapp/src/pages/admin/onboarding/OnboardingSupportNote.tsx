import React from 'react';
import { ExternalLink, HelpCircle } from 'lucide-react';

interface OnboardingSupportNoteProps {
    supportUrl?: string | null;
}

export const OnboardingSupportNote: React.FC<OnboardingSupportNoteProps> = ({ supportUrl }) => (
    <div className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-3 text-muted-foreground">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 text-xs leading-5">
            <p>{supportUrl ? 'Если шаг не проходит, откройте поддержку школы.' : 'Канал поддержки пока не настроен. Добавьте HTTPS-ссылку в настройках школы.'}</p>
            {supportUrl && (
                <a
                    href={supportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex min-h-11 items-center whitespace-nowrap rounded-lg border border-border bg-card px-3 font-medium text-foreground"
                >
                    Открыть поддержку
                    <ExternalLink className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </a>
            )}
        </div>
    </div>
);
