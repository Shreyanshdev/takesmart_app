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
            {/* Image Container Skeleton */}
            <View style={styles.imageContainer}>
                <SkeletonItem width="100%" height="100%" borderRadius={12} />

                {/* Rating Badge Skeleton Overlay */}
                <View style={styles.ratingOverlay}>
                    <SkeletonItem width={40} height={16} borderRadius={6} />
                </View>
            </View>

            {/* Info Section Skeleton */}
            <View style={styles.infoContainer}>
                {/* Name Skeleton */}
                <SkeletonItem width="90%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                <SkeletonItem width="60%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />

                {/* Rating Row Skeleton */}
                <View style={styles.ratingRow}>
                    <SkeletonItem width={50} height={12} borderRadius={4} />
                </View>

                {/* Short Desc Skeleton */}
                <SkeletonItem width="80%" height={12} borderRadius={4} style={{ marginTop: 6 }} />

                {/* Price and Action Row */}
                <View style={styles.footerRow}>
                    <View style={styles.priceColumn}>
                        <SkeletonItem width={40} height={14} borderRadius={4} style={{ marginBottom: 4 }} />
                        <SkeletonItem width={60} height={18} borderRadius={4} />
                    </View>

                    {/* Button Skeleton */}
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
    ratingOverlay: {
        position: 'absolute',
        bottom: 8,
        right: 8,
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
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    priceColumn: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
});
