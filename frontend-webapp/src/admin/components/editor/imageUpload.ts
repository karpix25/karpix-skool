import api from '../../../api/client';
import { getApiErrorMessage } from '../../../services/apiError';

const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;

const allowedImageTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);

const normalizeImageType = (type: string) => {
    const cleanType = type.split(';', 1)[0].toLowerCase();
    if (cleanType === 'image/jpg' || cleanType === 'image/pjpeg') return 'image/jpeg';
    if (cleanType === 'image/x-png') return 'image/png';
    return cleanType;
};

export const validateEditorImageFile = (file: File): string | null => {
    const imageType = normalizeImageType(file.type || '');
    if (!allowedImageTypes.has(imageType)) {
        return 'Можно загрузить только JPEG, PNG или WebP.';
    }

    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
        return 'Картинка больше 8 МБ. Сожмите файл и попробуйте снова.';
    }

    return null;
};

export const uploadEditorImage = async (file: File): Promise<string> => {
    const validationError = validateEditorImageFile(file);
    if (validationError) {
        throw new Error(validationError);
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await api.post<{ url?: string }>('/upload/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (!response.data.url) {
            throw new Error('Сервер не вернул ссылку на картинку.');
        }
        return response.data.url;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, 'Не удалось загрузить картинку.'));
    }
};
