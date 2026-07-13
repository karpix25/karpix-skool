import api from '../api/client';
import type {
    GenerationSettings,
    NotebookLmAuthState,
    NotebookGenerationProvider,
} from '../pages/super-admin/super-admin/types';


const ENDPOINT = '/super/generation-settings';


export const fetchSuperAdminGenerationSettings = async (): Promise<GenerationSettings> => {
    const response = await api.get<GenerationSettings>(ENDPOINT);
    return response.data;
};


export const updateSuperAdminGenerationProvider = async (
    notebookProvider: NotebookGenerationProvider
): Promise<GenerationSettings> => {
    const response = await api.patch<GenerationSettings>(ENDPOINT, {
        notebook_provider: notebookProvider,
    });
    return response.data;
};

export const fetchNotebookLmAuthState = async (): Promise<NotebookLmAuthState> => {
    const response = await api.get<NotebookLmAuthState>(`${ENDPOINT}/notebooklm-auth`);
    return response.data;
};

export const loginNotebookLmAuth = async (): Promise<NotebookLmAuthState> => {
    const response = await api.post<NotebookLmAuthState>(`${ENDPOINT}/notebooklm-auth/login`);
    return response.data;
};

export const refreshNotebookLmAuth = async (): Promise<NotebookLmAuthState> => {
    const response = await api.post<NotebookLmAuthState>(`${ENDPOINT}/notebooklm-auth/refresh`);
    return response.data;
};
