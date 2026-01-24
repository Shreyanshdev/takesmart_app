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
    addToCart: (product: Product) => boolean; // Returns true if successful, false if failed
    removeFromCart: (productId: string) => void;
    deleteFromCart: (productId: string) => void;
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
                    // Check stock limit
                    if (existingItem.quantity >= (product.stock || 999)) {
                        return false; // Cannot add more than stock
                    }
                    set({
                        items: items.map(i =>
                            i.product._id === product._id
                                ? { ...i, quantity: i.quantity + 1 }
                                : i
                        ),
                    });
                    return true;
                } else {
                    // Check stock for new item
                    if ((product.stock || 0) <= 0) {
                        return false; // Out of stock
                    }
                    set({ items: [...items, { product, quantity: 1 }] });
                    return true;
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

            deleteFromCart: (productId) => {
                const { items } = get();
                set({ items: items.filter(i => i.product._id !== productId) });
            },

            clearCart: () => set({ items: [] }),

            getItemQuantity: (productId) => {
                const item = get().items.find(i => i.product._id === productId);
                return item ? item.quantity : 0;
            },

            getTotalPrice: () => {
                return get().items.reduce((total, item) => {
                    // Use the exact price stored in the cart item (set when adding to cart)
                    // discountPrice is the selling price, price is MRP
                    const price = item.product.discountPrice ?? item.product.price ?? 0;
                    const qty = item.quantity || 0;
                    const itemTotal = (Number(price) || 0) * (Number(qty) || 0);
                    return total + itemTotal;
                }, 0);
            }
        }),
        {
            name: 'lush-cart-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
