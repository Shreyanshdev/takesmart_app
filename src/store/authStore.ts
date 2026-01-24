import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '../services/core/storage';
import { User } from '../types/auth';
import { logger } from '../utils/logger';

// Storage key for tracking if address modal was shown after login
const ADDRESS_MODAL_SHOWN_KEY = '@lush_address_modal_shown';

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
    initialize: () => Promise<void>;
}

// Timeout to prevent infinite loading (5 seconds max)
const INIT_TIMEOUT_MS = 5000;

export const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    login: (user) => {
        storage.setUser(user);
        set({ isAuthenticated: true, user });
    },
    logout: () => {
        storage.clearToken();
        // Clear address modal flag so it shows on next login
        AsyncStorage.removeItem(ADDRESS_MODAL_SHOWN_KEY);
        set({ isAuthenticated: false, user: null });
    },
    updateUser: (updates: Partial<User>) => set((state) => {
        const updatedUser = state.user ? { ...state.user, ...updates } : null;
        if (updatedUser) {
            storage.setUser(updatedUser);
        }
        return { user: updatedUser };
    }),
    initialize: async () => {
        logger.debug('AuthStore', 'Starting initialization...');

        // Set a timeout to force loading to complete
        const timeoutId = setTimeout(() => {
            logger.warn('AuthStore: Initialization timed out, forcing isLoading: false');
            set({ isLoading: false });
        }, INIT_TIMEOUT_MS);

        try {
            logger.debug('AuthStore', 'Getting token from storage...');
            const { accessToken } = await storage.getToken();
            logger.debug('AuthStore', 'Token retrieved:', !!accessToken);

            logger.debug('AuthStore', 'Getting user from storage...');
            const user = await storage.getUser();
            logger.debug('AuthStore', 'User retrieved:', !!user);

            clearTimeout(timeoutId);

            if (accessToken && user) {
                logger.debug('AuthStore', 'User authenticated, setting state');
                set({ isAuthenticated: true, user, isLoading: false });
            } else {
                logger.debug('AuthStore', 'No valid session, setting isLoading: false');
                set({ isLoading: false });
            }
        } catch (error) {
            logger.warn('AuthStore: Error during initialization:', error);
            clearTimeout(timeoutId);
            set({ isLoading: false });
        }
    },
}));
