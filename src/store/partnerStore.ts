import { create } from 'zustand';
import { PartnerOrder, SubscriptionDelivery, PartnerSubscription } from '../types/partner';
import { partnerService } from '../services/partner/partner.service';
import { logger } from '../utils/logger';

interface PartnerState {
    // Available orders
    availableOrders: PartnerOrder[];
    isLoadingAvailable: boolean;
    availableError: string | null;

    // Active orders
    activeOrders: PartnerOrder[];
    isLoadingActive: boolean;
    activeError: string | null;

    // History orders
    historyOrders: PartnerOrder[];
    isLoadingHistory: boolean;
    historyError: string | null;

    // Subscription deliveries
    todayDeliveries: SubscriptionDelivery[];
    upcomingDeliveries: SubscriptionDelivery[];
    activeSubscriptions: PartnerSubscription[];
    isLoadingSubscriptions: boolean;
    subscriptionError: string | null;

    // Selected order for modal
    selectedOrder: PartnerOrder | null;
    isModalVisible: boolean;

    // Actions
    fetchAvailableOrders: (branchId: string) => Promise<void>;
    fetchActiveOrders: (partnerId: string) => Promise<void>;
    fetchHistoryOrders: (partnerId: string) => Promise<void>;
    fetchDailyDeliveries: (partnerId: string) => Promise<void>;
    fetchActiveSubscriptions: (partnerId: string) => Promise<void>;

    // Order management
    acceptOrder: (orderId: string, partnerId: string) => Promise<boolean>;
    pickupOrder: (orderId: string, partnerId: string) => Promise<boolean>;
    markDelivered: (orderId: string, partnerId: string) => Promise<boolean>;

    // Socket event handlers
    addAvailableOrder: (order: PartnerOrder) => void;
    removeAvailableOrder: (orderId: string) => void;
    updateOrderInList: (order: PartnerOrder) => void;
    moveToHistory: (orderId: string) => void;

    // Modal
    setSelectedOrder: (order: PartnerOrder | null) => void;
    setModalVisible: (visible: boolean) => void;

    // Clear
    clearAll: () => void;
}

export const usePartnerStore = create<PartnerState>((set, get) => ({
    // Initial state
    availableOrders: [],
    isLoadingAvailable: false,
    availableError: null,

    activeOrders: [],
    isLoadingActive: false,
    activeError: null,

    historyOrders: [],
    isLoadingHistory: false,
    historyError: null,

    todayDeliveries: [],
    upcomingDeliveries: [],
    activeSubscriptions: [],
    isLoadingSubscriptions: false,
    subscriptionError: null,

    selectedOrder: null,
    isModalVisible: false,

    // Fetch available orders
    fetchAvailableOrders: async (branchId: string) => {
        set({ isLoadingAvailable: true, availableError: null });
        try {
            const response = await partnerService.getAvailableOrders(branchId);
            set({ availableOrders: response.orders, isLoadingAvailable: false });
        } catch (error: any) {
            set({
                availableError: error.response?.data?.message || 'Failed to fetch available orders',
                isLoadingAvailable: false
            });
        }
    },

    // Fetch active orders
    fetchActiveOrders: async (partnerId: string) => {
        set({ isLoadingActive: true, activeError: null });
        try {
            const response = await partnerService.getCurrentOrders(partnerId);
            set({ activeOrders: response.orders, isLoadingActive: false });
        } catch (error: any) {
            set({
                activeError: error.response?.data?.message || 'Failed to fetch active orders',
                isLoadingActive: false
            });
        }
    },

    // Fetch history orders
    fetchHistoryOrders: async (partnerId: string) => {
        set({ isLoadingHistory: true, historyError: null });
        try {
            const response = await partnerService.getHistoryOrders(partnerId);
            set({ historyOrders: response.orders, isLoadingHistory: false });
        } catch (error: any) {
            set({
                historyError: error.response?.data?.message || 'Failed to fetch order history',
                isLoadingHistory: false
            });
        }
    },

    // Fetch daily deliveries
    fetchDailyDeliveries: async (partnerId: string) => {
        set({ isLoadingSubscriptions: true, subscriptionError: null });
        try {
            const response = await partnerService.getDailyDeliveries(partnerId);
            set({
                todayDeliveries: response.todayDeliveries,
                upcomingDeliveries: response.upcomingDeliveries,
                isLoadingSubscriptions: false
            });
        } catch (error: any) {
            set({
                subscriptionError: error.response?.data?.message || 'Failed to fetch deliveries',
                isLoadingSubscriptions: false
            });
        }
    },

    // Fetch active subscriptions
    fetchActiveSubscriptions: async (partnerId: string) => {
        set({ isLoadingSubscriptions: true, subscriptionError: null });
        try {
            const response = await partnerService.getActiveSubscriptions(partnerId);
            set({ activeSubscriptions: response.data, isLoadingSubscriptions: false });
        } catch (error: any) {
            set({
                subscriptionError: error.response?.data?.message || 'Failed to fetch subscriptions',
                isLoadingSubscriptions: false
            });
        }
    },

    // Accept an order
    acceptOrder: async (orderId: string, partnerId: string) => {
        try {
            const response = await partnerService.acceptOrder(orderId, { deliveryPartnerId: partnerId });

            // Remove from available, add to active using the populated order from response
            const updatedOrder = response.order;
            set({
                availableOrders: get().availableOrders.filter(o => o._id !== orderId),
                activeOrders: [updatedOrder, ...get().activeOrders]
            });
            return true;
        } catch (error: any) {
            logger.error('Accept order error:', error);
            return false;
        }
    },

    // Pickup order
    pickupOrder: async (orderId: string, partnerId: string) => {
        try {
            const response = await partnerService.pickupOrder(orderId, { deliveryPartnerId: partnerId });

            // Update in active orders
            set({
                activeOrders: get().activeOrders.map(o =>
                    o._id === orderId ? response.order : o
                )
            });
            return true;
        } catch (error) {
            logger.error('Pickup order error:', error);
            return false;
        }
    },

    // Mark as delivered
    markDelivered: async (orderId: string, partnerId: string) => {
        try {
            const response = await partnerService.markOrderDelivered(orderId, { deliveryPartnerId: partnerId });

            // Update in active orders
            set({
                activeOrders: get().activeOrders.map(o =>
                    o._id === orderId ? response.order : o
                )
            });
            return true;
        } catch (error) {
            logger.error('Mark delivered error:', error);
            return false;
        }
    },

    // Socket event handlers
    addAvailableOrder: (order: PartnerOrder) => {
        set({ availableOrders: [order, ...get().availableOrders] });
    },

    removeAvailableOrder: (orderId: string) => {
        set({ availableOrders: get().availableOrders.filter(o => o._id !== orderId) });
    },

    updateOrderInList: (order: PartnerOrder) => {
        const { activeOrders } = get();
        const exists = activeOrders.find(o => o._id === order._id);

        if (exists) {
            set({
                activeOrders: activeOrders.map(o => o._id === order._id ? order : o)
            });
        }
    },

    moveToHistory: (orderId: string) => {
        const order = get().activeOrders.find(o => o._id === orderId);
        if (order) {
            set({
                activeOrders: get().activeOrders.filter(o => o._id !== orderId),
                historyOrders: [{ ...order, status: 'delivered' }, ...get().historyOrders]
            });
        }
    },

    // Modal
    setSelectedOrder: (order: PartnerOrder | null) => {
        set({ selectedOrder: order });
    },

    setModalVisible: (visible: boolean) => {
        set({ isModalVisible: visible });
    },

    // Clear all data
    clearAll: () => {
        set({
            availableOrders: [],
            activeOrders: [],
            historyOrders: [],
            todayDeliveries: [],
            upcomingDeliveries: [],
            activeSubscriptions: [],
            selectedOrder: null,
            isModalVisible: false,
        });
    },
}));
