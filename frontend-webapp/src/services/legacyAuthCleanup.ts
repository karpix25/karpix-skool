const LEGACY_AUTH_TOKEN_KEY = 'token';

export const clearLegacyStoredAuthToken = () => {
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
};
