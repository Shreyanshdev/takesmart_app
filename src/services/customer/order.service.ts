import { api } from '../core/api';

export interface OrderItem {
    product: string;
    quantity: number;
    price: number;
}

export interface CreateOrderPayload {
    userId: string;
    branch: string;
    items: {
        id: string;
        item: string;
        count: number;
    }[];
    addressId: string;
    totalPrice: number;
    deliveryFee: number;
    paymentMethod?: 'cod' | 'online';
}

export interface CreateSubscriptionPayload {
    product: string;
    quantity: number;
    shippingAddress: string;
    frequency: 'daily' | 'alternate' | 'weekly' | 'monthly';
    startDate: string; // ISO Date string
    slot: 'morning' | 'evening';
    paymentMethod: 'cod' | 'online';
}

export interface EnhancedSubscriptionProduct {
    productId: string;
    selectedQuantity: string;
    animalType: string;
    deliveryFrequency: string;
    count: number;
    unitPrice: number;
    monthlyPrice: number;
}

export interface CreateEnhancedSubscriptionPayload {
    customerId: string;
    products: EnhancedSubscriptionProduct[];
    slot: string;
    startDate: string;
    endDate: string;
    addressId: string;
    branchId: string;
    branchName?: string;
}

export interface CreatePaymentOrderPayload {
    amount: number;
    currency: string;
    receipt: string;
    orderType: string;
    orderId?: string; // Optional appOrderId
}

export interface VerifyPaymentPayload {
    order_id: string; // Razorpay order ID
    payment_id: string;
    signature: string;
    appOrderId?: string;
    subscriptionId?: string;
    amount?: number;
}

export const orderService = {
    // Create a normal one-time order
    createOrder: async (payload: CreateOrderPayload) => {
        const response = await api.post('/orders', payload);
        return response.data;
    },

    // Create a new subscription (Legacy)
    createSubscription: async (payload: CreateSubscriptionPayload) => {
        const response = await api.post('/subscriptions', payload);
        return response.data;
    },

    // Create enhanced subscription (Multi-product)
    createEnhancedSubscription: async (payload: CreateEnhancedSubscriptionPayload) => {
        const response = await api.post('/subscriptions', payload);
        return response.data;
    },

    // Payment Methods
    createPaymentOrder: async (payload: CreatePaymentOrderPayload) => {
        const response = await api.post('/payments/orders', payload);
        return response.data;
    },

    verifyPayment: async (payload: VerifyPaymentPayload) => {
        const response = await api.post('/payments/verify', payload);
        return response.data;
    },

    // Simulate or Calculate Delivery Charge
    calculateDeliveryCharge: (distanceKm: number): number => {
        // Simple logic: free for first 2km, then ₹10 per km
        // Cap at ₹100 or something reasonable
        if (distanceKm <= 2) return 0;
        return Math.min(Math.ceil((distanceKm - 2) * 10), 100);
    },

    confirmDelivery: async (orderId: string) => {
        const response = await api.patch(`/orders/${orderId}/confirm-receipt`);
        return response.data;
    },

    // Cleanup Methods
    deletePendingOrder: async (orderId: string) => {
        const response = await api.delete(`/orders/${orderId}/pending`);
        return response.data;
    },

    deleteSubscription: async (subscriptionId: string) => {
        const response = await api.delete(`/subscriptions/${subscriptionId}`);
        return response.data;
    },

    // COD Payment Methods
    createCodOrder: async (orderId: string) => {
        const response = await api.post('/payments/cod/order', { orderId });
        return response.data;
    },

    createCodSubscription: async (subscriptionId: string) => {
        const response = await api.post('/payments/cod/subscription', { subscriptionId });
        return response.data;
    },

    // Get order invoice
    getOrderInvoice: async (orderId: string) => {
        const response = await api.get(`/orders/${orderId}/invoice`);
        return response.data;
    }
};
