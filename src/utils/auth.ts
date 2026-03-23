import axios from 'axios';

let memoryToken: string | null = null;
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string | null) => void;
    reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

/**
 * Authorization 헤더 값에서 Bearer 접두사를 제거하고 순수 토큰만 추출합니다.
 */
export const extractToken = (authHeader: string | null | undefined): string | null => {
    if (!authHeader) return null;
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    return token.replace(/^"(.*)"$/, '$1'); // 따옴표 제거
};

/**
 * Access Token을 메모리에 저장합니다.
 * 토큰 변경 시 'auth:change' 이벤트를 발행합니다.
 */
export const setAccessToken = (token: string | null | undefined): void => {
    if (!token) {
        memoryToken = null;
        window.dispatchEvent(new Event('auth:change'));
        return;
    }
    const tokenOnly = extractToken(token);
    if (tokenOnly) {
        memoryToken = tokenOnly;
        window.dispatchEvent(new Event('auth:change'));
    }
};

/**
 * 저장된 Access Token을 가져옵니다.
 */
export const getAccessToken = (): string | null => {
    return memoryToken;
};

/**
 * Access Token을 삭제합니다.
 * 토큰 삭제 시 'auth:change' 이벤트를 발행합니다.
 */
export const removeAccessToken = (): void => {
    memoryToken = null;
    window.dispatchEvent(new Event('auth:change'));
};

const getApiBaseUrl = (): string => {
    if (typeof window === 'undefined') {
        return import.meta.env.VITE_API_BASE_URL || '';
    }

    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    return isLocal ? '' : (import.meta.env.VITE_API_BASE_URL || '');
};

/**
 * 토큰을 재발급 받습니다.
 */
export const reissue = async (): Promise<string | null> => {
    if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
        });
    }

    isRefreshing = true;

    try {
        const baseUrl = getApiBaseUrl();
        const response = await axios.post(`${baseUrl}/api/auth/reissue`, {}, {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' }
        });

        const authHeader = response.headers['authorization'] || response.headers['Authorization'];
        const newToken = extractToken(authHeader);

        if (!newToken) {
            throw new Error('재발급 응답 헤더에 access token이 없습니다.');
        }

        setAccessToken(newToken);
        processQueue(null, newToken);
        return newToken;
    } catch (error) {
        processQueue(error, null);
        removeAccessToken();
        return null;
    } finally {
        isRefreshing = false;
    }
};

/**
 * Access Token이 없을 시 재발급을 시도하고 반환합니다.
 */
export const ensureAccessToken = async (): Promise<string | null> => {
    const currentToken = getAccessToken();
    if (currentToken) {
        return currentToken;
    }
    return await reissue();
};

