import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { PartnerOrder } from '../../types/partner';
import { BlurView } from '@react-native-community/blur';

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
    // Use itemCount from API, only fallback to calculating from items if not available
    const itemCount = order.itemCount ?? (order.items?.reduce((sum, item) => sum + (item.quantity || item.count || 0), 0) || 0);


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
            <BlurView
                blurType="light"
                blurAmount={10}
                reducedTransparencyFallbackColor="white"
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.cardContent}>
                {/* Header: ID + Status */}
                <View style={styles.headerRow}>
                    <View style={styles.orderIdBadge}>
                        <View style={styles.idLabel}>
                            <MonoText size="xxs" weight="bold" color={colors.textLight}>ORDER ID</MonoText>
                        </View>
                        <View style={styles.idValue}>
                            <MonoText size="xs" weight="bold" color={colors.black}>#{order.orderId?.slice(-6).toUpperCase()}</MonoText>
                        </View>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                        <MonoText size="xxs" weight="bold" color={statusConfig.color}>
                            {statusConfig.label.toUpperCase()}
                        </MonoText>
                    </View>
                </View>

                {/* Main Info Box */}
                <TouchableOpacity
                    style={styles.mainInfoBox}
                    onPress={() => onViewDetails(order)}
                    activeOpacity={0.7}
                >
                    <View style={styles.customerSection}>
                        <View style={styles.customerAvatar}>
                            <MonoText size="s" weight="bold" color={colors.white}>
                                {customerName.charAt(0).toUpperCase()}
                            </MonoText>
                        </View>
                        <View style={styles.customerDetails}>
                            <MonoText size="m" weight="bold">{customerName}</MonoText>
                            <MonoText size="xs" color={colors.textLight}>
                                {itemCount} {itemCount === 1 ? 'item' : 'items'} • ₹{order.totalPrice}
                            </MonoText>
                        </View>
                        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.border} strokeWidth="2">
                            <Path d="M9 18l6-6-6-6" />
                        </Svg>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.addressSection}>
                        <View style={styles.iconCircle}>
                            <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5">
                                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <Circle cx="12" cy="10" r="3" />
                            </Svg>
                        </View>
                        <MonoText size="xs" color={colors.text} numberOfLines={1} style={styles.addressText}>
                            {deliveryAddress}
                        </MonoText>
                    </View>
                </TouchableOpacity>

                {/* Footer Action */}
                {statusConfig.action ? (
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: statusConfig.actionColor }]}
                        onPress={handleAction}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={statusConfig.icon === 'pickup' ? colors.black : colors.white} size="small" />
                        ) : (
                            <View style={styles.actionBtnContent}>
                                {statusConfig.icon === 'pickup' ? (
                                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2.5">
                                        <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                        <Path d="M3 6h18" />
                                        <Path d="M16 10a4 4 0 0 1-8 0" />
                                    </Svg>
                                ) : (
                                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2.5">
                                        <Path d="M20 6L9 17l-5-5" />
                                    </Svg>
                                )}
                                <MonoText
                                    size="s"
                                    weight="bold"
                                    color={statusConfig.icon === 'pickup' ? colors.black : colors.white}
                                    style={{ marginLeft: 8 }}
                                >
                                    {statusConfig.action}
                                </MonoText>
                            </View>
                        )}
                    </TouchableOpacity>
                ) : order.status === 'awaitconfirmation' ? (
                    <View style={styles.waitingBanner}>
                        <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2">
                            <Circle cx="12" cy="12" r="10" />
                            <Path d="M12 6v6l4 2" />
                        </Svg>
                        <MonoText size="xs" weight="bold" color={colors.warning} style={{ marginLeft: 8 }}>
                            Waiting for customer confirmation
                        </MonoText>
                    </View>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        marginBottom: spacing.m,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    cardContent: {
        padding: spacing.m,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    orderIdBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.border,
        overflow: 'hidden',
    },
    idLabel: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRightWidth: 1,
        borderRightColor: colors.border,
        borderStyle: 'dashed',
    },
    idValue: {
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    mainInfoBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.02)',
    },
    customerSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    customerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    customerDetails: {
        flex: 1,
        marginLeft: 12,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        marginVertical: 12,
    },
    addressSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: `${colors.accent}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addressText: {
        flex: 1,
        marginLeft: 10,
    },
    actionButton: {
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    actionBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    waitingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.2)',
    },
});
