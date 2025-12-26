import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { PartnerOrder } from '../../types/partner';

interface ActiveOrderCardProps {
    order: PartnerOrder;
    onPickup: (order: PartnerOrder) => void;
    onDelivered: (order: PartnerOrder) => void;
    onViewDetails: (order: PartnerOrder) => void;
    isLoading?: boolean;
}

export const ActiveOrderCard: React.FC<ActiveOrderCardProps> = ({
    order,
    onPickup,
    onDelivered,
    onViewDetails,
    isLoading = false,
}) => {
    const customerName = order.customer?.name || 'Customer';
    const customerPhone = order.customer?.phone || '';
    const deliveryAddress = order.deliveryLocation.address;
    const itemCount = order.items.reduce((sum, item) => sum + item.count, 0);

    // Status config
    const getStatusConfig = () => {
        switch (order.status) {
            case 'accepted':
                return {
                    label: 'Accepted',
                    color: colors.primary,
                    bgColor: `${colors.primary}20`,
                    action: 'Pick Up Order',
                    actionColor: colors.primary,
                    icon: 'pickup',
                };
            case 'in-progress':
                return {
                    label: 'On The Way',
                    color: colors.accent,
                    bgColor: `${colors.accent}20`,
                    action: 'Mark Delivered',
                    actionColor: colors.accent,
                    icon: 'delivered',
                };
            case 'awaitconfirmation':
                return {
                    label: 'Awaiting Confirmation',
                    color: colors.warning,
                    bgColor: `${colors.warning}20`,
                    action: null,
                    actionColor: colors.warning,
                    icon: 'waiting',
                };
            default:
                return {
                    label: order.status,
                    color: colors.textLight,
                    bgColor: colors.border,
                    action: null,
                    actionColor: colors.textLight,
                    icon: null,
                };
        }
    };

    const statusConfig = getStatusConfig();

    const handleAction = () => {
        if (order.status === 'accepted') {
            onPickup(order);
        } else if (order.status === 'in-progress') {
            onDelivered(order);
        }
    };

    return (
        <View style={styles.container}>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                <MonoText size="xs" weight="bold" color={statusConfig.color}>
                    {statusConfig.label.toUpperCase()}
                </MonoText>
            </View>

            {/* Order Header */}
            <TouchableOpacity style={styles.headerRow} onPress={() => onViewDetails(order)} activeOpacity={0.7}>
                <View style={styles.orderInfo}>
                    <MonoText size="m" weight="bold">#{order.orderId}</MonoText>
                    <MonoText size="xs" color={colors.textLight}>
                        {itemCount} {itemCount === 1 ? 'item' : 'items'} • ₹{order.totalPrice}
                    </MonoText>
                </View>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                    <Path d="M9 18l6-6-6-6" />
                </Svg>
            </TouchableOpacity>

            {/* Customer Info */}
            <View style={styles.customerRow}>
                <View style={styles.customerIcon}>
                    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <Circle cx="12" cy="7" r="4" />
                    </Svg>
                </View>
                <View style={styles.customerInfo}>
                    <MonoText size="s" weight="semiBold">{customerName}</MonoText>
                    {customerPhone && (
                        <MonoText size="xs" color={colors.textLight}>{customerPhone}</MonoText>
                    )}
                </View>
            </View>

            {/* Delivery Address */}
            <View style={styles.addressRow}>
                <View style={styles.locationIcon}>
                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2">
                        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <Circle cx="12" cy="10" r="3" />
                    </Svg>
                </View>
                <MonoText size="xs" color={colors.text} numberOfLines={2} style={styles.addressText}>
                    {deliveryAddress}
                </MonoText>
            </View>

            {/* Action Button */}
            {statusConfig.action && (
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: statusConfig.actionColor }]}
                    onPress={handleAction}
                    disabled={isLoading}
                    activeOpacity={0.8}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                        <>
                            {statusConfig.icon === 'pickup' && (
                                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                                    <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                    <Line x1="3" y1="6" x2="21" y2="6" />
                                    <Path d="M16 10a4 4 0 0 1-8 0" />
                                </Svg>
                            )}
                            {statusConfig.icon === 'delivered' && (
                                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2">
                                    <Path d="M20 6L9 17l-5-5" />
                                </Svg>
                            )}
                            <MonoText
                                size="s"
                                weight="bold"
                                color={statusConfig.icon === 'pickup' ? colors.black : colors.white}
                                style={{ marginLeft: spacing.xs }}
                            >
                                {statusConfig.action}
                            </MonoText>
                        </>
                    )}
                </TouchableOpacity>
            )}

            {/* Waiting state */}
            {order.status === 'awaitconfirmation' && (
                <View style={styles.waitingState}>
                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2">
                        <Circle cx="12" cy="12" r="10" />
                        <Path d="M12 6v6l4 2" />
                    </Svg>
                    <MonoText size="xs" color={colors.warning} style={{ marginLeft: spacing.xs }}>
                        Waiting for customer to confirm receipt
                    </MonoText>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.m,
        marginBottom: spacing.m,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.s,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: spacing.s,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    orderInfo: {
        flex: 1,
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    customerIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.s,
    },
    customerInfo: {
        flex: 1,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F8F9FA',
        padding: spacing.s,
        borderRadius: 10,
        marginBottom: spacing.m,
    },
    locationIcon: {
        marginRight: spacing.xs,
        marginTop: 2,
    },
    addressText: {
        flex: 1,
        lineHeight: 18,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
    },
    waitingState: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${colors.warning}15`,
        paddingVertical: spacing.s,
        borderRadius: 10,
    },
});
