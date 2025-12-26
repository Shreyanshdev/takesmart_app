import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
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
    const itemCount = order.items.reduce((sum, item) => sum + item.count, 0);
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
        <TouchableOpacity
            style={styles.container}
            onPress={() => onPress(order)}
            activeOpacity={0.7}
        >
            {/* Header Row */}
            <View style={styles.headerRow}>
                <View style={styles.orderInfo}>
                    <View style={styles.orderIdBadge}>
                        <MonoText size="xs" weight="bold" color={colors.primary}>
                            #{order.orderId}
                        </MonoText>
                    </View>
                    <MonoText size="xxs" color={colors.textLight}>
                        {getTimeAgo(order.createdAt)}
                    </MonoText>
                </View>
                <View style={styles.priceBadge}>
                    <MonoText size="s" weight="bold" color={colors.white}>
                        ₹{order.totalPrice}
                    </MonoText>
                </View>
            </View>

            {/* Customer & Items */}
            <View style={styles.detailsRow}>
                <View style={styles.customerIcon}>
                    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <Circle cx="12" cy="7" r="4" />
                    </Svg>
                </View>
                <View style={styles.customerInfo}>
                    <MonoText size="m" weight="semiBold" numberOfLines={1}>
                        {customerName}
                    </MonoText>
                    <MonoText size="xs" color={colors.textLight}>
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </MonoText>
                </View>
            </View>

            {/* Address Row */}
            <View style={styles.addressRow}>
                <View style={styles.locationIcon}>
                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2">
                        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <Circle cx="12" cy="10" r="3" />
                    </Svg>
                </View>
                <MonoText size="xs" color={colors.text} numberOfLines={2} style={styles.addressText}>
                    {truncatedAddress}
                </MonoText>
            </View>

            {/* Action Hint */}
            <View style={styles.actionHint}>
                <MonoText size="xs" weight="semiBold" color={colors.primary}>
                    Tap to view details →
                </MonoText>
            </View>
        </TouchableOpacity>
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
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    orderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s,
    },
    orderIdBadge: {
        backgroundColor: `${colors.primary}20`,
        paddingHorizontal: spacing.s,
        paddingVertical: 4,
        borderRadius: 8,
    },
    priceBadge: {
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.m,
        paddingVertical: 6,
        borderRadius: 20,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    customerIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
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
        marginBottom: spacing.s,
    },
    locationIcon: {
        marginRight: spacing.xs,
        marginTop: 2,
    },
    addressText: {
        flex: 1,
        lineHeight: 18,
    },
    actionHint: {
        alignItems: 'flex-end',
    },
});
