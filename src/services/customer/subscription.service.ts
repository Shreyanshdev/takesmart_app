import { api } from '../core/api';
import { logger } from '../../utils/logger';

export interface Branch {
    _id: string;
    name: string;
    address: string;
}

export interface SubscriptionProduct {
    subscriptionProductId: string;
    productId: {
        _id: string;
        name: string;
        description: string;
        category: string;
        formattedQuantity: string;
        discountPercentage: number;
        id: string;
    } | string;
    productName: string;
    quantityValue: number;
    quantityUnit: string;
    unitPrice: number;
    monthlyPrice?: number;
    deliveryFrequency: string;
    deliveryGap: number;
    maxDeliveries: number;
    totalDeliveries: number;
    deliveredCount: number;
    remainingDeliveries: number;
    count: number;
    _id: string;
}

export interface DeliveryProduct {
    subscriptionProductId: string;
    productId: string;
    productName: string;
    quantityValue: number;
    quantityUnit: string;
    unitPrice: number;
    animalType?: string;
    deliveryStatus: string;
    _id: string;
}

export interface Delivery {
    date: string;
    slot: 'morning' | 'evening';
    status: 'scheduled' | 'reaching' | 'awaitingCustomer' | 'delivered' | 'paused' | 'canceled' | 'noResponse' | 'concession';
    concession: boolean;
    cutoffTime: string;
    products: DeliveryProduct[];
    isCustom: boolean;
    _id: string;
}

export interface Subscription {
    _id: string;
    customer: string;
    products: SubscriptionProduct[];
    branch: Branch;
    slot: 'morning' | 'evening';
    startDate: string;
    endDate: string;
    deliveryAddress: {
        _id: string;
        addressLine1: string;
        addressLine2: string;
        city: string;
        state: string;
        zipCode: string;
    };
    price: number;
    bill: number;
    status: 'active' | 'paused' | 'cancelled' | 'pending' | 'expired' | 'completed' | 'expiring';
    paymentStatus: string;
    deliveries: Delivery[];
    createdAt: string;
    updatedAt: string;
    subscriptionId: string;
    paymentDetails?: any;
    deliveryPartner?: any;
}

export const subscriptionService = {
    // Get nearest branch for user location
    getNearestBranch: async (lat: number, lng: number): Promise<{ branch: Branch, distance: number }> => {
        const response = await api.get(`/subscriptions/nearest-branch?latitude=${lat}&longitude=${lng}`);
        return response.data;
    },

    // Get current logged-in customer's subscription
    getMySubscription: async (): Promise<Subscription | null> => {
        try {
            const response = await api.get('/subscriptions/my');
            // Check for success == true wrapper or direct array
            let data = response.data;
            if (data.success && data.data) {
                data = data.data;
            }

            if (Array.isArray(data)) {
                return data.length > 0 ? data[0] : null;
            }
            return data;
        } catch (error) {
            logger.log('No active subscription found or error', error);
            return null;
        }
    },

    // Fallback: Get by ID if we have customer ID manually
    getCustomerSubscription: async (customerId: string): Promise<Subscription | null> => {
        try {
            const response = await api.get(`/subscriptions/customer/${customerId}`);
            return response.data;
        } catch (error) {
            return null;
        }
    },

    // --- Delivery Management (New) ---

    // Get delivery calendar for a month
    getDeliveryCalendar: async (subscriptionId: string, year: number, month: number): Promise<any> => {
        const response = await api.get(`/deliveries/${subscriptionId}/calendar`, {
            params: { year, month }
        });
        return response.data;
    },

    // Get upcoming deliveries
    getUpcomingDeliveries: async (subscriptionId: string): Promise<any> => {
        const response = await api.get(`/deliveries/${subscriptionId}/upcoming`);
        return response.data;
    },

    // Get details for a specific delivery date
    getDeliveryDetailsByDate: async (subscriptionId: string, deliveryDate: string): Promise<any> => {
        const response = await api.get(`/deliveries/${subscriptionId}/${deliveryDate}`);
        return response.data;
    },

    // Change slot
    changeDeliverySlot: async (subscriptionId: string, deliveryDate: string, newSlot: 'morning' | 'evening'): Promise<any> => {
        const response = await api.patch(`/deliveries/${subscriptionId}/${deliveryDate}/slot`, {
            newSlot
        });
        return response.data;
    },

    // Reschedule single delivery
    rescheduleDelivery: async (subscriptionId: string, deliveryDate: string, newDate: string, newSlot: 'morning' | 'evening'): Promise<any> => {
        const response = await api.patch(`/deliveries/${subscriptionId}/${deliveryDate}/reschedule`, {
            newDate,
            newSlot
        });
        return response.data;
    },

    // Reschedule multiple
    rescheduleMultipleDeliveries: async (subscriptionId: string, deliveryDates: string[], newStartDate: string, newSlot: 'morning' | 'evening'): Promise<any> => {
        const response = await api.patch(`/deliveries/${subscriptionId}/reschedule`, {
            deliveryDates,
            newStartDate,
            newSlot
        });
        return response.data;
    },

    // Confirm delivery
    confirmDelivery: async (subscriptionId: string, deliveryDate: string): Promise<any> => {
        const response = await api.post(`/deliveries/${subscriptionId}/${deliveryDate}/confirm`);
        return response.data;
    },

    // Get available reschedule dates
    getAvailableRescheduleDates: async (subscriptionId: string, deliveryDate: string, slot: string, consecutiveDays?: number): Promise<any> => {
        const response = await api.get(`/subscriptions/available-reschedule-dates`, {
            params: { subscriptionId, deliveryDate, slot, consecutiveDays }
        });
        return response.data;
    },

    // --- Add Product to Subscription ---

    // Create payment order for adding product
    createAddProductPaymentOrder: async (amount: number, subscriptionId: string): Promise<{
        id: string;
        amount: number;
        currency: string;
        receipt: string;
    }> => {
        // Receipt must be max 40 chars for Razorpay
        const shortId = subscriptionId.slice(-8);
        const timestamp = Date.now().toString().slice(-8);
        const response = await api.post('/payments/orders', {
            amount,
            currency: 'INR',
            receipt: `ap_${shortId}_${timestamp}`, // "ap" = add product, max ~20 chars
            orderType: 'addProduct'
        });
        return response.data;
    },

    // Verify payment for add product
    verifyAddProductPayment: async (payload: {
        order_id: string;
        payment_id: string;
        signature: string;
        subscriptionId: string;
        amount: number;
    }): Promise<{ success: boolean; message: string }> => {
        const response = await api.post('/payments/verify', {
            ...payload,
            isAddProductPayment: true
        });
        return response.data;
    },

    // Add product to existing subscription
    addProductToExistingSubscription: async (
        subscriptionId: string,
        payload: {
            productId: string;
            productName: string;
            animalType?: string;
            quantityValue: number;
            quantityUnit: string;
            unitPrice: number;
            deliveryFrequency: 'daily' | 'alternate' | 'weekly' | 'monthly';
            deliveryGap?: number;
            maxDeliveries: number;
            startDate: string;
            paymentVerified: boolean;
            razorpayOrderId: string;
            razorpayPaymentId: string;
            razorpaySignature?: string;
            paymentAmount: number;
        }
    ): Promise<{
        success: boolean;
        message: string;
        data: {
            subscription: Subscription;
            addedProduct: {
                subscriptionProductId: string;
                productId: string;
                productName: string;
                quantityValue: number;
                quantityUnit: string;
                monthlyPrice: number;
                deliveryFrequency: string;
                maxDeliveries: number;
                startDate: string;
            };
            paymentDetails: {
                recorded: boolean;
                razorpayOrderId: string;
                razorpayPaymentId: string;
                amount: number;
                verifiedAt: string;
            };
            totalMonthlyPrice: number;
        };
    }> => {
        const response = await api.post(`/subscriptions/${subscriptionId}/add-product`, payload);
        return response.data;
    },

    // Get product payment history for a subscription
    getProductPaymentHistory: async (subscriptionId: string): Promise<any[]> => {
        const response = await api.get(`/subscriptions/${subscriptionId}`);
        return response.data?.productPaymentHistory || [];
    },

    // Get all subscription history for the logged-in customer
    getSubscriptionHistory: async (): Promise<{ subscriptions: any[] }> => {
        const response = await api.get('/subscriptions/history');
        return response.data;
    },

    // Get detailed invoice for a specific subscription
    getSubscriptionInvoice: async (subscriptionId: string): Promise<any> => {
        const response = await api.get(`/subscriptions/${subscriptionId}/invoice`);
        return response.data;
    }
};
