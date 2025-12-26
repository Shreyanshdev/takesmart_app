import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { invoiceService } from '../../services/customer/invoice.service';
import { PartnerOrder } from '../../types/partner';
import { logger } from '../../utils/logger';

interface HistoryOrderCardProps {
    order: PartnerOrder;
    onPress?: (order: PartnerOrder) => void;
}

export const HistoryOrderCard: React.FC<HistoryOrderCardProps> = ({ order, onPress }) => {
    const customerName = order.customer?.name || 'Customer';
    const itemCount = order.items.reduce((sum, item) => sum + item.count, 0);
    const isDelivered = order.status === 'delivered';

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return `Today, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => onPress?.(order)}
            activeOpacity={0.7}
            disabled={!onPress}
        >
            {/* Header Row */}
            <View style={styles.headerRow}>
                <View style={styles.orderInfo}>
                    <MonoText size="s" weight="bold">#{order.orderId}</MonoText>
                    <MonoText size="xxs" color={colors.textLight}>
                        {formatDate(order.updatedAt || order.createdAt)}
                    </MonoText>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: isDelivered ? `${colors.success}20` : `${colors.error}20` }]}>
                    {isDelivered ? (
                        <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2.5">
                            <Path d="M20 6L9 17l-5-5" />
                        </Svg>
                    ) : (
                        <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="2">
                            <Circle cx="12" cy="12" r="10" />
                            <Path d="M15 9l-6 6M9 9l6 6" />
                        </Svg>
                    )}
                    <MonoText size="xxs" weight="bold" color={isDelivered ? colors.success : colors.error}>
                        {isDelivered ? 'DELIVERED' : 'CANCELLED'}
                    </MonoText>
                </View>
            </View>

            {/* Customer & Items */}
            <View style={styles.detailsRow}>
                <View style={styles.customerIcon}>
                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <Circle cx="12" cy="7" r="4" />
                    </Svg>
                </View>
                <MonoText size="s" color={colors.text} style={{ flex: 1 }}>
                    {customerName}
                </MonoText>
                <MonoText size="xs" color={colors.textLight}>
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </MonoText>
            </View>

            {/* Price */}
            <View style={styles.priceRow}>
                <MonoText size="xs" color={colors.textLight}>Total Earned</MonoText>
                <MonoText size="m" weight="bold" color={isDelivered ? colors.accent : colors.textLight}>
                    ₹{order.totalPrice}
                </MonoText>
            </View>

            {/* Download Invoice Button */}
            {isDelivered && (
                <TouchableOpacity
                    style={styles.invoiceBtn}
                    onPress={async (e) => {
                        e.stopPropagation();
                        try {
                            const invoiceData = invoiceService.createInvoiceFromOrder(order);
                            await invoiceService.generateAndShareInvoice(invoiceData);
                        } catch (err) {
                            logger.error('Invoice error:', err);
                        }
                    }}
                >
                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                        <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <Path d="M14 2v6h6" />
                        <Path d="M12 18v-6" />
                        <Path d="M9 15l3 3 3-3" />
                    </Svg>
                    <MonoText size="xs" weight="bold" color="#D97706">Invoice</MonoText>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: spacing.m,
        marginBottom: spacing.s,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.s,
    },
    orderInfo: {
        flex: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.s,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    customerIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.s,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.s,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    invoiceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginTop: spacing.m,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.4)',
    },
});
