import { api } from '../core/api';
import { PartnerOrder, DeliveryLocation } from '../../types/partner';
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



export const partnerService = {
    // ==================== ORDER ENDPOINTS ====================

    // Get available orders for partner's branch
    getAvailableOrders: async (branchId: string): Promise<{ orders: PartnerOrder[]; total: number }> => {
        logger.api('GET', `orders/available/${branchId}`);
        try {
            const response = await api.get(`orders/available/${branchId}`);
            logger.log('Available Orders Response:', response.data);
            return response.data;
        } catch (error: any) {
            logger.error('Available Orders Error:', error.response?.data || error.message);
            throw error;
        }
    },

    // Accept an available order
    acceptOrder: async (orderId: string, payload: AcceptOrderPayload): Promise<{ order: PartnerOrder }> => {
        const response = await api.post(`orders/${orderId}/accept`, payload);
        return response.data;
    },

    // Mark order as picked up from branch
    pickupOrder: async (orderId: string, payload: PickupOrderPayload): Promise<{ order: PartnerOrder }> => {
        const response = await api.post(`orders/${orderId}/pickup`, payload);
        return response.data;
    },

    // Mark order as delivered (awaiting customer confirmation)
    markOrderDelivered: async (orderId: string, payload: DeliveredPayload): Promise<{ order: PartnerOrder }> => {
        const response = await api.post(`orders/${orderId}/delivered`, payload);
        return response.data;
    },

    // Get current active orders for delivery partner
    getCurrentOrders: async (deliveryPartnerId: string): Promise<{ orders: PartnerOrder[]; total: number }> => {
        const response = await api.get(`orders/current/${deliveryPartnerId}`);
        return response.data;
    },

    // Get order history for delivery partner
    getHistoryOrders: async (deliveryPartnerId: string): Promise<{ orders: PartnerOrder[]; total: number }> => {
        const response = await api.get(`orders/history/${deliveryPartnerId}`);
        return response.data;
    },

    // Update delivery partner location during delivery
    updateLocation: async (orderId: string, payload: LocationUpdatePayload): Promise<{ order: PartnerOrder }> => {
        const response = await api.patch(`orders/${orderId}/location`, payload);
        return response.data;
    },

    // Get optimized route for delivery
    getOptimizedRoute: async (orderId: string, origin: DeliveryLocation, destination: DeliveryLocation) => {
        const response = await api.post(`orders/${orderId}/optimize-route`, { origin, destination });
        return response.data;
    },

    // Get Google Maps directions
    getDirections: async (orderId: string, origin: DeliveryLocation, destination: DeliveryLocation, routeType: string, updateOrder: boolean = false) => {
        const response = await api.post(`orders/${orderId}/directions`, { origin, destination, routeType, updateOrder });
        return response.data;
    },

    // Get order by ID
    getOrderById: async (orderId: string): Promise<{ order: PartnerOrder }> => {
        const response = await api.get(`orders/${orderId}`);
        return response.data;
    },

    // Verify cash collection for COD order
    verifyCashPayment: async (orderId: string): Promise<{ message: string; order: PartnerOrder }> => {
        const response = await api.post(`orders/${orderId}/verify-cash`);
        return response.data;
    },
};
