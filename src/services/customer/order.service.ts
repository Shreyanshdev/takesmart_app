import { api } from '../core/api';

export interface OrderItem {
    product: string;
    quantity: number;
    price: number;
}

export interface CreateOrderPayload {
    userId: string;
    branchId: string;
    items: {
        inventoryId: string;
        quantity: number;
    }[];
    addressId: string;
    totalPrice: number;
    deliveryFee: number;
    sgst?: number;
    cgst?: number;
    couponCode?: string | null;
    couponDiscount?: number;
    paymentMethod?: 'cod' | 'online';
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
    amount?: number;
}

export const orderService = {
    // Create a normal one-time order
    createOrder: async (payload: CreateOrderPayload) => {
        const response = await api.post('orders', payload);
        return response.data;
    },



    // Payment Methods
    createPaymentOrder: async (payload: CreatePaymentOrderPayload) => {
        const response = await api.post('payments/orders', payload);
        return response.data;
    },

    verifyPayment: async (payload: VerifyPaymentPayload) => {
        const response = await api.post('payments/verify', payload);
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
        const response = await api.patch(`orders/${orderId}/confirm-receipt`);
        return response.data;
    },

    // Cleanup Methods
    deletePendingOrder: async (orderId: string) => {
        const response = await api.delete(`orders/${orderId}/pending`);
        return response.data;
    },



    // COD Payment Methods
    createCodOrder: async (orderId: string) => {
        const response = await api.post('/payments/cod/order', { orderId });
        return response.data;
    },



    // Get order invoice
    getOrderInvoice: async (orderId: string) => {
        const response = await api.get(`orders/${orderId}/invoice`);
        return response.data;
    },

    // Get Order History
    getOrders: async () => {
        const response = await api.get('orders/my-history');
        return response.data;
    }
};
