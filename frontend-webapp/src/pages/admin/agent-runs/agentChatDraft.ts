import type { AgentChatFormState, AgentModuleDraftInput, AgentRun, AgentRunCreateInput } from './types';
import { toCourseGenerationSourcePayload } from '../course-sources/sourceValidation';

const DEFAULT_MODULE_COUNT = 4;
const DEFAULT_LESSONS_PER_MODULE = 4;
const AUTO_STRUCTURE_MODULE_LIMIT = 6;
const AUTO_STRUCTURE_LESSON_LIMIT = 6;
const MAX_TITLE_LENGTH = 180;
const MAX_DESCRIPTION_LENGTH = 2000;

export const createDefaultAgentChatForm = (): AgentChatFormState => ({
    task: '',
    title: '',
    sources: [],
    audienceLevel: 'beginner',
    style: 'практично, простым языком',
    coverUrl: '',
    isVip: false,
});

export const buildAgentRunCreateInput = (
    form: AgentChatFormState,
    tenantId: string
): AgentRunCreateInput => {
    const task = normalizeText(form.task);
    const sourceFallback = firstSourceLabel(form.sources);
    const sources = toCourseGenerationSourcePayload(form.sources || []);
    const hasSources = sources.length > 0;

    return {
        task_type: 'create_course_draft',
        tenant_id: tenantId,
        course_title: deriveCourseTitle(form.title || task || sourceFallback),
        description: truncate(task, MAX_DESCRIPTION_LENGTH),
        cover_url: optionalText(form.coverUrl),
        is_vip: form.isVip,
        modules: hasSources ? [] : buildStarterModules(DEFAULT_MODULE_COUNT, DEFAULT_LESSONS_PER_MODULE),
        sources: hasSources ? sources : undefined,
        module_count: AUTO_STRUCTURE_MODULE_LIMIT,
        lessons_per_module: AUTO_STRUCTURE_LESSON_LIMIT,
        style: optionalText(form.style),
        audience_level: optionalText(form.audienceLevel),
    };
};

export const createAgentRunMessage = (run: AgentRun): string => {
    const courseTitle = run.artifacts.find((artifact) => artifact.artifact_type === 'course')?.title || 'Draft';
    return `Создал draft "${courseTitle}". Проверьте его в списке ниже.`;
};

export const deriveCourseTitle = (input: string): string => {
    const firstLine = normalizeText(input).split('\n').find(Boolean) || 'AI course draft';
    const title = firstLine
        .replace(/^(создай|сделай|подготовь|сгенерируй)\s+/i, '')
        .replace(/^курс\s+(по|про|о|для)\s+/i, '')
        .replace(/^курс\s*/i, '')
        .trim()
        .replace(/[.!?]+$/g, '')
        .trim();

    return truncate(title || firstLine, MAX_TITLE_LENGTH);
};

const normalizeText = (value: string): string => value.replace(/\r\n/g, '\n').trim();

const optionalText = (value: string): string | undefined => {
    const normalized = normalizeText(value);
    return normalized || undefined;
};

const truncate = (value: string, maxLength: number): string => {
    if (value.length <= maxLength) return value;
    return value.slice(0, maxLength).trimEnd();
};

const buildStarterModules = (moduleCount: number, lessonsPerModule: number): AgentModuleDraftInput[] => (
    Array.from({ length: moduleCount }, (_, moduleIndex) => ({
        title: `Модуль ${moduleIndex + 1}`,
        lessons: Array.from({ length: lessonsPerModule }, (_lesson, lessonIndex) => ({
            title: `Урок ${moduleIndex + 1}.${lessonIndex + 1}`,
        })),
    }))
    );

const firstSourceLabel = (sources: AgentChatFormState['sources']): string => {
    const source = sources.find(item => item.title || item.url || item.content);
    if (!source) return '';
    return source.title || source.url || source.content?.slice(0, 80) || '';
};
