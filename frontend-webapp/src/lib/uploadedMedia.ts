const DEFAULT_API_URL = 'http://localhost:8000';
const R2_HOST_SUFFIX = 'r2.cloudflarestorage.com';
const uploadedMediaFolders = new Set(['avatars', 'oblozhki']);

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || DEFAULT_API_URL;

const encodeUploadKey = (key: string) => key.split('/').map(encodeURIComponent).join('/');

export const getUploadedMediaKey = (urlOrPath: string): string | null => {
    const path = urlOrPath.split('?')[0].replace(/^\/+/, '');
    const segments = path.split('/').filter(Boolean);
    const folderIndex = segments.findIndex((segment) => uploadedMediaFolders.has(segment));
    if (folderIndex === -1) return null;
    return segments.slice(folderIndex).join('/');
};

export const getUploadedMediaProxyUrl = (key: string): string => {
    const encodedKey = encodeUploadKey(key);
    return new URL(`/upload/files/${encodedKey}`, getApiBaseUrl()).toString();
};

export const toUploadedMediaUrl = (value?: string | null): string | undefined => {
    const source = value?.trim();
    if (!source) return undefined;

    if (source.startsWith('/upload/files/')) {
        return new URL(source, getApiBaseUrl()).toString();
    }

    try {
        const url = new URL(source);
        if (!url.hostname.endsWith(R2_HOST_SUFFIX)) return source;

        const key = getUploadedMediaKey(decodeURIComponent(url.pathname));
        return key ? getUploadedMediaProxyUrl(key) : source;
    } catch {
        return source;
    }
};
