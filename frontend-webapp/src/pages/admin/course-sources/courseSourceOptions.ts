import { FileText, Instagram, Link2, Music2, StickyNote, Youtube, type LucideIcon } from 'lucide-react';

import type { CourseGenerationSourceKind } from './courseSourcesTypes';

interface CourseSourceMode {
    kind: CourseGenerationSourceKind;
    label: string;
    Icon: LucideIcon;
}

export const sourceModes: CourseSourceMode[] = [
    { kind: 'link', label: 'Ссылка', Icon: Link2 },
    { kind: 'youtube', label: 'YouTube', Icon: Youtube },
    { kind: 'instagram', label: 'Instagram', Icon: Instagram },
    { kind: 'tiktok', label: 'TikTok', Icon: Music2 },
    { kind: 'file', label: 'Файл', Icon: FileText },
    { kind: 'note', label: 'Заметка', Icon: StickyNote },
];

export const sourceLabels: Record<CourseGenerationSourceKind, string> = {
    link: 'Ссылка',
    youtube: 'YouTube',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    file: 'Файл',
    note: 'Заметка',
};

export const urlSourceKinds: CourseGenerationSourceKind[] = ['link', 'youtube', 'instagram', 'tiktok'];

export const sourcePlaceholders: Record<CourseGenerationSourceKind, string> = {
    link: 'https://example.com/material',
    youtube: 'https://youtube.com/watch?v=...',
    instagram: 'https://instagram.com/reel/...',
    tiktok: 'https://www.tiktok.com/@user/video/...',
    file: '',
    note: '',
};
