import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlignCenter, AlignLeft, AlignRight, ExternalLink, Trash2, X } from 'lucide-react';

import {
    LESSON_MEDIA_ALIGN_OPTIONS,
    LESSON_MEDIA_WIDTH_OPTIONS,
    type LessonMediaAlign,
    type LessonMediaWidth,
} from '../../../lib/lessonMedia';

interface MediaNodeBottomSheetProps {
    align: LessonMediaAlign;
    isOpen: boolean;
    width: LessonMediaWidth;
    onAlignChange: (align: LessonMediaAlign) => void;
    onDelete: () => void;
    onOpenChange: (isOpen: boolean) => void;
    onOpenMedia?: () => void;
    onWidthChange: (width: LessonMediaWidth) => void;
}

const ALIGN_ICONS = {
    left: AlignLeft,
    center: AlignCenter,
    right: AlignRight,
};

const stopEditorEvent = (event: { preventDefault: () => void; stopPropagation: () => void }) => {
    event.preventDefault();
    event.stopPropagation();
};

export const MediaNodeBottomSheet = ({
    align,
    isOpen,
    width,
    onAlignChange,
    onDelete,
    onOpenChange,
    onOpenMedia,
    onWidthChange,
}: MediaNodeBottomSheetProps) => (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-[130] bg-foreground/25 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
                className="fixed inset-x-0 bottom-0 z-[140] mx-auto max-h-[82dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-card-foreground shadow-[0_-16px_48px_rgba(15,23,42,0.18)] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
                contentEditable={false}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <DialogPrimitive.Title className="text-base font-semibold leading-6 text-foreground">
                            Настройки медиа
                        </DialogPrimitive.Title>
                        <DialogPrimitive.Description className="text-sm leading-5 text-muted-foreground">
                            Размер и позиция в уроке
                        </DialogPrimitive.Description>
                    </div>
                    <button
                        type="button"
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px"
                        aria-label="Закрыть настройки медиа"
                        onClick={(event) => {
                            stopEditorEvent(event);
                            onOpenChange(false);
                        }}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Размер
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {LESSON_MEDIA_WIDTH_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={(event) => {
                                        stopEditorEvent(event);
                                        onWidthChange(option.value);
                                    }}
                                    className={`min-h-12 rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px ${width === option.value
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary text-muted-foreground hover:bg-accent'
                                        }`}
                                    aria-pressed={width === option.value}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Выравнивание
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {LESSON_MEDIA_ALIGN_OPTIONS.map((option) => {
                                const Icon = ALIGN_ICONS[option.value];

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={(event) => {
                                            stopEditorEvent(event);
                                            onAlignChange(option.value);
                                        }}
                                        className={`flex min-h-12 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px ${align === option.value
                                            ? 'bg-primary/10 text-primary'
                                            : 'bg-secondary text-muted-foreground hover:bg-accent'
                                            }`}
                                        aria-pressed={align === option.value}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="hidden min-[360px]:inline">{option.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        {onOpenMedia && (
                            <button
                                type="button"
                                onClick={(event) => {
                                    stopEditorEvent(event);
                                    onOpenChange(false);
                                    onOpenMedia();
                                }}
                                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-secondary px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px"
                            >
                                <ExternalLink className="h-5 w-5" />
                                Открыть
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={(event) => {
                                stopEditorEvent(event);
                                onDelete();
                                onOpenChange(false);
                            }}
                            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-destructive/10 px-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px"
                        >
                            <Trash2 className="h-5 w-5" />
                            Удалить
                        </button>
                    </div>
                </div>
            </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
);
