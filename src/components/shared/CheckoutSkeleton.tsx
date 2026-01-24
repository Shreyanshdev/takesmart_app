import React from 'react';
import { View, StyleSheet, ScrollView, Platform, Dimensions, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import Svg, { Path, Circle } from 'react-native-svg';
import { SkeletonItem } from './SkeletonLoader';
import { ProductSkeleton } from './ProductSkeleton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from './MonoText';

const { width } = Dimensions.get('window');

export const CheckoutSkeleton = () => {
    return (
        <View style={styles.container}>
            {/* Header Skeleton */}
            <View style={styles.header}>
                <SkeletonItem width={40} height={40} borderRadius={20} style={{ marginRight: 16 }} />
                <SkeletonItem width={120} height={24} borderRadius={4} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* 1. Order Items Section */}
                <View style={styles.section}>
                    <SkeletonItem width={120} height={20} borderRadius={4} style={{ marginBottom: 16 }} />
                    {[1, 2, 3].map((i) => (
                        <View key={i} style={styles.itemRow}>
                            <SkeletonItem width={48} height={48} borderRadius={8} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <SkeletonItem width="70%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
                                <SkeletonItem width="40%" height={12} borderRadius={4} />
                            </View>
                            <SkeletonItem width={72} height={32} borderRadius={8} />
                        </View>
                    ))}
                </View>

                {/* 2. Before you checkout Suggestions */}
                <View style={[styles.section, { paddingHorizontal: 0 }]}>
                    <View style={{ paddingHorizontal: spacing.l }}>
                        <SkeletonItem width={180} height={20} borderRadius={4} style={{ marginBottom: 4 }} />
                        <SkeletonItem width={220} height={12} borderRadius={4} style={{ marginBottom: 16 }} />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.l }}>
                        {[1, 2, 3].map((i) => (
                            <View key={i} style={{ marginRight: 14 }}>
                                <ProductSkeleton width={160} />
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* 3. Coupon Section */}
                <View style={[styles.section, styles.couponBar]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <SkeletonItem width={36} height={36} borderRadius={10} />
                        <View style={{ marginLeft: 12 }}>
                            <SkeletonItem width={100} height={16} borderRadius={4} style={{ marginBottom: 4 }} />
                            <SkeletonItem width={140} height={12} borderRadius={4} />
                        </View>
                    </View>
                    <SkeletonItem width={60} height={20} borderRadius={6} />
                </View>

                {/* 4. Bill Details */}
                <View style={styles.section}>
                    <SkeletonItem width={120} height={20} borderRadius={4} style={{ marginBottom: 16 }} />
                    {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={styles.billRow}>
                            <SkeletonItem width={130} height={14} borderRadius={4} />
                            <SkeletonItem width={60} height={14} borderRadius={4} />
                        </View>
                    ))}
                    <View style={styles.divider} />
                    <View style={styles.billRow}>
                        <SkeletonItem width={100} height={24} borderRadius={4} />
                        <SkeletonItem width={80} height={24} borderRadius={4} />
                    </View>
                </View>

                <View style={{ height: 160 }} />
            </ScrollView>

            {/* Sticky Footer Skeleton */}
            <View style={styles.footer}>
                <View style={styles.stickyDeliveryContainer}>
                    <SkeletonItem width={36} height={36} borderRadius={18} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <SkeletonItem width="60%" height={14} borderRadius={4} style={{ marginBottom: 4 }} />
                        <SkeletonItem width="80%" height={12} borderRadius={4} />
                    </View>
                    <SkeletonItem width={50} height={16} borderRadius={4} />
                </View>

                <View style={styles.footerDivider} />

                <View style={styles.footerRow}>
                    <View style={{ flex: 0.8 }}>
                        <SkeletonItem width={40} height={10} borderRadius={4} style={{ marginBottom: 4 }} />
                        <SkeletonItem width="80%" height={16} borderRadius={4} />
                    </View>
                    <SkeletonItem width="60%" height={52} borderRadius={26} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.l,
        paddingTop: Platform.OS === 'android' ? 40 : 60,
        paddingBottom: 20,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230, 230, 230, 0.5)',
    },
    content: {
        paddingTop: 20,
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: spacing.l,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    couponBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginHorizontal: spacing.l,
    },
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 12,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: spacing.l,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 28,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    stickyDeliveryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    footerDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginBottom: 12,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
});
