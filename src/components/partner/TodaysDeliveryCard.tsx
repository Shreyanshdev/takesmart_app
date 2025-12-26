import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { SubscriptionDelivery } from '../../types/partner';

interface TodaysDeliveryCardProps {
    delivery: SubscriptionDelivery;
    onStartDelivery?: (delivery: SubscriptionDelivery) => void;
    onMarkDelivered?: (delivery: SubscriptionDelivery) => void;
    onNoResponse?: (delivery: SubscriptionDelivery) => void;
    isLoading?: boolean;
    readOnly?: boolean; // For upcoming tab - no action buttons
    showDate?: boolean; // Show date for upcoming deliveries
}

export const TodaysDeliveryCard: React.FC<TodaysDeliveryCardProps> = ({
    delivery,
    onStartDelivery,
    onMarkDelivered,
    onNoResponse,
    isLoading = false,
    readOnly = false,
    showDate = false,
}) => {
    const customerName = (delivery as any).customerName || delivery.customer?.name || 'Customer';
    const customerPhone = (delivery as any).customerPhone || delivery.customer?.phone || '';
    const subscriptionDisplayId = (delivery as any).subscriptionDisplayId || '';
    const productCount = delivery.products?.length || 0;

    // Get delivery location for navigation
    const deliveryLocation = (delivery as any).deliveryLocation || null;

    // Format slot time
    const getSlotTime = (slot: string) => {
        return slot === 'morning' ? '6:00 AM - 9:00 AM' : '5:00 PM - 8:00 PM';
    };

    // Format date for upcoming
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.getTime() === today.getTime()) return 'Today';
        if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    };

    // Handle call customer
    const handleCallCustomer = () => {
        if (customerPhone && customerPhone !== 'Unknown') {
            Linking.openURL(`tel:${customerPhone}`);
        } else {
            Alert.alert('No Phone Number', 'Customer phone number is not available.');
        }
    };

    // Handle navigate to location
    const handleNavigate = () => {
        if (deliveryLocation?.latitude && deliveryLocation?.longitude) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${deliveryLocation.latitude},${deliveryLocation.longitude}`;
            Linking.openURL(url);
        } else {
            Alert.alert('No Location', 'Delivery location coordinates are not available.');
        }
    };

    // Status config
    const getStatusConfig = () => {
        switch (delivery.status) {
            case 'scheduled':
                return {
                    label: 'Scheduled',
                    color: colors.primary,
                    bgColor: `${colors.primary}20`,
                    showStartButton: !readOnly,
                };
            case 'reaching':
                return {
                    label: 'On The Way',
                    color: colors.accent,
                    bgColor: `${colors.accent}20`,
                    showDeliveredButtons: !readOnly,
                };
            case 'awaitingCustomer':
                return {
                    label: 'Awaiting Customer',
                    color: colors.warning,
                    bgColor: `${colors.warning}20`,
                    showWaiting: true,
                };
            case 'delivered':
                return {
                    label: 'Delivered',
                    color: colors.success,
                    bgColor: `${colors.success}20`,
                };
            case 'noResponse':
                return {
                    label: 'No Response',
                    color: colors.error,
                    bgColor: `${colors.error}20`,
                };
            default:
                return {
                    label: delivery.status,
                    color: colors.textLight,
                    bgColor: colors.border,
                };
        }
    };

    const statusConfig = getStatusConfig();

    // Format address - handle both formats from API
    const getFormattedAddress = () => {
        // New API format uses customerAddress directly
        if ((delivery as any).customerAddress) {
            return (delivery as any).customerAddress;
        }
        // Old format uses address object
        const addr = delivery.address;
        if (!addr) return 'Address not available';
        const parts = [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.zipCode];
        const formatted = parts.filter(Boolean).join(', ');
        return formatted || 'Address not available';
    };

    return (
        <View style={styles.container}>
            {/* Date Badge for upcoming */}
            {showDate && (
                <View style={styles.dateBadge}>
                    <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                        <Path d="M8 2v4M16 2v4M3 10h18M21 8.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.5" />
                    </Svg>
                    <MonoText size="xs" weight="bold" color={colors.primary} style={{ marginLeft: 4 }}>
                        {formatDate(delivery.date)}
                    </MonoText>
                </View>
            )}

            {/* Header with Status and Slot */}
            <View style={styles.headerRow}>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                    <MonoText size="xs" weight="bold" color={statusConfig.color}>
                        {statusConfig.label.toUpperCase()}
                    </MonoText>
                </View>
                <View style={styles.slotBadge}>
                    <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2">
                        <Circle cx="12" cy="12" r="10" />
                        <Path d="M12 6v6l4 2" />
                    </Svg>
                    <MonoText size="xxs" weight="semiBold" style={{ marginLeft: 4 }}>
                        {delivery.slot.toUpperCase()}
                    </MonoText>
                </View>
            </View>

            {/* Subscription ID Badge */}
            {subscriptionDisplayId && (
                <View style={styles.subscriptionIdRow}>
                    <MonoText size="xxs" color={colors.textLight}>ID: </MonoText>
                    <MonoText size="xs" weight="bold" color={colors.primary}>
                        {subscriptionDisplayId}
                    </MonoText>
                </View>
            )}

            {/* Customer Info */}
            <View style={styles.customerRow}>
                <View style={styles.customerIcon}>
                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <Circle cx="12" cy="7" r="4" />
                    </Svg>
                </View>
                <View style={styles.customerInfo}>
                    <MonoText size="m" weight="semiBold">{customerName}</MonoText>
                    <TouchableOpacity onPress={handleCallCustomer} style={styles.phoneRow}>
                        <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2">
                            <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </Svg>
                        <MonoText size="xs" color={colors.accent} style={{ marginLeft: 4 }}>
                            {customerPhone}
                        </MonoText>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleCallCustomer} style={styles.callButton}>
                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2">
                        <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </Svg>
                </TouchableOpacity>
            </View>

            {/* Products List */}
            <View style={styles.productsSection}>
                {delivery.products?.map((product, index) => (
                    <View key={index} style={styles.productRow}>
                        <View style={styles.productDot} />
                        <MonoText size="s" style={{ flex: 1 }}>
                            {product.productName}
                        </MonoText>
                        <MonoText size="xs" color={colors.textLight}>
                            {product.quantityValue} {product.quantityUnit}
                        </MonoText>
                    </View>
                ))}
            </View>

            {/* Address with Navigate Button */}
            <View style={styles.addressSection}>
                <View style={styles.addressRow}>
                    <View style={styles.locationIcon}>
                        <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2">
                            <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <Circle cx="12" cy="10" r="3" />
                        </Svg>
                    </View>
                    <MonoText size="xs" color={colors.text} numberOfLines={2} style={styles.addressText}>
                        {getFormattedAddress()}
                    </MonoText>
                </View>
                <TouchableOpacity onPress={handleNavigate} style={styles.navigateButton}>
                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2">
                        <Path d="M3 11l19-9-9 19-2-8-8-2z" />
                    </Svg>
                    <MonoText size="xxs" weight="bold" color={colors.white} style={{ marginLeft: 4 }}>
                        Navigate
                    </MonoText>
                </TouchableOpacity>
            </View>

            {/* Action Buttons - Only show when not readOnly */}
            {!readOnly && statusConfig.showStartButton && onStartDelivery && (
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => onStartDelivery(delivery)}
                    disabled={isLoading}
                    activeOpacity={0.8}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.black} />
                    ) : (
                        <>
                            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                                <Path d="M5 12h14M12 5l7 7-7 7" />
                            </Svg>
                            <MonoText size="s" weight="bold" color={colors.black} style={{ marginLeft: spacing.xs }}>
                                Start Delivery
                            </MonoText>
                        </>
                    )}
                </TouchableOpacity>
            )}

            {!readOnly && statusConfig.showDeliveredButtons && onMarkDelivered && onNoResponse && (
                <View style={styles.dualButtonRow}>
                    <TouchableOpacity
                        style={[styles.secondaryButton, { flex: 1 }]}
                        onPress={() => onNoResponse(delivery)}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        <MonoText size="xs" weight="bold" color={colors.error}>
                            No Response
                        </MonoText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.successButton, { flex: 1.5 }]}
                        onPress={() => onMarkDelivered(delivery)}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={colors.white} size="small" />
                        ) : (
                            <>
                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2.5">
                                    <Path d="M20 6L9 17l-5-5" />
                                </Svg>
                                <MonoText size="xs" weight="bold" color={colors.white} style={{ marginLeft: 4 }}>
                                    Mark Delivered
                                </MonoText>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {statusConfig.showWaiting && (
                <View style={styles.waitingState}>
                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2">
                        <Circle cx="12" cy="12" r="10" />
                        <Path d="M12 6v6l4 2" />
                    </Svg>
                    <MonoText size="xs" color={colors.warning} style={{ marginLeft: spacing.xs }}>
                        Waiting for customer confirmation
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
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.primary}10`,
        paddingHorizontal: spacing.s,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: spacing.s,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.s,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    slotBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
        paddingHorizontal: spacing.s,
        paddingVertical: 4,
        borderRadius: 8,
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    subscriptionIdRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
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
    callButton: {
        padding: spacing.xs,
        backgroundColor: colors.accent,
        borderRadius: 20,
        marginLeft: spacing.s,
    },
    productBadge: { // Not used in new design but kept for safety
        backgroundColor: `${colors.primary}15`,
        paddingHorizontal: spacing.s,
        paddingVertical: 4,
        borderRadius: 8,
    },
    productsSection: {
        backgroundColor: '#F8F9FA',
        padding: spacing.s,
        borderRadius: 10,
        marginBottom: spacing.s,
    },
    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    productDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
        marginRight: spacing.s,
    },
    addressSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        padding: spacing.s,
        borderRadius: 10,
        marginBottom: spacing.m,
        gap: spacing.s,
    },
    addressRow: { // Modified to flex 1 inside section
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    locationIcon: {
        marginRight: spacing.xs,
        marginTop: 2,
    },
    addressText: {
        flex: 1,
        lineHeight: 18,
    },
    navigateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 12,
        borderRadius: 12,
    },
    dualButtonRow: {
        flexDirection: 'row',
        gap: spacing.s,
    },
    secondaryButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${colors.error}15`,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.error,
    },
    successButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
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
