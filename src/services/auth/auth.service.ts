import { api } from '../core/api';
import { storage } from '../core/storage';
import { LoginResponse } from '../../types/auth';

export const authService = {
    // Customer Login (Direct Phone Login as per detailed docs)
    loginCustomer: async (phone: string) => {
        const response = await api.post<LoginResponse>('/auth/customer/login', { phone });
        const { accessToken, refreshToken, customer, user } = response.data;

        // Store tokens and user data
        await storage.setToken(accessToken, refreshToken);
        await storage.setUser(customer || user);

        return response.data;
    },

    // Partner Login
    loginPartner: async (email: string, password: string) => {
        const response = await api.post<LoginResponse>('/auth/delivery-partner/login', { email, password });
        const { accessToken, refreshToken, deliveryPartner, user } = response.data;

        // Store tokens and user data
        await storage.setToken(accessToken, refreshToken);
        await storage.setUser(deliveryPartner || user);

        return response.data;
    },

    // Send OTP (Step 1)
    sendOtp: async (phone: string) => {
        // Now calls the backend endpoint which triggers Message Central OTP
        const response = await api.post<{ message: string; verificationId: string }>('/auth/customer/login', { phone });
        return response.data;
    },

    // Verify OTP (Step 2)
    verifyOtp: async (phone: string, otp: string, verificationId: string) => {
        const response = await api.post<LoginResponse>('/auth/customer/verify-otp', { phone, otp, verificationId });
        const { accessToken, refreshToken, customer, user } = response.data;

        // Store tokens and user data
        await storage.setToken(accessToken, refreshToken);
        await storage.setUser(customer || user);

        return response.data;
    },

    logout: async () => {
        await storage.clearToken();
        // Call backend logout if needed
        // await api.post('/auth/logout');
    },

    refreshToken: async () => {
        const { refreshToken } = await storage.getToken();
        if (!refreshToken) throw new Error('No refresh token');

        const response = await api.post<LoginResponse>('/auth/refresh-token', { refreshToken });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } = response.data;

        await storage.setToken(newAccessToken, newRefreshToken);
        if (user) await storage.setUser(user);

        return newAccessToken;
    }
};
