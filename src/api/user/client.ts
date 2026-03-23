import axios, {
    type AxiosError,
    type AxiosResponse,
    type InternalAxiosRequestConfig,
} from 'axios';
import {
    getAccessToken,
    removeAccessToken,
    extractToken,
    reissue,
} from '@/utils/auth.ts';
import type { ApiResponse } from '@/types/common/common.ts';

const resolveApiBaseUrl = (): string => {
    if (typeof window === 'undefined') {
        return import.meta.env.VITE_API_BASE_URL || '';
    }

    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    return isLocal ? '' : (import.meta.env.VITE_API_BASE_URL || '');
};

const apiBaseUrl = resolveApiBaseUrl();

const apiClient = axios.create({
    baseURL: apiBaseUrl,
    timeout: 70000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

function normalizeToken(token: string | null | undefined): string | null {
    return extractToken(token);
}

function isApiResponseEnvelope<T>(data: unknown): data is ApiResponse<T> {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return false;
    }

    const obj = data as Record<string, unknown>;

    return (
        typeof obj.status === 'string' &&
        typeof obj.code === 'string' &&
        typeof obj.path === 'string' &&
        'data' in obj &&
        (typeof obj.timestamp === 'string' || Array.isArray(obj.timestamp))
    );
}

function unwrapApiResponse<T>(
    response: AxiosResponse<T | ApiResponse<T>>,
): AxiosResponse<T> {
    if (isApiResponseEnvelope<T>(response.data)) {
        return {
            ...response,
            data: response.data.data as T,
        };
    }

    return response as AxiosResponse<T>;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = normalizeToken(getAccessToken());

    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

apiClient.interceptors.response.use(
    (response) => {
        return unwrapApiResponse(response);
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        if (!originalRequest) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (originalRequest.url?.includes('/api/auth/reissue')) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            const newAccessToken = await reissue();

            if (!newAccessToken) {
                removeAccessToken();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            return apiClient(originalRequest);
        }

        return Promise.reject(error);
    },
);

export default apiClient;