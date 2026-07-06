import { SlidersHorizontal } from 'lucide-react';

import type { LessonMediaAlign, LessonMediaWidth } from '../../../lib/lessonMedia';
import { MediaNodeBottomSheet } from './MediaNodeBottomSheet';

interface MediaNodeToolbarProps {
    align: LessonMediaAlign;
    isOpen: boolean;
    width: LessonMediaWidth;
    onAlignChange: (align: LessonMediaAlign) => void;
    onWidthChange: (width: LessonMediaWidth) => void;
    onDelete: () => void;
    onOpen?: () => void;
    onOpenChange: (isOpen: boolean) => void;
}

const MEDIA_ALIGN_LABELS: Record<LessonMediaAlign, string> = {
    left: 'слева',
    center: 'центр',
    right: 'справа',
};

const stopEditorEvent = (event: { preventDefault: () => void; stopPropagation: () => void }) => {
    event.preventDefault();
    event.stopPropagation();
};

export const MediaNodeToolbar = ({
    align,
    isOpen,
    width,
    onAlignChange,
    onWidthChange,
    onDelete,
    onOpen,
    onOpenChange,
}: MediaNodeToolbarProps) => {
    return (
        <div className="mt-2 flex justify-center" contentEditable={false}>
            <button
                type="button"
                onMouseDown={stopEditorEvent}
                onClick={(event) => {
                    stopEditorEvent(event);
                    onOpenChange(true);
                }}
                className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-border bg-card/95 px-3 text-sm font-semibold text-muted-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <span className="truncate">{width} · {MEDIA_ALIGN_LABELS[align]}</span>
            </button>

            <MediaNodeBottomSheet
                align={align}
                isOpen={isOpen}
                width={width}
                onAlignChange={onAlignChange}
                onDelete={onDelete}
                onOpenChange={onOpenChange}
                onOpenMedia={onOpen}
                onWidthChange={onWidthChange}
            />
        </div>
    );
};
