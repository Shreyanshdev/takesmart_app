import { api } from '../core/api';

export interface UserProfile {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    hasActiveSubscription: boolean;
    activeSubscriptionId?: string;
    activeAddress?: {
        street: string;
        city: string;
        coordinates?: { lat: number; lng: number };
    };
}

export const userService = {
    getProfile: async (): Promise<UserProfile> => {
        const response = await api.get('auth/user'); // Matched to router.get('/user') in auth.js mounted at /api/v1/auth
        // The backend returns { user: ... }
        const user = response.data?.user;
        if (!user) {
            throw new Error('Invalid profile response from server');
        }
        return {
            ...user,
            hasActiveSubscription: !!user.subscription || user.hasActiveSubscription,
            activeSubscriptionId: user.subscription?.subscriptionId || user.activeSubscriptionId
        };
    },

    updateProfile: async (data: { name: string, email: string }) => {
        const response = await api.put('profile', data);
        return response.data;
    },

    updateLocation: async (lat: number, lng: number, addressString: string) => {
        // Assuming we have an address endpoint or update profile
        // Using address endpoint based on routes analysis
        const response = await api.post('addresses', {
            type: 'Home', // Defaulting for now
            street: addressString,
            coordinates: { lat, lng },
            isDefault: true
        });
        return response.data;
    }
};
