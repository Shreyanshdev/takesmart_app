import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { SkeletonItem } from './SkeletonLoader';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');
const GRID_CARD_WIDTH = (width - 48) / 2;

interface ProductSkeletonProps {
    width?: number;
    style?: any;
}

export const ProductSkeleton: React.FC<ProductSkeletonProps> = ({ width: manualWidth, style }) => {
    const cardWidth = manualWidth || GRID_CARD_WIDTH;

    return (
        <View
            style={[
                styles.productCard,
                { width: cardWidth },
                style
            ]}
        >
            {/* Image Container Skeleton — matches ProductGridCard */}
            <View style={styles.imageContainer}>
                <SkeletonItem width="100%" height="100%" borderRadius={12} />

                {/* Bookmark placeholder (top-left like ProductGridCard) */}
                <View style={styles.bookmarkOverlay}>
                    <SkeletonItem width={28} height={28} borderRadius={14} />
                </View>

                {/* Variant badge placeholder (bottom-left like ProductGridCard) */}
                <View style={styles.variantOverlay}>
                    <SkeletonItem width={50} height={20} borderRadius={6} />
                </View>
            </View>

            {/* Info Section Skeleton — matches ProductGridCard layout */}
            <View style={styles.infoContainer}>
                {/* Product Name (2 lines) */}
                <SkeletonItem width="100%" height={14} borderRadius={4} style={{ marginBottom: 4 }} />
                <SkeletonItem width="65%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />

                {/* Rating Row */}
                <View style={styles.ratingRow}>
                    <SkeletonItem width={12} height={12} borderRadius={6} />
                    <SkeletonItem width={24} height={12} borderRadius={4} style={{ marginLeft: 4 }} />
                    <SkeletonItem width={20} height={10} borderRadius={4} style={{ marginLeft: 4 }} />
                </View>

                {/* Discount Row */}
                <View style={styles.discountRow}>
                    <SkeletonItem width={52} height={12} borderRadius={4} />
                    <View style={styles.dashedLine} />
                </View>

                {/* Footer: Price + ADD button */}
                <View style={styles.footerRow}>
                    <View style={styles.priceColumn}>
                        <SkeletonItem width={36} height={10} borderRadius={4} style={{ marginBottom: 4 }} />
                        <SkeletonItem width={50} height={16} borderRadius={4} />
                    </View>

                    {/* ADD Button skeleton */}
                    <SkeletonItem width={72} height={32} borderRadius={8} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    productCard: {
        marginBottom: 20,
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    bookmarkOverlay: {
        position: 'absolute',
        top: 8,
        left: 8,
        zIndex: 1,
    },
    variantOverlay: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        zIndex: 1,
    },
    infoContainer: {
        padding: 8,
        paddingBottom: 12,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    discountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    dashedLine: {
        flex: 1,
        height: 1,
        marginLeft: 8,
        backgroundColor: '#E2E8F0',
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    priceColumn: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
});
