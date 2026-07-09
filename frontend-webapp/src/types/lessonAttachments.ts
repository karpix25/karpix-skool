export interface LessonAttachment {
    id: string;
    lesson_id: string;
    filename: string;
    content_type?: string | null;
    size_bytes: number;
    download_url?: string | null;
    display_order: number;
    created_at: string;
}
