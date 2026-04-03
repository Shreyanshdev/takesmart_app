import React from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { SkeletonItem } from '../shared/SkeletonLoader';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import { ProductSkeleton } from '../shared/ProductSkeleton';

const { width } = Dimensions.get('window');

// Match CategoryGrid.tsx constants
const NUM_COLUMNS = 4;
const GRID_PADDING = spacing.m;
const GRID_GAP = 10;
const ITEM_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

/**
 * Skeleton for the Main Banner/Promo Carousel
 */
export const BannerSkeleton = ({ height = 180, variant = 'full' }: { height?: number; variant?: 'full' | 'grid' }) => {
    return (
        <View style={[styles.bannerContainer, { height, paddingHorizontal: variant === 'full' ? 0 : spacing.m, marginBottom: spacing.l }]}>
            <SkeletonItem width="100%" height="100%" borderRadius={16} />
        </View>
    );
};

/**
 * Skeleton for a single category circle item
 */
export const CategoryItemSkeleton = () => {
    return (
        <View style={styles.categoryItem}>
            <SkeletonItem width={60} height={60} borderRadius={30} style={{ marginBottom: 8 }} />
            <SkeletonItem width={50} height={12} borderRadius={4} />
        </View>
    );
};

/**
 * Skeleton for the Category Grid
 */
export const CategoryGridSkeleton = () => {
    return (
        <View style={styles.categoryContainer}>
            <View style={styles.categoryHeader}>
                <SkeletonItem width={150} height={18} borderRadius={4} />
            </View>
            <View style={styles.categoryGrid}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <View key={i} style={styles.categoryItem}>
                        <SkeletonItem width={ITEM_WIDTH} height={ITEM_WIDTH} borderRadius={20} style={{ marginBottom: 8 }} />
                        <SkeletonItem width={ITEM_WIDTH - 10} height={12} borderRadius={4} />
                    </View>
                ))}
            </View>
        </View>
    );
};

/**
 * Skeleton for the horizontal Product Strip
 */
export const ProductStripSkeleton = ({ title = 'Loading...' }: { title?: string }) => {
    return (
        <View style={styles.stripContainer}>
            <View style={styles.stripHeader}>
                <SkeletonItem width={180} height={18} borderRadius={4} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripScroll}>
                {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={styles.stripCard}>
                        {/* Image Wrapper Skeleton */}
                        <View style={styles.stripImageWrapper}>
                            <SkeletonItem width="100%" height="100%" borderRadius={12} />
                            {/* Qty/Add Button Placeholder */}
                            <View style={styles.stripAddBtnPlaceholder}>
                                <SkeletonItem width={50} height={28} borderRadius={14} />
                            </View>
                        </View>
                        {/* Info Section Skeleton */}
                        <View style={styles.stripInfo}>
                            <SkeletonItem width="100%" height={14} borderRadius={4} style={{ marginBottom: 4 }} />
                            <SkeletonItem width="70%" height={14} borderRadius={4} style={{ marginBottom: 8 }} />
                            <SkeletonItem width="40%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
                            <SkeletonItem width="60%" height={16} borderRadius={4} />
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    bannerContainer: {
        width: '100%',
    },
    categoryContainer: {
        marginBottom: spacing.l,
    },
    categoryHeader: {
        marginBottom: spacing.m,
        paddingHorizontal: spacing.m,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: GRID_PADDING,
        columnGap: GRID_GAP,
        rowGap: GRID_GAP + 12,
    },
    categoryItem: {
        width: ITEM_WIDTH,
        alignItems: 'center',
    },
    sidebarItem: {
        width: 90,
        alignItems: 'center',
        paddingVertical: spacing.m,
        gap: 6,
    },
    stripContainer: {
        marginBottom: spacing.l,
    },
    stripHeader: {
        marginBottom: spacing.m,
        paddingHorizontal: spacing.m,
    },
    stripScroll: {
        paddingHorizontal: spacing.m,
        gap: 12,
    },
    stripCard: {
        width: 135, // STRIP_CARD_WIDTH
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    stripImageWrapper: {
        width: '100%',
        height: 125,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        position: 'relative',
    },
    stripAddBtnPlaceholder: {
        position: 'absolute',
        top: -6,
        right: -6,
        zIndex: 10,
    },
    stripInfo: {
        paddingTop: 20,
        paddingHorizontal: 4,
    }
});

/**
 * Full Home Screen Skeleton Loader
 * Combines Banner, Category Grid, and multiple Product Strips
 */
export const HomeFullSkeleton = () => {
    return (
        <View style={{ flex: 1, backgroundColor: colors.white }}>
            <BannerSkeleton height={180} variant="full" />
            <CategoryGridSkeleton />
            <ProductStripSkeleton title="Featured items" />
            <ProductStripSkeleton title="New arrivals" />
            <ProductStripSkeleton title="Recently viewed" />
        </View>
    );
};

/**
 * Skeleton for the Subcategory Card (4-column grid)
 */
const SubcategoryCardSkeleton = () => {
    const subWidth = (width - 32 - (4 - 1) * 12) / 4; // Matching CategoriesScreen.tsx CARD_SIZE
    return (
        <View style={{ width: subWidth, marginHorizontal: 6, marginBottom: 16, alignItems: 'center' }}>
            <SkeletonItem width={subWidth - 8} height={subWidth - 8} borderRadius={12} style={{ marginBottom: 6 }} />
            <SkeletonItem width={subWidth - 16} height={12} borderRadius={4} />
            <SkeletonItem width={(subWidth - 16) * 0.7} height={12} borderRadius={4} style={{ marginTop: 2 }} />
        </View>
    );
};

/**
 * Full Categories Screen Skeleton
 */
export const CategoriesFullSkeleton = () => {
    const tabW = 72;
    const gridPad = 20;
    const gridGap = 12;
    const cols = 3;
    const cardW = (width - gridPad * 2 - gridGap * (cols - 1)) / cols;

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFBFC' }}>
            {/* Tab bar skeleton */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gridPad, gap: 8, paddingVertical: 10 }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <View key={i} style={{ alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8 }}>
                        <SkeletonItem width={42} height={42} borderRadius={14} style={{ marginBottom: 6 }} />
                        <SkeletonItem width={48} height={10} borderRadius={4} />
                    </View>
                ))}
            </ScrollView>
            {/* Section header */}
            <View style={{ paddingHorizontal: gridPad, marginTop: 12, marginBottom: 20, flexDirection: 'row', alignItems: 'center' }}>
                <SkeletonItem width={4} height={32} borderRadius={2} style={{ marginRight: 12 }} />
                <View>
                    <SkeletonItem width={120} height={18} borderRadius={4} style={{ marginBottom: 6 }} />
                    <SkeletonItem width={60} height={10} borderRadius={4} />
                </View>
            </View>
            {/* Staggered grid */}
            <View style={{ paddingHorizontal: gridPad, flexDirection: 'row', flexWrap: 'wrap', gap: gridGap }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonItem
                        key={i}
                        width={cardW}
                        height={i % 3 === 0 ? cardW * 1.45 : cardW * 1.15}
                        borderRadius={18}
                    />
                ))}
            </View>
        </View>
    );
};

/**
 * Full Browse Products Screen Skeleton
 */
export const BrowseFullSkeleton = () => {
    const browseCardWidth = (width - 36) / 2; // Matching BrowseProductsScreen.tsx CARD_WIDTH
    return (
        <View style={{ flex: 1, backgroundColor: colors.white, paddingHorizontal: 6 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <View key={i} style={{ width: '50%', paddingHorizontal: 6 }}>
                        <ProductSkeleton width={browseCardWidth} />
                    </View>
                ))}
            </View>
        </View>
    );
};

/**
 * Skeleton for the Left Sidebar in CategoriesScreen
 */
export const SidebarSkeleton = () => {
    return (
        <View style={{ width: 90, backgroundColor: '#F5F5F5', borderRightWidth: 1, borderRightColor: '#E0E0E0' }}>
            <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={false} contentContainerStyle={{ paddingTop: 100 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <View key={i} style={styles.sidebarItem}>
                        <SkeletonItem width={40} height={40} borderRadius={20} />
                        <SkeletonItem width={50} height={10} borderRadius={2} />
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

/**
 * Skeleton for the StripProductCard used in ProductDetailsModal side scrolls
 */
export const StripCardSkeleton = ({ width: cardWidth = 135 }: { width?: number }) => {
    return (
        <View style={[styles.stripCard, { width: cardWidth }]}>
            {/* Image Wrapper Skeleton */}
            <View style={styles.stripImageWrapper}>
                <SkeletonItem width="100%" height="100%" borderRadius={12} />
                {/* Add Button Placement Skeleton (Top Right) */}
                <View style={styles.stripAddBtnPlaceholder}>
                    <SkeletonItem width={54} height={28} borderRadius={14} />
                </View>
                {/* Variant Pill Skeleton (Floating at bottom center) */}
                <View style={{ position: 'absolute', bottom: -8, width: '100%', alignItems: 'center', zIndex: 10 }}>
                    <SkeletonItem width={70} height={24} borderRadius={12} />
                </View>
            </View>
            {/* Info Section Skeleton */}
            <View style={[styles.stripInfo, { paddingTop: 20 }]}>
                {/* Rating Row placeholder */}
                <SkeletonItem width={50} height={12} borderRadius={4} style={{ marginBottom: 6 }} />
                {/* Name placeholder (Fixed 2 lines height like in the card) */}
                <SkeletonItem width="100%" height={14} borderRadius={4} style={{ marginBottom: 4 }} />
                <SkeletonItem width="70%" height={14} borderRadius={4} style={{ marginBottom: 10 }} />
                {/* Discount Percentage block */}
                <SkeletonItem width={60} height={12} borderRadius={4} style={{ marginBottom: 6 }} />
                {/* Price placeholder */}
                <SkeletonItem width={50} height={18} borderRadius={4} />
            </View>
        </View>
    );
};
