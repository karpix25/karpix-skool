const DEFAULT_DEV_API_URL = 'http://localhost:8000';

interface ApiUrlEnv {
    VITE_API_URL?: string;
    PROD?: boolean;
}

export const resolveApiBaseUrl = (env: ApiUrlEnv = import.meta.env) => {
    const configuredUrl = env.VITE_API_URL?.trim();

    if (env.PROD) {
        return requireProductionApiUrl(configuredUrl);
    }

    return configuredUrl || DEFAULT_DEV_API_URL;
};

export const getApiBaseUrl = () => {
    const configuredUrl = import.meta.env.VITE_API_URL?.trim();

    if (import.meta.env.PROD) {
        return requireProductionApiUrl(configuredUrl);
    }

    return configuredUrl || DEFAULT_DEV_API_URL;
};

export { DEFAULT_DEV_API_URL };

const requireProductionApiUrl = (configuredUrl: string | undefined) => {
    if (!configuredUrl) {
        throw new Error('VITE_API_URL is required for production builds.');
    }

    return configuredUrl;
};
