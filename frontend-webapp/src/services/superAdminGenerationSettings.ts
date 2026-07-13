import api from '../api/client';
import type {
    GenerationSettings,
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
