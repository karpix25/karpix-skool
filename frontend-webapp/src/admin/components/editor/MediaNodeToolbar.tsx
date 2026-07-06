import { AlignCenter, AlignLeft, AlignRight, ExternalLink, Trash2 } from 'lucide-react';

import {
    LESSON_MEDIA_ALIGN_OPTIONS,
    LESSON_MEDIA_WIDTH_OPTIONS,
    type LessonMediaAlign,
    type LessonMediaWidth,
} from '../../../lib/lessonMedia';

interface MediaNodeToolbarProps {
    align: LessonMediaAlign;
    width: LessonMediaWidth;
    onAlignChange: (align: LessonMediaAlign) => void;
    onWidthChange: (width: LessonMediaWidth) => void;
    onDelete: () => void;
    onOpen?: () => void;
}

const ALIGN_ICONS = {
    left: AlignLeft,
    center: AlignCenter,
    right: AlignRight,
};

export const MediaNodeToolbar = ({
    align,
    width,
    onAlignChange,
    onWidthChange,
    onDelete,
    onOpen,
}: MediaNodeToolbarProps) => (
    <div
        className="mt-2 flex w-full flex-col gap-2 rounded-lg border border-border bg-card/95 p-2 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        contentEditable={false}
    >
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {LESSON_MEDIA_WIDTH_OPTIONS.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={(event) => {
                        event.preventDefault();
                        onWidthChange(option.value);
                    }}
                    className={`min-h-11 min-w-14 rounded-md px-3 text-sm font-semibold transition active:scale-[0.98] ${width === option.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground'
                        }`}
                    aria-pressed={width === option.value}
                >
                    {option.label}
                </button>
            ))}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {LESSON_MEDIA_ALIGN_OPTIONS.map((option) => {
                const Icon = ALIGN_ICONS[option.value];

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={(event) => {
                            event.preventDefault();
                            onAlignChange(option.value);
                        }}
                        className={`flex min-h-11 min-w-11 items-center justify-center rounded-md transition active:scale-[0.98] ${align === option.value
                            ? 'bg-primary/10 text-primary'
                            : 'bg-secondary text-muted-foreground'
                            }`}
                        aria-label={option.label}
                        aria-pressed={align === option.value}
                    >
                        <Icon className="h-5 w-5" />
                    </button>
                );
            })}

            <div className="ml-auto flex items-center gap-1">
                {onOpen && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.preventDefault();
                            onOpen();
                        }}
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-md bg-secondary text-muted-foreground transition active:scale-[0.98]"
                        aria-label="Открыть медиа"
                    >
                        <ExternalLink className="h-5 w-5" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={(event) => {
                        event.preventDefault();
                        onDelete();
                    }}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-md bg-destructive/10 text-destructive transition active:scale-[0.98]"
                    aria-label="Удалить медиа"
                >
                    <Trash2 className="h-5 w-5" />
                </button>
            </div>
        </div>
    </div>
);
