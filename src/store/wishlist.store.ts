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
                const itemId = product.inventoryId || product._id;
                if (!get().isInWishlist(itemId)) {
                    set((state) => ({ wishlist: [product, ...state.wishlist] }));
                }
            },
            removeFromWishlist: (itemId) => {
                set((state) => ({
                    wishlist: state.wishlist.filter((item) => {
                        const invId = item.inventoryId || item._id;
                        return item._id !== itemId && invId !== itemId;
                    }),
                }));
            },
            toggleWishlist: async (product, inventoryId) => {
                // Optimistic UI update
                const itemId = inventoryId || product.inventoryId || product._id;
                const isFavorite = get().isInWishlist(itemId);

                if (isFavorite) {
                    get().removeFromWishlist(itemId);
                } else {
                    get().addToWishlist(product);
                }

                try {
                    await wishlistService.toggleWishlist(product._id, inventoryId);
                } catch (error) {
                    console.error('Failed to toggle wishlist on backend:', error);
                    // Revert on failure
                    if (isFavorite) {
                        get().addToWishlist(product);
                    } else {
                        get().removeFromWishlist(itemId);
                    }
                }
            },
            isInWishlist: (itemId) => {
                return get().wishlist.some((item) => {
                    const invId = item.inventoryId || item._id;
                    return item._id === itemId || invId === itemId;
                });
            },
            syncWishlist: async (branchId?: string) => {
                try {
                    const remoteWishlist = await wishlistService.getWishlist(branchId);

                    // Deduplicate remote wishlist items
                    const seenIds = new Set<string>();
                    const uniqueWishlist = (remoteWishlist || []).filter((item: any) => {
                        const id = item.inventoryId || item._id;
                        if (seenIds.has(id)) return false;
                        seenIds.add(id);
                        return true;
                    });

                    set({ wishlist: uniqueWishlist });
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
