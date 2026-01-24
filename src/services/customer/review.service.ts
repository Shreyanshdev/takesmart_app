import { api } from '../core/api';

// Review Types
export interface Review {
    _id: string;
    product: string | { _id: string; name: string; images: string[] };
    customer: { _id: string; name: string };
    order?: string;
    rating: number;
    title?: string;
    comment?: string;
    images?: string[];
    isApproved: boolean;
    isVerifiedPurchase: boolean;
    helpfulCount: number;
    helpfulUsers?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface RatingDistribution {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
}

export interface ProductReviewsResponse {
    success: boolean;
    reviews: Review[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalReviews: number;
    };
    ratingDistribution: RatingDistribution;
}

export interface CreateReviewPayload {
    productId: string;
    rating: number;
    title?: string;
    comment?: string;
    orderId?: string;
}

export const reviewService = {
    /**
     * Create a new review for a product
     */
    createReview: async (payload: CreateReviewPayload): Promise<Review> => {
        const response = await api.post('reviews', payload);
        return response.data.review;
    },

    /**
     * Get reviews for a product
     */
    getProductReviews: async (
        productId: string,
        page = 1,
        limit = 10,
        filters?: { rating?: number | null; sort?: string; order?: 'asc' | 'desc' }
    ): Promise<ProductReviewsResponse> => {
        const { rating, sort = 'createdAt', order = 'desc' } = filters || {};
        const params: any = { page, limit, sort, order };
        if (rating) params.rating = rating;

        const response = await api.get(`reviews/product/${productId}`, { params });
        return response.data;
    },

    /**
     * Get customer's own reviews
     */
    getMyReviews: async (): Promise<Review[]> => {
        const response = await api.get('reviews/my-reviews');
        return response.data.reviews || [];
    },

    /**
     * Update an existing review
     */
    updateReview: async (reviewId: string, payload: Partial<CreateReviewPayload>): Promise<Review> => {
        const response = await api.put(`reviews/${reviewId}`, payload);
        return response.data.review;
    },

    /**
     * Delete a review
     */
    deleteReview: async (reviewId: string): Promise<void> => {
        await api.delete(`reviews/${reviewId}`);
    },

    /**
     * Mark a review as helpful
     */
    markHelpful: async (reviewId: string): Promise<number> => {
        const response = await api.post(`reviews/${reviewId}/helpful`);
        return response.data.helpfulCount;
    },

    /**
     * Check if customer has already reviewed a product
     */
    hasReviewed: async (productId: string): Promise<boolean> => {
        try {
            const myReviews = await reviewService.getMyReviews();
            return myReviews.some(r => {
                const prodId = typeof r.product === 'string' ? r.product : r.product._id;
                return prodId === productId;
            });
        } catch {
            return false;
        }
    },

    /**
     * Get all reviews linked to a specific order
     */
    getOrderReviews: async (orderId: string): Promise<Review[]> => {
        const response = await api.get(`reviews/order/${orderId}`);
        return response.data.reviews || [];
    }
};
