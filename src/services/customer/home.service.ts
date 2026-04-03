import { api } from '../core/api';

export interface HomeLayoutSection {
    _id: string;
    type: 'BANNER_CAROUSEL' | 'CATEGORY_GRID' | 'PRODUCT_STRIP' | 'BRAND_SPOTLIGHT' | 'CATEGORY_SHOWCASE' | 'CUSTOM_BANNER' | 'FEATURED_SECTION';
    title: string;
    subtitle: string;
    data: any;
    resolvedData: any;
    order: number;
    isActive: boolean;
}

export const homeService = {
    /**
     * Fetch all active home layout sections with resolved data
     */
    getHomeLayoutFeed: async (branchId?: string): Promise<HomeLayoutSection[]> => {
        try {
            const url = branchId
                ? `home-layout/feed?branchId=${branchId}`
                : 'home-layout/feed';
            const response = await api.get(url);
            return response.data?.sections || [];
        } catch (error) {
            console.error('Failed to fetch home layout:', error);
            return [];
        }
    },

    /**
     * Seed home layout (dev only)
     */
    seedHomeLayout: async (): Promise<void> => {
        try {
            await api.post('home-layout/seed');
        } catch (error) {
            console.error('Failed to seed home layout:', error);
        }
    }
};
