import { api } from '../core/api';
import { Product } from './product.service';

export const wishlistService = {
    async getWishlist(branchId?: string): Promise<Product[]> {
        const response = await api.get('/wishlist', {
            params: { branchId }
        });
        return response.data;
    },

    async toggleWishlist(productId: string, inventoryId?: string): Promise<any> {
        const response = await api.post('/wishlist', { productId, inventoryId });
        return response.data;
    }
};
