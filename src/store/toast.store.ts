import { create } from 'zustand';

export type ToastType = 'success' | 'warning' | 'info';

interface ToastState {
    visible: boolean;
    message: string;
    type: ToastType;
    showToast: (message: string, type?: ToastType) => void;
    hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
    visible: false,
    message: '',
    type: 'info',
    showToast: (message: string, type: ToastType = 'info') => {
        // Auto-detect type from message if not provided
        let detectedType: ToastType = type;
        if (type === 'info') {
            const lowerMessage = message.toLowerCase();
            if (lowerMessage.includes('wishlist') || lowerMessage.includes('added') || lowerMessage.includes('removed')) {
                detectedType = 'success';
            } else if (lowerMessage.includes('stock') || lowerMessage.includes('limit') || lowerMessage.includes('out of')) {
                detectedType = 'warning';
            }
        }
        set({ visible: true, message, type: detectedType });
    },
    hideToast: () => {
        set({ visible: false });
    }
}));
