import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../services/customer/product.service';

export interface CartItem {
    product: Product;
    quantity: number;
}

interface CartState {
    items: CartItem[];
    addToCart: (product: Product) => void;
    removeFromCart: (productId: string) => void;
    clearCart: () => void;
    getItemQuantity: (productId: string) => number;
    getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],

            addToCart: (product) => {
                const { items } = get();
                const existingItem = items.find(i => i.product._id === product._id);

                if (existingItem) {
                    set({
                        items: items.map(i =>
                            i.product._id === product._id
                                ? { ...i, quantity: i.quantity + 1 }
                                : i
                        ),
                    });
                } else {
                    set({ items: [...items, { product, quantity: 1 }] });
                }
            },

            removeFromCart: (productId) => {
                const { items } = get();
                const existingItem = items.find(i => i.product._id === productId);

                if (existingItem && existingItem.quantity > 1) {
                    set({
                        items: items.map(i =>
                            i.product._id === productId
                                ? { ...i, quantity: i.quantity - 1 }
                                : i
                        ),
                    });
                } else {
                    set({ items: items.filter(i => i.product._id !== productId) });
                }
            },

            clearCart: () => set({ items: [] }),

            getItemQuantity: (productId) => {
                const item = get().items.find(i => i.product._id === productId);
                return item ? item.quantity : 0;
            },

            getTotalPrice: () => {
                return get().items.reduce((total, item) => {
                    const price = item.product.discountPrice || item.product.price;
                    return total + price * item.quantity;
                }, 0);
            }
        }),
        {
            name: 'lush-cart-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
