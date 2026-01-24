import React, { useEffect } from 'react';
import { socketService } from '../../services/core/socket.service';
import { useAuthStore } from '../../store/authStore';
import {
    notifyOrderDelivered,
    notifyOrderPickedUp,
    notifyOrderAccepted,
    notifyOrderConfirmed
} from '../../services/notification/notification.service';
import { logger } from '../../utils/logger';

export const SocketListener: React.FC = () => {
    const { user, isAuthenticated } = useAuthStore();
    const customerId = user?._id;

    useEffect(() => {
        if (!isAuthenticated || !customerId || user?.role !== 'Customer') {
            return;
        }

        logger.log(`Connecting socket for customer: ${customerId}`);
        socketService.connect();
        socketService.joinCustomerRoom(customerId);
        logger.log(`Joined customer room: ${customerId}`);



        // Order lifecycle updates
        const handleOrderAccepted = (data: any) => {
            logger.log('Socket event: orderAccepted', data);
            if (data._id) {
                notifyOrderAccepted(data.deliveryPartner?.name || 'A partner', data._id);
            }
        };

        const handleOrderConfirmed = (data: any) => {
            logger.log('Socket event: orderConfirmed', data);
            if (data._id) {
                notifyOrderConfirmed(data._id);
            }
        };

        const handleOrderPickedUp = (data: any) => {
            logger.log('Socket event: orderPickedUp', data);
            if (data._id) {
                notifyOrderPickedUp(15, data._id);
            }
        };

        const handleOrderUpdated = (data: any) => {
            logger.log('Socket event: orderUpdated', data);
            // We handle 'awaitconfirmation' via specific event below
            // If we want a specific notification for final 'delivered' state (post-confirmation), we can add it here
            if (data.status === 'delivered' && data._id) {
                // Optional: Notify "Thank you for confirming" or just silent update
                // keeping silent to avoid double notification after user manually confirmed
            }
        };

        const handleAwaitingConfirmation = (data: any) => {
            logger.log('Socket event: awaitingCustomerConfirmation', data);
            if (data._id) {
                notifyOrderDelivered(data._id);
            }
        };

        socketService.on('orderAccepted', handleOrderAccepted);
        socketService.on('orderConfirmed', handleOrderConfirmed);
        socketService.on('orderPickedUp', handleOrderPickedUp);
        socketService.on('orderUpdated', handleOrderUpdated);
        socketService.on('awaitingCustomerConfirmation', handleAwaitingConfirmation);

        return () => {
            socketService.off('orderAccepted', handleOrderAccepted);
            socketService.off('orderConfirmed', handleOrderConfirmed);
            socketService.off('orderPickedUp', handleOrderPickedUp);
            socketService.off('orderUpdated', handleOrderUpdated);
            socketService.off('awaitingCustomerConfirmation', handleAwaitingConfirmation);
        };
    }, [isAuthenticated, customerId, user?.role]);

    return null;
};
