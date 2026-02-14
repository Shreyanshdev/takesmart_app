import React from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { SkeletonItem } from '../shared/SkeletonLoader';
import { spacing } from '../../theme/spacing';

const { width } = Dimensions.get('window');

/**
 * Skeleton for the promo banners (Home Main/Secondary)
 */
export const BannerSkeleton = ({ height = 220, variant = 'full' }: { height?: number, variant?: 'full' | 'card' }) => {
    const bannerWidth = variant === 'card' ? width - 32 : width;
    const paddingHorizontal = variant === 'card' ? 16 : 0;

    return (
        <View style={[styles.bannerContainer, { paddingHorizontal, marginBottom: 16 }]}>
            <SkeletonItem
                width={bannerWidth}
                height={height}
                borderRadius={variant === 'card' ? 16 : 0}
            />
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
 * Skeleton for the entire Category Grid section
 */
export const CategoryGridSkeleton = () => {
    return (
        <View style={styles.categoryContainer}>
            {/* Header Title Skeleton */}
            <View style={styles.categoryHeader}>
                <SkeletonItem width={150} height={16} borderRadius={4} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <CategoryItemSkeleton key={i} />
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
        alignItems: 'center',
    },
    categoryScroll: {
        paddingHorizontal: spacing.m,
        gap: spacing.m,
    },
    categoryItem: {
        width: 80,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sidebarItem: {
        width: 90,
        alignItems: 'center',
        paddingVertical: spacing.m,
        gap: 6,
    }
});

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
