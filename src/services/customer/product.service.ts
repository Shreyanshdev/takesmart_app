import { api } from '../core/api';

// Inventory Variant Type (from backend Inventory model)
export interface InventoryVariant {
    sku: string;
    packSize: string;
    weightValue: number;
    weightUnit: 'ml' | 'l' | 'g' | 'kg' | 'pcs' | 'dozen';
    images?: string[];
    maxQtyPerOrder?: number;
}

// Inventory Pricing Type (from backend Inventory model)
export interface InventoryPricing {
    mrp: number;
    sellingPrice: number;
    costPrice?: number;
    discount: number;
}

// Inventory Type (represents product in a specific branch with pricing)
export interface Inventory {
    _id: string;
    inventoryId: string;
    branch: string;
    product: string;
    variant: InventoryVariant;
    pricing: InventoryPricing;
    stock: number;
    reservedStock: number;
    isAvailable: boolean;
    displayOrder: number;
}

// Other Information (flexible key-value for regulatory info)
export interface OtherInformation {
    label: string;
    value: string;
}

// Product Attribute (flexible key-value pairs)
export interface ProductAttribute {
    key: string;
    value: any;
}

// Product Rating Statistics
export interface ProductRating {
    average: number;
    count: number;
}

// Product Type (Master Product with optional inventory data)
export interface Product {
    _id: string;
    name: string;
    brand?: string;
    category: string;
    subCategory?: string;
    shortDescription?: string;
    description: string;
    images: string[];
    attributes?: ProductAttribute[];
    isActive: boolean;
    tags?: string[];
    slug?: string;

    // Flexible Other Information (FSSAI, Country of Origin, etc.)
    otherInformation?: OtherInformation[];

    // Rating Statistics
    rating?: ProductRating;

    // --- Populated Inventory Data (when fetched with branch context) ---
    // These fields come from the Inventory when products are fetched for a specific branch
    inventoryId?: string;
    variant?: InventoryVariant;
    pricing?: InventoryPricing;
    stock?: number;
    isAvailable?: boolean;
    variants?: Inventory[];

    // --- Legacy/Compatibility Fields (for transition) ---
    price: number;           // Mapped from pricing.mrp or pricing.sellingPrice
    discountPrice?: number;  // Mapped from pricing.sellingPrice when discount exists
    image?: string;          // Legacy single image, uses images[0]
    quantity?: { value: number; unit: string }; // Legacy, now use variant.weightValue/weightUnit
    formattedQuantity?: string;
    unit?: string;
}

export interface Category {
    _id: string;
    name: string;
    image: string;
    icon?: string;
    color?: string;
    isActive?: boolean;
    order?: number;
}

export interface SubCategory {
    _id: string;
    name: string;
    image: string;
    category: string | Category;
    isActive?: boolean;
    order?: number;
}

export interface SubCategoryGrouped {
    category: Category;
    subcategories: SubCategory[];
}

export const productService = {
    // Fetch all categories
    getCategories: async (): Promise<Category[]> => {
        const response = await api.get('products/categories');
        const data = response.data;
        if (Array.isArray(data)) return data;
        if (data.categories && Array.isArray(data.categories)) return data.categories;
        if (data.data && Array.isArray(data.data)) return data.data;
        return [];
    },

    // Fetch all subcategories
    getSubCategories: async (): Promise<SubCategory[]> => {
        const response = await api.get('products/subcategories');
        return Array.isArray(response.data) ? response.data : [];
    },

    // Fetch subcategories by category
    getSubCategoriesByCategory: async (categoryId: string): Promise<SubCategory[]> => {
        const response = await api.get(`products/subcategories/${categoryId}`);
        return Array.isArray(response.data) ? response.data : [];
    },

    // Fetch subcategories grouped by category (for Categories screen)
    getSubCategoriesGrouped: async (): Promise<SubCategoryGrouped[]> => {
        const response = await api.get('products/subcategories/grouped');
        return Array.isArray(response.data) ? response.data : [];
    },

    // Fetch all products (with optional branch context for inventory pricing)
    // DEPRECATED: Use getProductsFeed for optimized paginated fetching
    getAllProducts: async (branchId?: string): Promise<Product[]> => {
        const url = branchId ? `products?branchId=${branchId}` : 'products';
        const response = await api.get(url);
        return response.data?.products || [];
    },

    /**
     * Fetch products with cursor-based pagination (OPTIMIZED)
     * 
     * Industry-grade like Zepto/Blinkit:
     * - Cursor-based pagination (efficient, no offset issues)
     * - Lightweight response (only data needed for product cards)
     * - Branch-based filtering (required)
     * 
     * @param branchId - Required branch ID
     * @param options.limit - Number of products (default: 20, max: 50)
     * @param options.cursor - Last product ID from previous request
     * @param options.category - Optional category filter
     * @param options.subcategory - Optional subcategory filter (takes precedence over category)
     */
    getProductsFeed: async (
        branchId: string,
        options: {
            limit?: number;
            cursor?: string;
            category?: string;
            subcategory?: string;
            brand?: string;
        } = {}
    ): Promise<{

        products: Product[];
        nextCursor: string | null;
        hasMore: boolean;
        count: number;
    }> => {
        const { limit = 20, cursor, category, subcategory, brand } = options;

        let url = `products/feed?branchId=${branchId}&limit=${limit}`;
        if (cursor) url += `&cursor=${cursor}`;
        if (subcategory) url += `&subcategory=${subcategory}`;
        else if (category) url += `&category=${category}`;
        if (brand) url += `&brand=${encodeURIComponent(brand)}`;


        const response = await api.get(url);
        return {
            products: response.data?.products || [],
            nextCursor: response.data?.nextCursor || null,
            hasMore: response.data?.hasMore || false,
            count: response.data?.count || 0
        };
    },


    // Fetch products by category
    getProductsByCategory: async (categoryId: string, branchId?: string): Promise<Product[]> => {
        const url = branchId
            ? `products/category/${categoryId}?branchId=${branchId}`
            : `products/category/${categoryId}`;
        const response = await api.get(url);
        return response.data?.products || [];
    },

    // Fetch single product with inventory details
    getProductById: async (productId: string, branchId?: string): Promise<Product | null> => {
        const url = branchId
            ? `products/${productId}?branchId=${branchId}`
            : `products/${productId}`;
        const response = await api.get(url);

        // Backend returns { product, variants } - merge them together
        if (response.data?.product) {
            return {
                ...response.data.product,
                variants: response.data.variants || []
            };
        }
        return null;
    },

    // Search products
    searchProducts: async (query: string, branchId?: string): Promise<Product[]> => {
        const url = branchId
            ? `products/search?q=${query}&branchId=${branchId}`
            : `products/search?q=${query}`;
        const response = await api.get(url);
        return response.data?.products || [];
    },

    // Fetch featured products (for homepage)
    getFeaturedProducts: async (branchId?: string): Promise<Product[]> => {
        const url = branchId ? `products/featured?branchId=${branchId}` : 'products/featured';
        const response = await api.get(url);
        return Array.isArray(response.data) ? response.data : [];
    },

    // Fetch related products for a given product
    getRelatedProducts: async (productId: string, branchId?: string, page = 1, limit = 8): Promise<{ products: Product[], pagination: any }> => {
        const url = branchId
            ? `products/${productId}/related?branchId=${branchId}&page=${page}&limit=${limit}`
            : `products/${productId}/related?page=${page}&limit=${limit}`;
        const response = await api.get(url);
        return response.data;
    },

    // Fetch products by brand name
    getProductsByBrand: async (brandName: string, branchId?: string, page = 1, limit = 20): Promise<{ products: Product[], pagination: any }> => {
        const url = branchId
            ? `products/brand/${encodeURIComponent(brandName)}?branchId=${branchId}&page=${page}&limit=${limit}`
            : `products/brand/${encodeURIComponent(brandName)}?page=${page}&limit=${limit}`;
        const response = await api.get(url);
        return response.data;
    },

    // Validate cart items stock availability
    validateCartStock: async (items: { inventoryId: string, quantity: number }[]): Promise<{
        success: boolean;
        allAvailable: boolean;
        hasOutOfStock: boolean;
        hasInsufficientStock: boolean;
        message: string;
        items: Array<{
            inventoryId: string;
            requestedQuantity: number;
            available: boolean;
            status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'NOT_FOUND';
            message: string;
            productName: string;
            productImage?: string;
            availableStock: number;
            canOrder: number;
        }>;
    }> => {
        const response = await api.post('inventory/validate-cart', { items });
        return response.data;
    },

    // Decisive quantity update from backend
    updateCartItemQty: async (inventoryId: string, requestedQty: number): Promise<{
        success: boolean;
        finalQty: number;
        message: string;
        availableStock: number;
    }> => {
        const response = await api.post('inventory/update-item-qty', { inventoryId, requestedQty });
        return response.data;
    }
};
