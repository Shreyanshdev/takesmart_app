import { api } from '../core/api';
import { ENV } from '../../utils/env';

export interface CouponData {
    _id: string;
    code: string;
    description: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderValue: number;
    maxDiscountAmount: number | null;
    validUntil: string;
    remainingUses?: number | null;
}

export interface ValidateCouponResponse {
    success: boolean;
    message?: string;
    coupon?: CouponData;
    discount?: number;
    newTotal?: number;
}

export interface AvailableCouponsResponse {
    success: boolean;
    count: number;
    coupons: CouponData[];
}

class CouponService {
    private baseUrl = '/coupons';

    /**
     * Get available coupons for the current branch
     */
    async getAvailableCoupons(branchId?: string, userId?: string): Promise<AvailableCouponsResponse> {
        try {
            const params = new URLSearchParams();
            if (branchId) params.append('branchId', branchId);
            if (userId) params.append('userId', userId);

            const response = await api.get(`${this.baseUrl}/available?${params.toString()}`);
            return response.data;
        } catch (error: any) {
            console.error('Error fetching available coupons:', error);
            throw error;
        }
    }

    /**
     * Validate a coupon code and get discount amount
     */
    async validateCoupon(
        code: string,
        cartTotal: number,
        branchId?: string,
        userId?: string
    ): Promise<ValidateCouponResponse> {
        try {
            const response = await api.post(`${this.baseUrl}/validate`, {
                code,
                cartTotal,
                branchId,
                userId
            });
            return response.data;
        } catch (error: any) {
            console.error('Error validating coupon:', error);
            if (error.response?.data) {
                return error.response.data;
            }
            throw error;
        }
    }

    /**
     * Apply a coupon to an order (records usage)
     */
    async applyCoupon(
        code: string,
        cartTotal: number,
        branchId?: string,
        userId?: string
    ): Promise<ValidateCouponResponse> {
        try {
            const response = await api.post(`${this.baseUrl}/apply`, {
                code,
                cartTotal,
                branchId,
                userId
            });
            return response.data;
        } catch (error: any) {
            console.error('Error applying coupon:', error);
            if (error.response?.data) {
                return error.response.data;
            }
            throw error;
        }
    }

    /**
     * Search coupons by code
     */
    async searchCoupons(query: string, branchId?: string, userId?: string): Promise<AvailableCouponsResponse> {
        try {
            const params = new URLSearchParams();
            params.append('query', query);
            if (branchId) params.append('branchId', branchId);
            if (userId) params.append('userId', userId);

            const response = await api.get(`${this.baseUrl}/search?${params.toString()}`);
            return response.data;
        } catch (error: any) {
            console.error('Error searching coupons:', error);
            throw error;
        }
    }

    /**
     * Format discount display text
     */
    formatDiscount(coupon: CouponData): string {
        if (coupon.discountType === 'percentage') {
            let text = `${coupon.discountValue}% OFF`;
            if (coupon.maxDiscountAmount) {
                text += ` (up to ₹${coupon.maxDiscountAmount})`;
            }
            return text;
        }
        return `₹${coupon.discountValue} OFF`;
    }

    /**
     * Format minimum order text
     */
    formatMinOrder(coupon: CouponData): string {
        if (coupon.minOrderValue > 0) {
            return `Min. order ₹${coupon.minOrderValue}`;
        }
        return 'No minimum';
    }

    /**
     * Check if coupon is applicable to cart
     */
    isApplicable(coupon: CouponData, cartTotal: number): boolean {
        return cartTotal >= coupon.minOrderValue;
    }
}

export const couponService = new CouponService();
