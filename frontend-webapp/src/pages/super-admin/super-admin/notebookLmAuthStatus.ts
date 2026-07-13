import type { NotebookLmAuthState } from './types';

const fallbackMessages: Record<NotebookLmAuthState['status'], string> = {
    ok: 'Google NotebookLM авторизован.',
    package_missing: 'На сервере не установлен notebooklm-py.',
    missing_auth: 'Нужен вход в Google для NotebookLM.',
    expired: 'Сессия Google истекла. Авторизуйтесь заново.',
    network_error: 'NotebookLM сейчас недоступен. Попробуйте еще раз.',
    storage_error: 'Хранилище NotebookLM auth недоступно. Проверьте NOTEBOOKLM_HOME на сервере.',
    error: 'Не удалось проверить авторизацию NotebookLM.',
};

export const getNotebookLmAuthMessage = (authState: NotebookLmAuthState | null | undefined): string => {
    if (!authState) return 'Статус Google NotebookLM пока не проверен.';
    if (authState.authenticated) return fallbackMessages.ok;

    const message = authState.message?.trim();
    if (!message) return fallbackMessages[authState.status];

    const looksLikeTraceback = message.includes('Traceback') || message.includes('\n') || message.length > 160;
    return looksLikeTraceback ? fallbackMessages[authState.status] : message;
};

export const getConciseNotebookLmError = (message: string): string => {
    const trimmed = message.trim();
    if (!trimmed) return fallbackMessages.error;

    const looksLikeTraceback = trimmed.includes('Traceback') || trimmed.includes('\n') || trimmed.length > 180;
    return looksLikeTraceback ? fallbackMessages.error : trimmed;
};
