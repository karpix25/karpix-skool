export const readNotebookLmAuthFile = async (file: File): Promise<Record<string, unknown>> => {
    const content = await file.text();
    let parsed: unknown;
    try {
        parsed = JSON.parse(content);
    } catch {
        throw new Error('Неверный формат файла. Выберите корректный storage_state.json.');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Выберите storage_state.json, созданный командой notebooklm login.');
    }
    return parsed as Record<string, unknown>;
};
