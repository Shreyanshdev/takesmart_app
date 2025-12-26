import { api } from '../core/api';

export interface Product {
    _id: string;
    name: string;
    description: string;
    shortDescription?: string;
    price: number;
    discountPrice?: number;
    images: string[];
    image?: string;
    category: string;
    // Dairy-specific fields
    animalType?: 'cow' | 'buffalo' | 'goat' | 'mixed';
    breed?: string;
    productType?: 'milk' | 'curd' | 'paneer' | 'ghee' | 'butter' | 'cheese' | 'buttermilk' | 'lassi';
    fatContent?: number;
    isSubscriptionAvailable: boolean;
    subscriptionConfig?: {
        frequencyPricing: {
            [key in 'daily' | 'alternate' | 'weekly' | 'monthly']?: {
                enabled: boolean;
                multiplier?: number;
                maxDeliveries?: number;
                description?: string;
            }
        };
        deliveryFrequencies?: any[];
    };
    quantity: { value: number; unit: string };
    formattedQuantity?: string;
    unit?: string;
    ratings?: {
        average: number;
        count: number;
    };
    nutrients?: { [key: string]: string };
    shelfLife?: string;
    storageTemp?: string;
}

export interface Category {
    _id: string;
    name: string;
    image: string;
    color?: string; // Optional hex color for UI
}

export const productService = {
    // Fetch all categories
    getCategories: async (): Promise<Category[]> => {
        const response = await api.get('/products/categories');
        // Backend returns array directly or { categories: [] } depending on controller
        // Based on typical pattern here, likely array or inside object. 
        // Will fix after seeing category.js, but for now assuming direct or .categories
        // Safe check:
        const data = response.data;
        if (Array.isArray(data)) return data;
        if (data.categories && Array.isArray(data.categories)) return data.categories;
        if (data.data && Array.isArray(data.data)) return data.data;
        return [];
    },

    // Fetch featured products (for Hero/Highlight)
    getFeaturedProducts: async (): Promise<Product[]> => {
        const response = await api.get('/products/featured');
        // Backend returns array directly: res.json(products)
        return Array.isArray(response.data) ? response.data : [];
    },

    // Fetch products available for subscription
    getSubscriptionProducts: async (): Promise<Product[]> => {
        const response = await api.get('/products/subscription-available');
        // Backend returns { products: [...], pagination: ... }
        return response.data?.products || [];
    },

    // Fetch normal daily essential products (all products)
    getAllProducts: async (): Promise<Product[]> => {
        const response = await api.get('/products');
        // Backend returns { products: [...], pagination: ... }
        return response.data?.products || [];
    },

    // Search
    searchProducts: async (query: string): Promise<Product[]> => {
        const response = await api.get(`/products/search?q=${query}`);
        // Backend returns { products: [...], pagination: ... }
        return response.data?.products || [];
    }
};
