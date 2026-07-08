import { type ChangeEvent, type DragEvent, type FormEvent, useRef, useState } from 'react';
import { Loader2, Trash2, Upload } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { InlineAlert } from '../../../components/ui/inline-alert';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { getApiErrorMessage } from '../../../services/apiError';
import {
    sourceLabels,
    sourceModes,
    sourcePlaceholders,
    urlSourceKinds,
} from './courseSourceOptions';
import { CourseSourceKindIcon } from './courseSourcePresentation';
import { uploadCourseGenerationSourceFile } from './courseSourcesApi';
import { createCourseGenerationSource } from './sourceValidation';
import type { CourseGenerationSource, CourseGenerationSourceKind } from './courseSourcesTypes';

interface CourseSourceComposerProps {
    courseId?: string;
    disabled?: boolean;
    sources: CourseGenerationSource[];
    onChange: (sources: CourseGenerationSource[]) => void;
}

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
    const [isDragging, setIsDragging] = useState(false);
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
            kind: urlSourceKinds.includes(activeKind) ? activeKind : 'link',
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

    const addFiles = async (files: File[]) => {
        if (!files.length || disabled) return;

        setUploading(true);
        setError(null);
        try {
            if (!courseId) {
                const pendingSources = files.map(file => createCourseGenerationSource({
                    kind: 'file',
                    title: file.name,
                    content_type: file.type || undefined,
                    size_bytes: file.size,
                    file,
                }));
                onChange([...sources, ...pendingSources]);
                return;
            }

            const uploadedSources = await Promise.all(
                files.map(file => uploadCourseGenerationSourceFile(courseId, file))
            );
            onChange([...sources, ...uploadedSources]);
        } catch (uploadError) {
            setError(getApiErrorMessage(uploadError, 'Не удалось загрузить файл источника'));
        } finally {
            setUploading(false);
        }
    };

    const uploadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
        await addFiles(Array.from(event.target.files || []));
        event.target.value = '';
    };

    const handleFileDrop = async (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
        if (disabled || uploading) return;
        await addFiles(Array.from(event.dataTransfer.files || []));
    };

    const handleFileDragLeave = (event: DragEvent<HTMLDivElement>) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
        setIsDragging(false);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
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
                <div
                    onDragEnter={(event) => {
                        event.preventDefault();
                        if (!disabled && !uploading) setIsDragging(true);
                    }}
                    onDragOver={(event) => {
                        event.preventDefault();
                        if (!disabled && !uploading) setIsDragging(true);
                    }}
                    onDragLeave={handleFileDragLeave}
                    onDrop={handleFileDrop}
                    className={[
                        'rounded-lg border border-dashed p-4 transition-colors',
                        isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20',
                    ].join(' ')}
                >
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
                    <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
                        Перетащите файлы сюда или выберите их вручную
                    </p>
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
                        placeholder={sourcePlaceholders[activeKind]}
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
                                    <CourseSourceKindIcon kind={source.kind} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">{source.title || source.url || sourceLabels[source.kind]}</p>
                                    <p className="truncate text-xs font-medium text-muted-foreground">
                                        {sourceLabels[source.kind]}
                                        {source.file && !source.url ? ' · загрузится после создания курса' : ''}
                                    </p>
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
