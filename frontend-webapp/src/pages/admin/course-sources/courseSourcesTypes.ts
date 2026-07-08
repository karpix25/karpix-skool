export type CourseGenerationSourceKind = 'link' | 'youtube' | 'instagram' | 'tiktok' | 'note' | 'file';

export interface CourseGenerationSource {
    clientId?: string;
    kind: CourseGenerationSourceKind;
    title?: string;
    url?: string;
    content?: string;
    content_type?: string;
    size_bytes?: number;
    file?: File;
}

export interface CourseGenerationSourceUploadResponse {
    source: CourseGenerationSource;
}
