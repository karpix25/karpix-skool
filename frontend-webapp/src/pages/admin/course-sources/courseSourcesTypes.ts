export type CourseGenerationSourceKind = 'link' | 'youtube' | 'note' | 'file';

export interface CourseGenerationSource {
    clientId?: string;
    kind: CourseGenerationSourceKind;
    title?: string;
    url?: string;
    content?: string;
    content_type?: string;
    size_bytes?: number;
}

export interface CourseGenerationSourceUploadResponse {
    source: CourseGenerationSource;
}
