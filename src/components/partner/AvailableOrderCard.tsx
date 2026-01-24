import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { PartnerOrder } from '../../types/partner';

interface AvailableOrderCardProps {
    order: PartnerOrder;
    onPress: (order: PartnerOrder) => void;
}

export const AvailableOrderCard: React.FC<AvailableOrderCardProps> = ({ order, onPress }) => {
    const customerName = order.customer?.name || 'Customer';
    // Use itemCount from API, fallback to calculating from items if available (for safety)
    const itemCount = order.itemCount ?? (order.items?.reduce((sum, item) => sum + (item.quantity || item.count || 0), 0) || 0);
    const address = order.deliveryLocation.address;
    const truncatedAddress = address.length > 50 ? address.substring(0, 50) + '...' : address;

    // Format time ago
    const getTimeAgo = (dateString: string) => {
        const now = new Date();
        const orderDate = new Date(dateString);
        const diffMs = now.getTime() - orderDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        return `${diffHours}h ago`;
    };

    return (
        <View style={styles.cardWrapper}>
            <TouchableOpacity
                style={styles.container}
                onPress={() => onPress(order)}
                activeOpacity={0.8}
            >
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={20}
                    reducedTransparencyFallbackColor="white"
                />

                {/* Content Layer */}
                <View style={styles.content}>
                    {/* Header Row */}
                    <View style={styles.headerRow}>
                        <View style={styles.orderInfo}>
                            <View style={styles.orderIdBadgeNeoglass}>
                                <MonoText size="xs" weight="bold" color={colors.primary}>
                                    #{order.orderId}
                                </MonoText>
                            </View>
                            <View style={styles.timeBadge}>
                                <MonoText size="xxs" color={colors.textLight} weight="semiBold">
                                    {getTimeAgo(order.createdAt)}
                                </MonoText>
                            </View>
                        </View>
                        <View style={styles.paymentContainer}>
                            {order.paymentDetails?.paymentMethod === 'cod' ? (
                                <View style={styles.codBadge}>
                                    <MonoText size="xxs" weight="bold" color={colors.warning}>
                                        COD Collect ₹{order.totalPrice}
                                    </MonoText>
                                </View>
                            ) : (
                                <View style={styles.prepaidBadge}>
                                    <MonoText size="xxs" weight="bold" color={colors.success}>
                                        {order.paymentDetails?.paymentMethod === 'online' ? 'ONLINE PREPAID' : 'PREPAID'}
                                    </MonoText>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Customer & Items */}
                    <View style={styles.detailsRow}>
                        <View style={styles.customerIcon}>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <Circle cx="12" cy="7" r="4" />
                            </Svg>
                        </View>
                        <View style={styles.customerInfo}>
                            <MonoText size="m" weight="bold">
                                {customerName}
                            </MonoText>
                            <View style={styles.itemCountBadge}>
                                <MonoText size="xxs" color={colors.textLight} weight="bold">
                                    {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'}
                                </MonoText>
                            </View>
                        </View>

                        <View style={styles.typeBadge}>
                            <MonoText size="xxs" weight="bold" color={colors.success}>AVAILABLE</MonoText>
                        </View>
                    </View>

                    {/* Address Row */}
                    <View style={styles.addressRow}>
                        <View style={styles.locationIcon}>
                            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5">
                                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <Circle cx="12" cy="10" r="3" />
                            </Svg>
                        </View>
                        <MonoText size="s" color={colors.text} numberOfLines={2} style={styles.addressText}>
                            {truncatedAddress}
                        </MonoText>
                    </View>

                    {/* Action Hint */}
                    <View style={styles.footerRow}>
                        <View style={styles.actionHint}>
                            <MonoText size="xs" weight="bold" color={colors.primary}>
                                View Details
                            </MonoText>
                            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="3" style={{ marginLeft: 4 }}>
                                <Path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    cardWrapper: {
        marginBottom: spacing.m,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    container: {
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
    },
    content: {
        padding: 17,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 13,
    },
    paymentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    codBadge: {
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(234, 179, 8, 0.2)',
    },
    prepaidBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.2)',
    },
    orderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    orderIdBadgeNeoglass: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        backgroundColor: 'rgba(255, 71, 0, 0.05)',
    },
    timeBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 13,
    },
    customerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 71, 0, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    customerInfo: {
        flex: 1,
    },
    itemCountBadge: {
        marginTop: 2,
    },
    typeBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        padding: 10,
        borderRadius: 12,
        marginBottom: 12,
    },
    locationIcon: {
        marginRight: 10,
        marginTop: 2,
    },
    addressText: {
        flex: 1,
        lineHeight: 18,
    },
    footerRow: {
        alignItems: 'flex-end',
    },
    actionHint: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 71, 0, 0.08)',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 12,
    },
});
