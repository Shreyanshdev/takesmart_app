import notifee, { AndroidImportance, AndroidVisibility, AuthorizationStatus } from '@notifee/react-native';
import { Platform } from 'react-native';
import { logger } from '../../utils/logger';

// Notification Channel IDs
export const NOTIFICATION_CHANNELS = {
    ORDERS: 'orders-channel',
    DELIVERY: 'delivery-channel',
} as const;

// Configure Push Notifications
export const configurePushNotifications = async (onNotificationOpen?: (data: any) => void) => {
    try {
        // Request permission
        const settings = await notifee.requestPermission();

        if (settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED) {
            logger.log('Notification permission granted');
        } else {
            logger.warn('Notification permission denied');
        }

        // Create Android notification channels
        if (Platform.OS === 'android') {
            await createNotificationChannels();
        }

        // Set up foreground event handler
        notifee.onForegroundEvent(({ type, detail }) => {
            logger.log('Foreground notification event:', type, detail);
            if (onNotificationOpen && detail.notification?.data) {
                onNotificationOpen(detail.notification.data);
            }
        });

        // Set up background event handler
        notifee.onBackgroundEvent(async ({ type, detail }) => {
            logger.log('Background notification event:', type, detail);
            if (onNotificationOpen && detail.notification?.data) {
                onNotificationOpen(detail.notification.data);
            }
        });

    } catch (error) {
        logger.error('Error configuring notifications:', error);
    }
};

// Create notification channels for Android
const createNotificationChannels = async () => {
    try {
        // Orders Channel - for new available orders (partner)
        await notifee.createChannel({
            id: NOTIFICATION_CHANNELS.ORDERS,
            name: 'New Orders',
            description: 'Notifications for new available orders',
            sound: 'default',
            importance: AndroidImportance.HIGH,
            vibration: true,
            visibility: AndroidVisibility.PUBLIC,
        });
        logger.log('Orders channel created');

        // Delivery Channel - for order updates (customer)
        await notifee.createChannel({
            id: NOTIFICATION_CHANNELS.DELIVERY,
            name: 'Delivery Updates',
            description: 'Notifications for order delivery updates',
            sound: 'default',
            importance: AndroidImportance.HIGH,
            vibration: true,
            visibility: AndroidVisibility.PUBLIC,
        });
        logger.log('Delivery channel created');
    } catch (error) {
        logger.error('Error creating notification channels:', error);
    }
};

// Helper function to display notification
const displayNotification = async (
    channelId: string,
    title: string,
    body: string,
    data?: Record<string, string>
) => {
    try {
        await notifee.displayNotification({
            title,
            body,
            data,
            android: {
                channelId,
                smallIcon: 'ic_notification', // Make sure this icon exists in android/app/src/main/res
                pressAction: {
                    id: 'default',
                },
                importance: AndroidImportance.HIGH,
            },
            ios: {
                sound: 'default',
            },
        });
        logger.log(`Notification displayed: ${title}`);
    } catch (error) {
        logger.error('Error displaying notification:', error);
    }
};

// ==========================================
// PARTNER NOTIFICATIONS
// ==========================================

export const notifyNewOrderAvailable = (orderAmount: number, orderId: string) => {
    logger.log(`Triggering notifyNewOrderAvailable for order ${orderId} with amount ${orderAmount}`);
    displayNotification(
        NOTIFICATION_CHANNELS.ORDERS,
        '🔔 New Order Available!',
        `₹${orderAmount} order ready for pickup. Tap to accept.`,
        { type: 'new_order', orderId }
    );
};

// ==========================================
// CUSTOMER NOTIFICATIONS
// ==========================================

export const notifyOrderPlaced = (orderId: string) => {
    logger.log(`Triggering notifyOrderPlaced for order ${orderId}`);
    displayNotification(
        NOTIFICATION_CHANNELS.DELIVERY,
        '🎉 Order Placed Successfully!',
        'We have received your order and it is being processed.',
        { type: 'order_placed', orderId }
    );
};

export const notifyOrderConfirmed = (orderId: string) => {
    logger.log(`Triggering notifyOrderConfirmed for order ${orderId}`);
    displayNotification(
        NOTIFICATION_CHANNELS.DELIVERY,
        '✅ Order Confirmed!',
        'Your order has been confirmed and is being prepared.',
        { type: 'order_confirmed', orderId }
    );
};

export const notifyOrderAccepted = (partnerName: string, orderId: string) => {
    logger.log(`Triggering notifyOrderAccepted for order ${orderId} by ${partnerName}`);
    displayNotification(
        NOTIFICATION_CHANNELS.DELIVERY,
        '🛵 Partner Assigned!',
        `${partnerName} has accepted your order and is on the way to pick it up.`,
        { type: 'order_accepted', orderId }
    );
};

export const notifyOrderPickedUp = (eta: number, orderId: string) => {
    logger.log(`Triggering notifyOrderPickedUp for order ${orderId} with ETA ${eta}`);
    displayNotification(
        NOTIFICATION_CHANNELS.DELIVERY,
        '🚗 Order On The Way!',
        `Your order is reaching you in ~${eta} mins`,
        { type: 'order_picked_up', orderId }
    );
};

export const notifyOrderDelivered = (orderId: string) => {
    logger.log(`Triggering notifyOrderDelivered for order ${orderId}`);
    displayNotification(
        NOTIFICATION_CHANNELS.DELIVERY,
        '📦 Order Delivered!',
        'Please confirm you received your order',
        { type: 'order_delivered', orderId }
    );
};

// Clear all notifications
export const clearAllNotifications = async () => {
    try {
        await notifee.cancelAllNotifications();
        logger.log('All notifications cleared');
    } catch (error) {
        logger.error('Error clearing notifications:', error);
    }
};

// Set app badge count (for available orders)
export const setAppBadgeCount = async (count: number) => {
    try {
        await notifee.setBadgeCount(count);
        logger.log(`Badge count set to ${count}`);
    } catch (error) {
        logger.error('Error setting badge count:', error);
    }
};
