import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../services/customer/product.service';
import { wishlistService } from '../services/customer/wishlist.service';

interface WishlistState {
    wishlist: Product[];
    addToWishlist: (product: Product) => void;
    removeFromWishlist: (itemId: string) => void;
    toggleWishlist: (product: Product, inventoryId?: string) => void;
    isInWishlist: (itemId: string) => boolean;
    syncWishlist: (branchId?: string) => Promise<void>;
    clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
    persist(
        (set, get) => ({
            wishlist: [],
            addToWishlist: (product) => {
                const itemId = product.variants?.[0]?.inventoryId || product._id;
                if (!get().isInWishlist(itemId)) {
                    set((state) => ({ wishlist: [product, ...state.wishlist] }));
                }
            },
            removeFromWishlist: (itemId) => {
                set((state) => ({
                    wishlist: state.wishlist.filter((item) => {
                        const variantId = item.variants?.[0]?.inventoryId || item.variants?.[0]?._id;
                        return item._id !== itemId && variantId !== itemId;
                    }),
                }));
            },
            toggleWishlist: async (product, inventoryId) => {
                // Optimistic UI update
                const itemId = inventoryId || product.variants?.[0]?.inventoryId || product._id;
                const isFavorite = get().isInWishlist(itemId);

                if (isFavorite) {
                    get().removeFromWishlist(itemId);
                } else {
                    // Ensure the product being added has ONLY the target variant if inventoryId is provided
                    let productToAdd = product;
                    if (inventoryId && product.variants) {
                        const targetVariant = product.variants.find(v => (v._id || v.inventoryId) === inventoryId);
                        if (targetVariant) {
                            productToAdd = { ...product, variants: [targetVariant] };
                        }
                    }
                    get().addToWishlist(productToAdd);
                }

                try {
                    await wishlistService.toggleWishlist(product._id, inventoryId);
                } catch (error) {
                    console.error('Failed to toggle wishlist on backend:', error);
                    // Revert on failure
                    if (isFavorite) {
                        let productToRestore = product;
                        if (inventoryId && product.variants) {
                            const targetVariant = product.variants.find(v => (v._id || v.inventoryId) === inventoryId);
                            if (targetVariant) {
                                productToRestore = { ...product, variants: [targetVariant] };
                            }
                        }
                        get().addToWishlist(productToRestore);
                    } else {
                        get().removeFromWishlist(itemId);
                    }
                }
            },
            isInWishlist: (itemId) => {
                return get().wishlist.some((item) => {
                    const variantId = item.variants?.[0]?.inventoryId || item.variants?.[0]?._id;
                    return item._id === itemId || variantId === itemId;
                });
            },
            syncWishlist: async (branchId?: string) => {
                try {
                    const remoteWishlist = await wishlistService.getWishlist(branchId);
                    set({ wishlist: remoteWishlist });
                } catch (error) {
                    console.error('Failed to sync wishlist:', error);
                }
            },
            clearWishlist: () => set({ wishlist: [] }),
        }),
        {
            name: 'wishlist-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
