import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';

import api from './client';

const readHeader = (config: InternalAxiosRequestConfig, name: string) => {
    const headers = config.headers;
    const value = headers.get?.(name);
    return Array.isArray(value) ? value.join(',') : value;
};

const rejectWithForbidden = (config: InternalAxiosRequestConfig, data?: unknown) => (
    Promise.reject(new AxiosError(
        'Request failed with status code 403',
        'ERR_BAD_REQUEST',
        config,
        undefined,
        {
            config,
            data,
            headers: {},
            status: 403,
            statusText: 'Forbidden',
        }
    ))
);

describe('api client', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('sends browser credentials for cookie-backed sessions', async () => {
        const response = await api.get('/health', {
            adapter: async (config) => ({
                config,
                data: {
                    authorization: readHeader(config, 'Authorization'),
                    withCredentials: config.withCredentials,
                },
                headers: {},
                status: 200,
                statusText: 'OK',
            }),
        });

        expect(response.data).toEqual({
            authorization: undefined,
            withCredentials: true,
        });
    });

    it('attaches auth token and active tenant id to requests', async () => {
        localStorage.setItem('token', 'jwt-token');
        localStorage.setItem('activeTenantId', 'tenant-1');

        const response = await api.get('/health', {
            adapter: async (config) => ({
                config,
                data: {
                    authorization: readHeader(config, 'Authorization'),
                    tenantId: readHeader(config, 'X-Tenant-ID'),
                },
                headers: {},
                status: 200,
                statusText: 'OK',
            }),
        });

        expect(response.data).toEqual({
            authorization: 'Bearer jwt-token',
            tenantId: 'tenant-1',
        });
    });

    it('does not send optional tenant header when no tenant is selected', async () => {
        localStorage.setItem('token', 'jwt-token');

        const response = await api.get('/health', {
            adapter: async (config) => ({
                config,
                data: {
                    authorization: readHeader(config, 'Authorization'),
                    tenantId: readHeader(config, 'X-Tenant-ID'),
                },
                headers: {},
                status: 200,
                statusText: 'OK',
            }),
        });

        expect(response.data).toEqual({
            authorization: 'Bearer jwt-token',
            tenantId: undefined,
        });
    });

    it('normalizes known tenant admin 403 responses', async () => {
        await expect(api.get('/courses', {
            adapter: (config) => rejectWithForbidden(config, { detail: 'Admin access not approved' }),
        })).rejects.toMatchObject({
            response: {
                data: {
                    detail: expect.stringContaining('Сервер отклонил admin-mode'),
                },
            },
        });
    });

    it('adds a clear detail to empty 403 responses', async () => {
        await expect(api.get('/courses', {
            adapter: (config) => rejectWithForbidden(config),
        })).rejects.toMatchObject({
            response: {
                data: {
                    detail: expect.stringContaining('Проверьте выбранную школу'),
                },
            },
        });
    });
});
