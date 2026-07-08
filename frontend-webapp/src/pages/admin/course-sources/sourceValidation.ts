import type { CourseGenerationSource } from './courseSourcesTypes';

export const hasCourseGenerationSources = (sources: CourseGenerationSource[]) => (
    sources.some(source => {
        if (source.kind === 'note') return Boolean(source.content?.trim());
        if (source.kind === 'file') return Boolean(source.url?.trim() || source.file);
        return Boolean(source.url?.trim());
    })
);

export const toCourseGenerationSourcePayload = (sources: CourseGenerationSource[]) => (
    sources.map((source) => {
        const payload = { ...source };
        delete payload.clientId;
        delete payload.file;
        return payload;
    })
);

export const createCourseGenerationSource = (
    source: Omit<CourseGenerationSource, 'clientId'>
): CourseGenerationSource => ({
    ...source,
    clientId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
});
