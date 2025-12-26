import { api } from '../core/api';
import { PartnerOrder, SubscriptionDelivery, PartnerSubscription, DeliveryLocation } from '../../types/partner';
import { logger } from '../../utils/logger';

export interface AcceptOrderPayload {
    deliveryPartnerId: string;
}

export interface PickupOrderPayload {
    deliveryPartnerId: string;
    pickupLocation?: DeliveryLocation;
}

export interface DeliveredPayload {
    deliveryPartnerId: string;
    deliveryLocation?: DeliveryLocation;
}

export interface LocationUpdatePayload {
    deliveryPartnerId: string;
    location: DeliveryLocation;
    routeData?: {
        coordinates?: Array<{ latitude: number; longitude: number }>;
        distance?: number;
        duration?: number;
    };
}

export interface SubscriptionDeliveryPayload {
    subscriptionId: string;
    deliveryDate: string;
    deliveryPartnerId: string;
    partnerLocation?: DeliveryLocation;
}

export const partnerService = {
    // ==================== ORDER ENDPOINTS ====================

    // Get available orders for partner's branch
    getAvailableOrders: async (branchId: string): Promise<{ orders: PartnerOrder[]; total: number }> => {
        logger.api('GET', `/orders/available/${branchId}`);
        try {
            const response = await api.get(`/orders/available/${branchId}`);
            logger.log('Available Orders Response:', response.data);
            return response.data;
        } catch (error: any) {
            logger.error('Available Orders Error:', error.response?.data || error.message);
            throw error;
        }
    },

    // Accept an available order
    acceptOrder: async (orderId: string, payload: AcceptOrderPayload): Promise<{ order: PartnerOrder }> => {
        const response = await api.post(`/orders/${orderId}/accept`, payload);
        return response.data;
    },

    // Mark order as picked up from branch
    pickupOrder: async (orderId: string, payload: PickupOrderPayload): Promise<{ order: PartnerOrder }> => {
        const response = await api.post(`/orders/${orderId}/pickup`, payload);
        return response.data;
    },

    // Mark order as delivered (awaiting customer confirmation)
    markOrderDelivered: async (orderId: string, payload: DeliveredPayload): Promise<{ order: PartnerOrder }> => {
        const response = await api.post(`/orders/${orderId}/delivered`, payload);
        return response.data;
    },

    // Get current active orders for delivery partner
    getCurrentOrders: async (deliveryPartnerId: string): Promise<{ orders: PartnerOrder[]; total: number }> => {
        const response = await api.get(`/orders/current/${deliveryPartnerId}`);
        return response.data;
    },

    // Get order history for delivery partner
    getHistoryOrders: async (deliveryPartnerId: string): Promise<{ orders: PartnerOrder[]; total: number }> => {
        const response = await api.get(`/orders/history/${deliveryPartnerId}`);
        return response.data;
    },

    // Update delivery partner location during delivery
    updateLocation: async (orderId: string, payload: LocationUpdatePayload): Promise<{ order: PartnerOrder }> => {
        const response = await api.patch(`/orders/${orderId}/location`, payload);
        return response.data;
    },

    // Get optimized route for delivery
    getOptimizedRoute: async (orderId: string, origin: DeliveryLocation, destination: DeliveryLocation) => {
        const response = await api.post(`/orders/${orderId}/optimize-route`, { origin, destination });
        return response.data;
    },

    // Get Google Maps directions
    getDirections: async (orderId: string, origin: DeliveryLocation, destination: DeliveryLocation, routeType: string, updateOrder: boolean = false) => {
        const response = await api.post(`/orders/${orderId}/directions`, { origin, destination, routeType, updateOrder });
        return response.data;
    },

    // ==================== SUBSCRIPTION ENDPOINTS ====================

    // Get active subscriptions assigned to partner
    getActiveSubscriptions: async (partnerId: string): Promise<{ data: PartnerSubscription[]; count: number }> => {
        const response = await api.get(`/subscriptions/partners/${partnerId}/active`);
        return response.data;
    },

    // Get daily subscription deliveries for partner
    getDailyDeliveries: async (partnerId: string): Promise<{
        todayDeliveries: SubscriptionDelivery[];
        upcomingDeliveries: SubscriptionDelivery[];
        totalToday: number;
        totalUpcoming: number;
    }> => {
        const response = await api.get(`/subscriptions/partners/${partnerId}/deliveries/daily`);
        return response.data;
    },

    // Get scheduled deliveries for partner
    getScheduledDeliveries: async (partnerId: string): Promise<{ deliveries: SubscriptionDelivery[]; totalCount: number }> => {
        const response = await api.get(`/subscriptions/partners/${partnerId}/deliveries/scheduled`);
        return response.data;
    },

    // Get completed deliveries for partner
    getCompletedDeliveries: async (partnerId: string): Promise<{ deliveries: SubscriptionDelivery[]; totalCount: number }> => {
        const response = await api.get(`/subscriptions/partners/${partnerId}/deliveries/completed`);
        return response.data;
    },

    // Start delivery journey (status: scheduled -> reaching)
    startDeliveryJourney: async (payload: SubscriptionDeliveryPayload): Promise<{ delivery: SubscriptionDelivery }> => {
        const response = await api.post('/subscriptions/deliveries/journey/start', payload);
        return response.data;
    },

    // Mark subscription delivery as delivered (status: reaching -> awaitingCustomer)
    markSubscriptionDelivered: async (payload: SubscriptionDeliveryPayload): Promise<{ delivery: SubscriptionDelivery }> => {
        const response = await api.post('/subscriptions/deliveries/delivered', payload);
        return response.data;
    },

    // Mark delivery as no response (customer not available)
    markDeliveryNoResponse: async (payload: SubscriptionDeliveryPayload): Promise<{ delivery: SubscriptionDelivery }> => {
        const response = await api.post('/subscriptions/deliveries/no-response', payload);
        return response.data;
    },

    // Confirm pickup from branch
    confirmPickup: async (payload: SubscriptionDeliveryPayload & { location?: DeliveryLocation }): Promise<{ delivery: SubscriptionDelivery }> => {
        const response = await api.post('/subscriptions/deliveries/pickup/confirm', payload);
        return response.data;
    },

    // Update live location during subscription delivery
    updateLiveLocation: async (payload: {
        subscriptionId: string;
        deliveryDate: string;
        deliveryPartnerId: string;
        location: DeliveryLocation;
    }): Promise<void> => {
        const response = await api.post('/subscriptions/deliveries/location', payload);
        return response.data;
    },

    // Update real-time location (more frequent updates)
    updateRealTimeLocation: async (payload: {
        subscriptionId: string;
        deliveryDate: string;
        deliveryPartnerId: string;
        location: DeliveryLocation;
    }): Promise<void> => {
        const response = await api.post('/subscriptions/deliveries/location/realtime', payload);
        return response.data;
    },

    // Get delivery details for a specific subscription delivery
    getDeliveryDetails: async (subscriptionId: string, deliveryDate: string): Promise<{ data: SubscriptionDelivery }> => {
        const response = await api.get(`/subscriptions/${subscriptionId}/deliveries/${deliveryDate}`);
        return response.data;
    },
};
