const OPEN_NOTEBOOK_PREFIX = 'notebook:';
const OPEN_NOTEBOOK_BASE_URL = 'https://notebook.karpix.com/notebooks';

export const extractOpenNotebookId = (value?: string | null) => {
    const cleanValue = value?.trim();
    if (!cleanValue) return null;

    const decodedValue = safeDecode(cleanValue);
    if (decodedValue.startsWith(OPEN_NOTEBOOK_PREFIX)) return decodedValue;

    try {
        const parsed = new URL(cleanValue);
        const notebookId = parsed.pathname
            .split('/')
            .reverse()
            .map(part => safeDecode(part.trim()))
            .find(part => part.startsWith(OPEN_NOTEBOOK_PREFIX));
        return notebookId || null;
    } catch {
        return null;
    }
};

export const isOpenNotebookReference = (value?: string | null) => Boolean(extractOpenNotebookId(value));

export const buildOpenNotebookUrl = (value?: string | null) => {
    const notebookId = extractOpenNotebookId(value);
    if (!notebookId) return null;
    return `${OPEN_NOTEBOOK_BASE_URL}/${encodeURIComponent(notebookId)}`;
};

const safeDecode = (value: string) => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};
