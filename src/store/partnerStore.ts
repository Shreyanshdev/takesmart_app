import { create } from 'zustand';
import { PartnerOrder } from '../types/partner';
import { partnerService } from '../services/partner/partner.service';
import { logger } from '../utils/logger';
import { notifyNewOrderAvailable, setAppBadgeCount } from '../services/notification/notification.service';

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



    // Selected order for modal
    selectedOrder: PartnerOrder | null;
    isModalVisible: boolean;

    // Actions
    fetchAvailableOrders: (branchId: string) => Promise<void>;
    fetchActiveOrders: (partnerId: string) => Promise<void>;
    fetchHistoryOrders: (partnerId: string) => Promise<void>;


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




    selectedOrder: null,
    isModalVisible: false,

    // Fetch available orders
    fetchAvailableOrders: async (branchId: string) => {
        set({ isLoadingAvailable: true, availableError: null });
        try {
            const response = await partnerService.getAvailableOrders(branchId);
            set({ availableOrders: response.orders, isLoadingAvailable: false });
            // Sync badge with fresh count
            setAppBadgeCount(response.orders.length);
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
        // Add order to list
        const updatedOrders = [order, ...get().availableOrders];
        set({ availableOrders: updatedOrders });

        // Trigger push notification for new order
        const orderAmount = order.totalPrice || 0;
        notifyNewOrderAvailable(orderAmount, order._id);

        // Update app badge count
        setAppBadgeCount(updatedOrders.length);
    },

    removeAvailableOrder: (orderId: string) => {
        const updatedOrders = get().availableOrders.filter(o => o._id !== orderId);
        set({ availableOrders: updatedOrders });
        // Update app badge count
        setAppBadgeCount(updatedOrders.length);
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

            selectedOrder: null,
            isModalVisible: false,
        });
    },
}));
