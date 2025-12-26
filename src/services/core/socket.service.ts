import { io, Socket } from 'socket.io-client';
import { ENV } from '../../utils/env';
import { logger } from '../../utils/logger';

class SocketService {
    private socket: Socket | null = null;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 10;

    // Event callbacks storage
    private eventCallbacks: Map<string, Set<Function>> = new Map();

    connect(): Socket {
        if (this.socket?.connected) {
            return this.socket;
        }

        this.socket = io(ENV.API_URL.replace('/api', ''), {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        this.socket.on('connect', () => {
            logger.socket('connected', this.socket?.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
        });

        this.socket.on('disconnect', (reason) => {
            logger.socket('disconnected', reason);
            this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
            logger.socket('connection error', error.message);
            this.reconnectAttempts++;
        });

        return this.socket;
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.eventCallbacks.clear();
        }
    }

    getSocket(): Socket | null {
        return this.socket;
    }

    isSocketConnected(): boolean {
        return this.isConnected && this.socket?.connected === true;
    }

    // Room management
    joinRoom(roomId: string): void {
        if (this.socket?.connected) {
            this.socket.emit('joinRoom', roomId);
            logger.socket('joinRoom', roomId);
        }
    }

    leaveRoom(roomId: string): void {
        if (this.socket?.connected) {
            this.socket.emit('leaveRoom', roomId);
            logger.socket('leaveRoom', roomId);
        }
    }

    joinBranchRoom(branchId: string): void {
        if (this.socket?.connected) {
            this.socket.emit('joinBranchRoom', branchId);
            logger.socket('joinBranchRoom', `branch-${branchId}`);
        }
    }

    joinDeliveryPartnerRoom(partnerId: string): void {
        if (this.socket?.connected) {
            this.socket.emit('joinDeliveryPartnerRoom', partnerId);
            logger.socket('joinDeliveryPartnerRoom', `deliveryPartner-${partnerId}`);
        }
    }

    joinCustomerRoom(customerId: string): void {
        if (this.socket?.connected) {
            this.socket.emit('joinCustomerRoom', customerId);
            logger.socket('joinCustomerRoom', `customer-${customerId}`);
        }
    }

    joinSubscriptionRoom(subscriptionId: string): void {
        if (this.socket?.connected) {
            this.socket.emit('joinSubscriptionRoom', subscriptionId);
            logger.socket('joinSubscriptionRoom', `subscription-${subscriptionId}`);
        }
    }

    // Event management with callback tracking
    on(event: string, callback: Function): void {
        if (this.socket) {
            // Track callback for cleanup
            if (!this.eventCallbacks.has(event)) {
                this.eventCallbacks.set(event, new Set());
            }
            this.eventCallbacks.get(event)?.add(callback);

            this.socket.on(event, callback as any);
        }
    }

    off(event: string, callback?: Function): void {
        if (this.socket) {
            if (callback) {
                this.socket.off(event, callback as any);
                this.eventCallbacks.get(event)?.delete(callback);
            } else {
                this.socket.off(event);
                this.eventCallbacks.delete(event);
            }
        }
    }

    emit(event: string, data?: any): void {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        } else {
            logger.warn(`Cannot emit "${event}" - socket not connected`);
        }
    }

    // Cleanup all event listeners
    removeAllListeners(): void {
        if (this.socket) {
            this.eventCallbacks.forEach((callbacks, event) => {
                callbacks.forEach((callback) => {
                    this.socket?.off(event, callback as any);
                });
            });
            this.eventCallbacks.clear();
        }
    }
}

// Singleton instance
export const socketService = new SocketService();
