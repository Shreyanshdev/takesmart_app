import { create } from 'zustand';
import { Product, Category, productService } from '../services/customer/product.service';
import { UserProfile, userService } from '../services/customer/user.service';
import { orderService } from '../services/customer/order.service';
import { getCurrentBranchId } from './branch.store';
import { logger } from '../utils/logger';

export interface HomeState {
    isLocationHeaderVisible: boolean;
    isTabBarVisible: boolean;
    scrollY: number;

    // Data State
    categories: Category[];
    normalProducts: Product[];
    userProfile: UserProfile | null;
    awaitingConfirmationCount: number;

    isLoading: boolean;
    error: string | null;

    // Actions
    setLocationHeaderVisible: (visible: boolean) => void;
    setTabBarVisible: (visible: boolean) => void;
    setScrollY: (y: number) => void;

    fetchHomeData: () => Promise<void>;
}

export const useHomeStore = create<HomeState>((set, get) => ({
    isLocationHeaderVisible: true,
    isTabBarVisible: true,
    scrollY: 0,

    categories: [],
    normalProducts: [],
    userProfile: null,
    awaitingConfirmationCount: 0,

    isLoading: false,
    error: null,

    setLocationHeaderVisible: (visible) => set({ isLocationHeaderVisible: visible }),
    setTabBarVisible: (visible) => set({ isTabBarVisible: visible }),
    setScrollY: (y) => set({ scrollY: y }),

    fetchHomeData: async () => {
        const hasData = get().categories.length > 0;
        if (!hasData) {
            set({ isLoading: true, error: null });
        } else {
            set({ error: null });
        }

        try {
            // Get current branch for location-based pricing
            const branchId = getCurrentBranchId();

            const results = await Promise.allSettled([
                productService.getCategories(),
                productService.getAllProducts(branchId), // Pass branchId for inventory pricing
                userService.getProfile(),
                orderService.getOrders()
            ]);

            const getValue = (result: PromiseSettledResult<any>, defaultVal: any) => {
                if (result.status === 'fulfilled' && result.value !== undefined && result.value !== null) {
                    if (Array.isArray(defaultVal) && !Array.isArray(result.value)) {
                        return defaultVal;
                    }
                    return result.value;
                }
                return defaultVal;
            };

            const categories = getValue(results[0], []);
            const normal = getValue(results[1], []);
            const profile = getValue(results[2], null);
            const ordersData = getValue(results[3], null);

            let awaitingConfirmationCount = 0;
            if (ordersData && ordersData.orders) {
                awaitingConfirmationCount = ordersData.orders.filter((o: any) => o.status === 'awaitconfirmation').length;
            }

            set({
                categories,
                normalProducts: normal,
                userProfile: profile,
                awaitingConfirmationCount,
                isLoading: false,
                error: null
            });
        } catch (error: any) {
            logger.error('Failed to fetch home data', error);
            set({
                isLoading: false,
                error: !hasData ? (error.message || 'Failed to refresh data.') : null
            });
        }
    }
}));
