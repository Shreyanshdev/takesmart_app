import { create } from 'zustand';
import { Product } from '../services/customer/product.service';

export type DeliveryFrequency = 'daily' | 'alternate' | 'weekly' | 'monthly';

export interface SubscriptionItem {
    product: Product;
    quantity: number;
    frequency: DeliveryFrequency;
    startDate: Date;
}

interface SubscriptionCartState {
    items: SubscriptionItem[];
    addToCart: (item: SubscriptionItem) => void;
    removeFromCart: (productId: string) => void;
    clearCart: () => void;
}

export const useSubscriptionCartStore = create<SubscriptionCartState>((set) => ({
    items: [],
    addToCart: (item) => set((state) => {
        // Check if item already exists, if so update it? Or just append? 
        // For simplicity, appending or replacing if same product
        const existingIndex = state.items.findIndex(i => i.product._id === item.product._id);
        if (existingIndex >= 0) {
            const newItems = [...state.items];
            newItems[existingIndex] = item;
            return { items: newItems };
        }
        return { items: [...state.items, item] };
    }),
    removeFromCart: (productId) => set((state) => ({
        items: state.items.filter(i => i.product._id !== productId)
    })),
    clearCart: () => set({ items: [] })
}));
