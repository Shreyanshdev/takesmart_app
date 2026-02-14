import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../services/customer/product.service';

export interface CartItem {
    product: Product;
    quantity: number;
}

// Helper to get unique cart key (inventoryId for variants, _id for base products)
const getCartKey = (product: Product): string => {
    return product.inventoryId || product._id;
};

interface CartState {
    items: CartItem[];
    addToCart: (product: Product) => boolean; // Returns true if successful, false if failed
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    updateItemStock: (productId: string, newStock: number) => void; // Update cached stock for an item
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
                const cartKey = getCartKey(product);
                const existingItem = items.find(i => getCartKey(i.product) === cartKey);
                const availableStock = product.stock ?? 0;

                // Get limit from variant or product level
                const maxQtyLimit = product.variant?.maxQtyPerOrder || 0;

                if (existingItem) {
                    // Check stock limit
                    if (existingItem.quantity >= availableStock) {
                        return false; // Cannot add more than stock
                    }

                    // Check order quantity cap
                    if (maxQtyLimit > 0 && existingItem.quantity >= maxQtyLimit) {
                        return false; // Limit reached
                    }

                    set({
                        items: items.map(i =>
                            getCartKey(i.product) === cartKey
                                ? { ...i, quantity: i.quantity + 1 }
                                : i
                        ),
                    });
                    return true;
                } else {
                    // Check stock for new item
                    if (availableStock <= 0) {
                        return false; // Out of stock
                    }
                    set({ items: [...items, { product, quantity: 1 }] });
                    return true;
                }
            },

            removeFromCart: (productId) => {
                const { items } = get();
                const existingItem = items.find(i => getCartKey(i.product) === productId);

                if (existingItem && existingItem.quantity > 1) {
                    set({
                        items: items.map(i =>
                            getCartKey(i.product) === productId
                                ? { ...i, quantity: i.quantity - 1 }
                                : i
                        ),
                    });
                } else {
                    set({ items: items.filter(i => getCartKey(i.product) !== productId) });
                }
            },

            updateQuantity: (productId, quantity) => {
                const { items } = get();
                const item = items.find(i => getCartKey(i.product) === productId);
                if (!item) return;

                const availableStock = item.product.stock ?? 0;
                const maxQtyLimit = item.product.variant?.maxQtyPerOrder || 0;

                let finalQuantity = Math.max(0, quantity);

                // Cap by stock
                if (finalQuantity > availableStock) {
                    finalQuantity = availableStock;
                }

                // Cap by per-order limit
                if (maxQtyLimit > 0 && finalQuantity > maxQtyLimit) {
                    finalQuantity = maxQtyLimit;
                }

                set({
                    items: items.map(i =>
                        getCartKey(i.product) === productId
                            ? { ...i, quantity: finalQuantity }
                            : i
                    ),
                });
            },

            // Update the cached stock value for a cart item (used after backend validation)
            updateItemStock: (productId, newStock) => {
                const { items } = get();
                set({
                    items: items.map(i =>
                        getCartKey(i.product) === productId
                            ? { ...i, product: { ...i.product, stock: newStock } }
                            : i
                    ),
                });
            },

            deleteFromCart: (productId) => {
                const { items } = get();
                set({ items: items.filter(i => getCartKey(i.product) !== productId) });
            },

            clearCart: () => set({ items: [] }),

            getItemQuantity: (productId) => {
                const item = get().items.find(i => getCartKey(i.product) === productId);
                return item ? item.quantity : 0;
            },

            getTotalPrice: () => {
                return get().items.reduce((total, item) => {
                    // Only sum if quantity > 0
                    if (item.quantity <= 0) return total;

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
