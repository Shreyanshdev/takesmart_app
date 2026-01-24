import { api } from '../core/api';

export interface BannerSlide {
    _id: string;
    imageUrl: string;
    title?: string;
    buttonText?: string;
    actionType: 'PRODUCT' | 'CATEGORY' | 'BRAND' | 'NONE';
    targetValue?: string;
    order: number;
}

export interface Banner {
    _id: string;
    position: 'HOME_MAIN' | 'HOME_SECONDARY';
    slides: BannerSlide[];
    isActive: boolean;
}

export const bannerService = {
    getBanners: async (): Promise<Record<string, Banner>> => {
        try {
            const response = await api.get('/banners');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch banners:', error);
            return {};
        }
    }
};
