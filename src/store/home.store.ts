import { create } from 'zustand';
import { Product, Category, productService } from '../services/customer/product.service';
import { UserProfile, userService } from '../services/customer/user.service';
import { subscriptionService, Branch, Subscription } from '../services/customer/subscription.service';
import { logger } from '../utils/logger';

interface HomeState {
    isLocationHeaderVisible: boolean;
    isTabBarVisible: boolean;
    scrollY: number;

    // Data State
    categories: Category[];
    featuredProducts: Product[];
    subscriptionProducts: Product[];
    normalProducts: Product[];
    userProfile: UserProfile | null;
    currentSubscription: Subscription | null;
    nearestBranch: Branch | null;

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
    featuredProducts: [],
    subscriptionProducts: [],
    normalProducts: [],
    userProfile: null,
    currentSubscription: null,
    nearestBranch: null,

    isLoading: false,
    error: null,

    setLocationHeaderVisible: (visible) => set({ isLocationHeaderVisible: visible }),
    setTabBarVisible: (visible) => set({ isTabBarVisible: visible }),
    setScrollY: (y) => set({ scrollY: y }),

    fetchHomeData: async () => {
        // Optimistic UI: Don't set isLoading if we already have data (stale-while-revalidate)
        // Only set loading if it's the very first load or empty state
        const hasData = get().categories.length > 0;
        if (!hasData) {
            set({ isLoading: true, error: null });
        } else {
            set({ error: null }); // Clear error on retry
        }

        try {
            // Initiate all requests in parallel
            // We don't await profile before starting others.
            // subscriptionService.getMySubscription() handles its own auth check internally via api interceptors

            const results = await Promise.allSettled([
                productService.getCategories(),
                productService.getFeaturedProducts(),
                productService.getSubscriptionProducts(),
                productService.getAllProducts(),
                userService.getProfile(),
                subscriptionService.getMySubscription()
            ]);

            // Helper to get value or default, with type safety check for arrays
            const getValue = (result: PromiseSettledResult<any>, defaultVal: any) => {
                if (result.status === 'fulfilled' && result.value !== undefined && result.value !== null) {
                    // Safety: If we expect an array (defaultVal is array), ensure value is array
                    if (Array.isArray(defaultVal) && !Array.isArray(result.value)) {
                        return defaultVal;
                    }
                    return result.value;
                }
                return defaultVal;
            };

            const categories = getValue(results[0], []);
            const featured = getValue(results[1], []);
            const subs = getValue(results[2], []);
            const normal = getValue(results[3], []);
            const profile = getValue(results[4], null);
            const userSubscription = getValue(results[5], null);

            // Fetch Nearest Branch - Dependent on location if available
            // This is the only sequential part, but it's minor.
            // We can even optimistically try to fetch it if we have a cached location in store
            let currentBranch = null;
            if (profile?.activeAddress?.coordinates) {
                const { lat, lng } = profile.activeAddress.coordinates;
                try {
                    const branchData = await subscriptionService.getNearestBranch(lat, lng);
                    currentBranch = branchData.branch;
                } catch (e) { /* ignore branch error */ }
            }

            set({
                categories,
                featuredProducts: featured,
                subscriptionProducts: subs,
                normalProducts: normal,
                userProfile: profile,
                currentSubscription: userSubscription,
                nearestBranch: currentBranch,
                isLoading: false,
                error: null
            });
        } catch (error: any) {
            logger.error('Failed to fetch home data', error);
            set({
                isLoading: false,
                // Only show error if we have NO data to show, otherwise silent fail (toast in future)
                error: !hasData ? (error.message || 'Failed to refresh data.') : null
            });
        }
    }
}));
