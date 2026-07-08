import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { FileText, Link2, Loader2, StickyNote, Trash2, Upload, Youtube } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { getApiErrorMessage } from '../../../services/apiError';
import { uploadCourseGenerationSourceFile } from './courseSourcesApi';
import { createCourseGenerationSource } from './sourceValidation';
import type { CourseGenerationSource, CourseGenerationSourceKind } from './courseSourcesTypes';

interface CourseSourceComposerProps {
    courseId: string;
    disabled?: boolean;
    sources: CourseGenerationSource[];
    onChange: (sources: CourseGenerationSource[]) => void;
}

const sourceModes: Array<{
    kind: CourseGenerationSourceKind;
    label: string;
    Icon: typeof Link2;
}> = [
    { kind: 'link', label: 'Ссылка', Icon: Link2 },
    { kind: 'youtube', label: 'YouTube', Icon: Youtube },
    { kind: 'file', label: 'Файл', Icon: FileText },
    { kind: 'note', label: 'Заметка', Icon: StickyNote },
];

const sourceLabels: Record<CourseGenerationSourceKind, string> = {
    link: 'Ссылка',
    youtube: 'YouTube',
    file: 'Файл',
    note: 'Заметка',
};

export const CourseSourceComposer = ({
    courseId,
    disabled = false,
    sources,
    onChange,
}: CourseSourceComposerProps) => {
    const [activeKind, setActiveKind] = useState<CourseGenerationSourceKind>('link');
    const [urlValue, setUrlValue] = useState('');
    const [titleValue, setTitleValue] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const appendSource = (source: CourseGenerationSource) => {
        onChange([...sources, source]);
    };

    const removeSource = (clientId: string | undefined, index: number) => {
        onChange(sources.filter((source, sourceIndex) => (
            clientId ? source.clientId !== clientId : sourceIndex !== index
        )));
    };

    const addUrlSource = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const cleanUrl = urlValue.trim();
        if (!cleanUrl || disabled) return;

        appendSource(createCourseGenerationSource({
            kind: activeKind === 'youtube' ? 'youtube' : 'link',
            title: titleValue.trim() || undefined,
            url: cleanUrl,
        }));
        setUrlValue('');
        setTitleValue('');
        setError(null);
    };

    const addNoteSource = () => {
        const cleanContent = noteContent.trim();
        if (!cleanContent || disabled) return;

        appendSource(createCourseGenerationSource({
            kind: 'note',
            title: titleValue.trim() || 'Заметка',
            content: cleanContent,
        }));
        setNoteContent('');
        setTitleValue('');
        setError(null);
    };

    const uploadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (!files.length || disabled) return;

        setUploading(true);
        setError(null);
        try {
            const uploadedSources = await Promise.all(
                files.map(file => uploadCourseGenerationSourceFile(courseId, file))
            );
            onChange([...sources, ...uploadedSources]);
        } catch (uploadError) {
            setError(getApiErrorMessage(uploadError, 'Не удалось загрузить файл источника'));
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
                {sourceModes.map(({ kind, label, Icon }) => {
                    const isActive = activeKind === kind;
                    return (
                        <button
                            key={kind}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                                setActiveKind(kind);
                                setError(null);
                            }}
                            className={[
                                'flex h-12 items-center justify-center rounded-lg border text-[11px] font-semibold transition',
                                isActive
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted',
                            ].join(' ')}
                        >
                            <Icon className="h-4 w-4 sm:mr-1.5" />
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    );
                })}
            </div>

            {activeKind === 'file' ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.txt,.md,.docx,.pptx,.csv,.mp3,.m4a,.wav,.mp4,application/pdf,text/plain,text/markdown,text/csv,audio/*,video/mp4"
                        className="hidden"
                        disabled={disabled || uploading}
                        onChange={uploadFiles}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled || uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-12 w-full rounded-lg text-xs font-semibold"
                    >
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {uploading ? 'Загружаем' : 'Выбрать файлы'}
                    </Button>
                </div>
            ) : activeKind === 'note' ? (
                <div className="space-y-3">
                    <Input
                        value={titleValue}
                        onChange={(event) => setTitleValue(event.target.value)}
                        placeholder="Название заметки"
                        disabled={disabled}
                        className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                    />
                    <Textarea
                        value={noteContent}
                        onChange={(event) => setNoteContent(event.target.value)}
                        placeholder="Текст заметки"
                        disabled={disabled}
                        className="min-h-28 rounded-lg border-border bg-muted/30 text-sm font-medium"
                    />
                    <Button
                        type="button"
                        disabled={!noteContent.trim() || disabled}
                        onClick={addNoteSource}
                        className="h-11 rounded-lg text-xs font-semibold"
                    >
                        Добавить заметку
                    </Button>
                </div>
            ) : (
                <form onSubmit={addUrlSource} className="space-y-3">
                    <Input
                        value={urlValue}
                        onChange={(event) => setUrlValue(event.target.value)}
                        placeholder={activeKind === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://example.com/material'}
                        disabled={disabled}
                        className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                    />
                    <Input
                        value={titleValue}
                        onChange={(event) => setTitleValue(event.target.value)}
                        placeholder="Название источника"
                        disabled={disabled}
                        className="h-12 rounded-lg border-border bg-muted/30 px-4 text-sm font-medium"
                    />
                    <Button
                        type="submit"
                        disabled={!urlValue.trim() || disabled}
                        className="h-11 rounded-lg text-xs font-semibold"
                    >
                        Добавить источник
                    </Button>
                </form>
            )}

            {error && <InlineAlert variant="error" title="Источник не добавлен" description={error} />}

            {sources.length > 0 && (
                <div className="space-y-2">
                    <Label className="ml-1 text-xs font-medium text-muted-foreground">Материалы</Label>
                    <div className="space-y-2">
                        {sources.map((source, index) => (
                            <div
                                key={source.clientId || `${source.kind}-${index}`}
                                className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    {source.kind === 'youtube' ? <Youtube className="h-4 w-4" /> : source.kind === 'note' ? <StickyNote className="h-4 w-4" /> : source.kind === 'file' ? <FileText className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">{source.title || source.url || sourceLabels[source.kind]}</p>
                                    <p className="truncate text-xs font-medium text-muted-foreground">{sourceLabels[source.kind]}</p>
                                </div>
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => removeSource(source.clientId, index)}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-destructive"
                                    aria-label="Удалить источник"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
