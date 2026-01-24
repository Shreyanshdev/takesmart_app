import axios from 'axios';
import { ENV } from '../../utils/env';
import { storage } from './storage';

export const api = axios.create({
    baseURL: ENV.API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Auth endpoints that should not trigger token refresh
const AUTH_ENDPOINTS = [
    'auth/customer/login',
    'auth/delivery-partner/login',
    'auth/refresh-token',
    'auth/logout'
];

// Check if URL is an auth endpoint
const isAuthEndpoint = (url: string | undefined): boolean => {
    if (!url) return false;
    return AUTH_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

// Add request interceptor to add token if available
api.interceptors.request.use(
    async (config) => {
        const { accessToken } = await storage.getToken();
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle 401 errors and network issues
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle network errors (no response from server)
        if (!error.response) {
            const networkError = new Error('Network error. Please check your internet connection and try again.');
            (networkError as any).isNetworkError = true;
            return Promise.reject(networkError);
        }

        // Skip token refresh for auth endpoints (login, refresh, etc.)
        if (isAuthEndpoint(originalRequest?.url)) {
            return Promise.reject(error);
        }

        // Only attempt refresh for 401 errors on non-auth endpoints
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                // Dynamically import authService to avoid circular dependency
                const { authService } = require('../auth/auth.service');
                const newToken = await authService.refreshToken();
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed, logout
                const { useAuthStore } = require('../../store/authStore');
                useAuthStore.getState().logout();
                return Promise.reject(refreshError);
            }
        }

        // Handle server errors (500+)
        if (error.response?.status >= 500) {
            const serverError = new Error('Server error. Please try again later.');
            (serverError as any).originalError = error;
            return Promise.reject(serverError);
        }

        return Promise.reject(error);
    }
);
