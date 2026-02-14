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

    // Pagination State (cursor-based)
    nextCursor: string | null;
    hasMore: boolean;
    isLoadingMore: boolean;

    isLoading: boolean;
    error: string | null;

    // Actions
    setLocationHeaderVisible: (visible: boolean) => void;
    setTabBarVisible: (visible: boolean) => void;
    setScrollY: (y: number) => void;

    fetchHomeData: () => Promise<void>;
    loadMoreProducts: () => Promise<void>;
}

export const useHomeStore = create<HomeState>((set, get) => ({
    isLocationHeaderVisible: true,
    isTabBarVisible: true,
    scrollY: 0,

    categories: [],
    normalProducts: [],
    userProfile: null,
    awaitingConfirmationCount: 0,

    // Pagination state
    nextCursor: null,
    hasMore: true,
    isLoadingMore: false,

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

            // If no branch is defined, only fetch categories and user data (skip products)
            // This saves unnecessary API calls when service is unavailable
            if (!branchId) {
                const results = await Promise.allSettled([
                    productService.getCategories(),
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
                const profile = getValue(results[1], null);
                const ordersData = getValue(results[2], null);

                let awaitingConfirmationCount = 0;
                if (ordersData && ordersData.orders) {
                    awaitingConfirmationCount = ordersData.orders.filter((o: any) => o.status === 'awaitconfirmation').length;
                }

                set({
                    categories,
                    normalProducts: [],
                    nextCursor: null,
                    hasMore: false,
                    userProfile: profile,
                    awaitingConfirmationCount,
                    isLoading: false,
                    error: null
                });
                return;
            }

            // Fetch categories, first page of products, user profile, and orders in parallel
            const results = await Promise.allSettled([
                productService.getCategories(),
                productService.getProductsFeed(branchId, { limit: 20 }), // Use new paginated endpoint
                userService.getProfile(),
                orderService.getOrders()
            ]);

            const getValue = (result: PromiseSettledResult<any>, defaultVal: any) => {
                if (result.status === 'fulfilled' && result.value !== undefined && result.value !== null) {
                    return result.value;
                }
                return defaultVal;
            };

            const categories = getValue(results[0], []);
            const feedData = getValue(results[1], { products: [], nextCursor: null, hasMore: false });
            const profile = getValue(results[2], null);
            const ordersData = getValue(results[3], null);

            let awaitingConfirmationCount = 0;
            if (ordersData && ordersData.orders) {
                awaitingConfirmationCount = ordersData.orders.filter((o: any) => o.status === 'awaitconfirmation').length;
            }

            // Deduplicate products by inventoryId to prevent duplicate key errors
            const seenIds = new Set<string>();
            const uniqueProducts = (feedData.products || []).filter((p: any) => {
                const id = p.inventoryId || p._id;
                if (seenIds.has(id)) return false;
                seenIds.add(id);
                return true;
            });

            set({
                categories,
                normalProducts: uniqueProducts,
                nextCursor: feedData.nextCursor,
                hasMore: feedData.hasMore,
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
    },

    /**
     * Load more products (infinite scroll)
     * Uses cursor-based pagination for efficient loading
     */
    loadMoreProducts: async () => {
        const { isLoadingMore, hasMore, nextCursor, normalProducts } = get();

        // Don't load if already loading or no more items
        if (isLoadingMore || !hasMore) {
            return;
        }

        const branchId = getCurrentBranchId();
        if (!branchId) {
            return;
        }

        set({ isLoadingMore: true });

        try {
            const feedData = await productService.getProductsFeed(branchId, {
                limit: 20,
                cursor: nextCursor || undefined
            });

            // Deduplicate incoming products and check against existing ones to prevent duplicate key errors
            const existingIds = new Set(normalProducts.map((p: any) => p.inventoryId || p._id));
            const seenInBatch = new Set<string>();

            const newProducts = (feedData.products || []).filter((p: any) => {
                const id = p.inventoryId || p._id;
                if (existingIds.has(id) || seenInBatch.has(id)) return false;
                seenInBatch.add(id);
                return true;
            });

            set({
                normalProducts: [...normalProducts, ...newProducts],
                nextCursor: feedData.nextCursor,
                hasMore: feedData.hasMore,
                isLoadingMore: false
            });
        } catch (error: any) {
            logger.error('Failed to load more products', error);
            set({ isLoadingMore: false });
        }
    }
}));

