export type LessonMediaWidth = '35%' | '50%' | '75%' | '100%';
export type LessonMediaAlign = 'left' | 'center' | 'right';

export const LESSON_MEDIA_WIDTH_OPTIONS: Array<{ value: LessonMediaWidth; label: string }> = [
    { value: '35%', label: '35%' },
    { value: '50%', label: '50%' },
    { value: '75%', label: '75%' },
    { value: '100%', label: '100%' },
];

export const LESSON_MEDIA_ALIGN_OPTIONS: Array<{ value: LessonMediaAlign; label: string }> = [
    { value: 'left', label: 'Слева' },
    { value: 'center', label: 'Центр' },
    { value: 'right', label: 'Справа' },
];

const MEDIA_WIDTH_VALUES = new Set<LessonMediaWidth>(
    LESSON_MEDIA_WIDTH_OPTIONS.map((option) => option.value)
);

const MEDIA_ALIGN_VALUES = new Set<LessonMediaAlign>(
    LESSON_MEDIA_ALIGN_OPTIONS.map((option) => option.value)
);

const SAFE_MEDIA_WIDTH_PATTERN = /^([1-9][0-9]{0,3})(px|%)?$/;
const EXTENDED_ALIGN_VALUES = new Set(['left', 'center', 'right', 'wide', 'full']);

export const normalizeLessonMediaWidth = (value: unknown): LessonMediaWidth => {
    if (typeof value === 'string' && MEDIA_WIDTH_VALUES.has(value as LessonMediaWidth)) {
        return value as LessonMediaWidth;
    }

    return '100%';
};

export const normalizeLessonMediaAlign = (value: unknown): LessonMediaAlign => {
    if (typeof value === 'string' && MEDIA_ALIGN_VALUES.has(value as LessonMediaAlign)) {
        return value as LessonMediaAlign;
    }

    return 'center';
};

export const isSafeLessonMediaWidth = (value: string) => {
    const match = SAFE_MEDIA_WIDTH_PATTERN.exec(value);
    if (!match) return false;

    const amount = Number(match[1]);
    const unit = match[2];
    return unit === '%' ? amount <= 100 : amount <= 2000;
};

export const isSafeLessonMediaAlign = (value: string) => (
    EXTENDED_ALIGN_VALUES.has(value)
);

export const getLessonMediaWidthClass = (width: LessonMediaWidth) => ({
    '35%': 'w-[35%] min-w-32 max-w-full',
    '50%': 'w-1/2 min-w-44 max-w-full',
    '75%': 'w-3/4 max-w-full',
    '100%': 'w-full max-w-full',
}[width]);

export const getLessonMediaAlignClass = (align: LessonMediaAlign) => ({
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto',
}[align]);
