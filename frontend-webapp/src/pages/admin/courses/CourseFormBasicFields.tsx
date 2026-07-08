import type { ChangeEvent, RefObject } from 'react';
import { Image as ImageIcon } from 'lucide-react';

import { CourseCoverImage } from '../../../components/CourseCoverImage';
import { CharCounter } from '../../../components/CharCounter';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { cn } from '../../../lib/utils';
import type { CourseFormState } from '../../../types/admin';

interface CourseFormBasicFieldsProps {
    course: CourseFormState;
    fileInputRef: RefObject<HTMLInputElement | null>;
    isUploading: boolean;
    onCourseChange: (course: CourseFormState | ((prev: CourseFormState) => CourseFormState)) => void;
    onThumbnailUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const CourseFormBasicFields = ({
    course,
    fileInputRef,
    isUploading,
    onCourseChange,
    onThumbnailUpload,
}: CourseFormBasicFieldsProps) => (
    <div className="space-y-8">
        <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">Обложка курса</Label>
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                aria-label={course.cover_url ? 'Изменить обложку курса' : 'Загрузить обложку курса'}
                className={cn(
                    'group relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-75',
                    course.cover_url ? 'border-transparent' : 'border-border bg-muted/30 hover:border-primary/50',
                )}
            >
                {course.cover_url ? (
                    <CourseCoverImage src={course.cover_url} alt="Course Thumbnail" />
                ) : (
                    <>
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground shadow-sm transition-colors group-hover:text-primary">
                            {isUploading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            ) : (
                                <ImageIcon size={24} />
                            )}
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-medium text-muted-foreground">Загрузить изображение</p>
                            <p className="mt-1 text-[11px] font-medium text-muted-foreground/60">Рекомендуем 16:9</p>
                        </div>
                    </>
                )}
                {course.cover_url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="rounded-md border border-border bg-card/90 px-4 py-2 text-xs font-medium text-foreground backdrop-blur-md">
                            Изменить
                        </div>
                    </div>
                )}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onThumbnailUpload} />
        </div>

        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">Название</Label>
                <CharCounter current={course.title.length} max={50} />
            </div>
            <Input
                className="h-12 w-full rounded-lg border-border bg-muted/20 px-4 text-sm font-bold transition-[background-color,border-color,box-shadow] focus:ring-2 focus:ring-primary/20"
                value={course.title}
                onChange={(event) => onCourseChange(prev => ({ ...prev, title: event.target.value.slice(0, 50) }))}
                placeholder="Напр. Мастер технического анализа"
            />
        </div>

        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">Описание</Label>
                <CharCounter current={(course.description || '').length} max={500} />
            </div>
            <Textarea
                className="min-h-[120px] w-full resize-none rounded-lg border-border bg-muted/20 px-4 py-3 text-sm font-medium leading-relaxed transition-[background-color,border-color,box-shadow] focus:ring-2 focus:ring-primary/20"
                value={course.description}
                onChange={(event) => onCourseChange(prev => ({ ...prev, description: event.target.value.slice(0, 500) }))}
                placeholder="Кратко опишите, чему научатся студенты..."
            />
        </div>
    </div>
);
