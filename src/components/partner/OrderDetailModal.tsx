import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Linking,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import Modal from 'react-native-modal';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { PartnerOrder } from '../../types/partner';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OrderDetailModalProps {
    visible: boolean;
    order: PartnerOrder | null;
    onClose: () => void;
    onAccept: (order: PartnerOrder) => Promise<boolean>;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
    visible,
    order,
    onClose,
    onAccept,
}) => {
    const [isAccepting, setIsAccepting] = useState(false);

    if (!order) return null;

    const customerName = order.customer?.name || 'Customer';
    const customerPhone = order.customer?.phone || '';
    const branchName = order.branch?.name || 'Branch';
    const branchAddress = order.branch?.address || order.pickupLocation.address;
    const deliveryAddress = order.deliveryLocation.address;
    const itemCount = order.items.reduce((sum, item) => sum + item.count, 0);

    const handleCall = () => {
        if (customerPhone) {
            Linking.openURL(`tel:${customerPhone}`);
        }
    };

    const handleNavigate = () => {
        if (order.deliveryLocation?.latitude && order.deliveryLocation?.longitude) {
            const destination = `${order.deliveryLocation.latitude},${order.deliveryLocation.longitude}`;
            const url = Platform.select({
                ios: `maps://app?daddr=${destination}`,
                android: `google.navigation:q=${destination}&mode=d`
            });

            if (url) {
                Linking.openURL(url).catch(() => {
                    // Fallback to Google Maps URL
                    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
                });
            }
        } else {
            Alert.alert('No Location', 'Delivery location coordinates are not available.');
        }
    };

    const handleAccept = async () => {
        setIsAccepting(true);
        try {
            const success = await onAccept(order);
            if (success) {
                onClose();
            } else {
                Alert.alert('Failed', 'Could not accept order. It may have been taken by another partner.');
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        }
        setIsAccepting(false);
    };

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            style={styles.modal}
            propagateSwipe
            backdropOpacity={0.5}
        >
            <View style={styles.container}>
                {/* Handle bar */}
                <View style={styles.handleBar} />

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.orderIdBadge}>
                            <MonoText size="s" weight="bold" color={colors.primary}>
                                #{order.orderId}
                            </MonoText>
                        </View>
                        <MonoText size="xs" color={colors.textLight}>
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </MonoText>
                    </View>
                    <View style={styles.priceBadge}>
                        <MonoText size="l" weight="bold" color={colors.white}>
                            ₹{order.totalPrice}
                        </MonoText>
                    </View>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Pickup Location */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}20` }]}>
                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <Path d="M9 22V12h6v10" />
                                </Svg>
                            </View>
                            <MonoText size="xs" weight="bold" color={colors.textLight}>
                                PICKUP FROM
                            </MonoText>
                        </View>
                        <View style={styles.locationCard}>
                            <MonoText size="m" weight="semiBold">{branchName}</MonoText>
                            <MonoText size="s" color={colors.textLight} style={{ marginTop: 4 }}>
                                {branchAddress}
                            </MonoText>
                        </View>
                    </View>

                    {/* Route indicator */}
                    <View style={styles.routeIndicator}>
                        <View style={styles.routeLine} />
                        <View style={styles.routeArrow}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2">
                                <Line x1="12" y1="5" x2="12" y2="19" />
                                <Path d="M19 12l-7 7-7-7" />
                            </Svg>
                        </View>
                        <View style={styles.routeLine} />
                    </View>

                    {/* Delivery Location */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.iconCircle, { backgroundColor: `${colors.accent}20` }]}>
                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2">
                                    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <Circle cx="12" cy="10" r="3" />
                                </Svg>
                            </View>
                            <MonoText size="xs" weight="bold" color={colors.textLight}>
                                DELIVER TO
                            </MonoText>
                        </View>
                        <View style={styles.locationCard}>
                            <View style={styles.locationHeaderRow}>
                                <MonoText size="m" weight="semiBold">{customerName}</MonoText>
                                <TouchableOpacity onPress={handleNavigate} style={styles.navigateBtn}>
                                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2">
                                        <Path d="M3 11l19-9-9 19-2-8-8-2z" />
                                    </Svg>
                                    <MonoText size="xxs" weight="bold" color={colors.white} style={{ marginLeft: 4 }}>
                                        Navigate
                                    </MonoText>
                                </TouchableOpacity>
                            </View>
                            <MonoText size="s" color={colors.textLight} style={{ marginTop: 4 }}>
                                {deliveryAddress}
                            </MonoText>
                            {customerPhone && (
                                <TouchableOpacity style={styles.callButton} onPress={handleCall}>
                                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2">
                                        <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </Svg>
                                    <MonoText size="xs" weight="semiBold" color={colors.accent}>
                                        {customerPhone}
                                    </MonoText>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Order Items */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.iconCircle, { backgroundColor: `${colors.warning}20` }]}>
                                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2">
                                    <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                    <Line x1="3" y1="6" x2="21" y2="6" />
                                    <Path d="M16 10a4 4 0 0 1-8 0" />
                                </Svg>
                            </View>
                            <MonoText size="xs" weight="bold" color={colors.textLight}>
                                ORDER ITEMS
                            </MonoText>
                        </View>
                        <View style={styles.itemsCard}>
                            {order.items.map((item, index) => (
                                <View key={index} style={styles.itemRow}>
                                    <View style={styles.itemQuantity}>
                                        <MonoText size="s" weight="bold" color={colors.white}>
                                            {item.count}x
                                        </MonoText>
                                    </View>
                                    <MonoText size="s" style={{ flex: 1 }}>
                                        {item.item}
                                    </MonoText>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Price breakdown */}
                    <View style={styles.priceSection}>
                        <View style={styles.priceRow}>
                            <MonoText size="s" color={colors.textLight}>Subtotal</MonoText>
                            <MonoText size="s">₹{order.totalPrice - order.deliveryFee}</MonoText>
                        </View>
                        <View style={styles.priceRow}>
                            <MonoText size="s" color={colors.textLight}>Delivery Fee</MonoText>
                            <MonoText size="s">₹{order.deliveryFee}</MonoText>
                        </View>
                        <View style={[styles.priceRow, styles.totalRow]}>
                            <MonoText size="m" weight="bold">Total</MonoText>
                            <MonoText size="l" weight="bold" color={colors.accent}>₹{order.totalPrice}</MonoText>
                        </View>
                    </View>
                </ScrollView>

                {/* Accept Button */}
                <TouchableOpacity
                    style={[styles.acceptButton, isAccepting && styles.acceptButtonDisabled]}
                    onPress={handleAccept}
                    disabled={isAccepting}
                    activeOpacity={0.8}
                >
                    {isAccepting ? (
                        <ActivityIndicator color={colors.black} />
                    ) : (
                        <>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2.5">
                                <Path d="M20 6L9 17l-5-5" />
                            </Svg>
                            <MonoText size="l" weight="bold" color={colors.black} style={{ marginLeft: spacing.s }}>
                                Accept Order
                            </MonoText>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    container: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: SCREEN_HEIGHT * 0.85,
        paddingBottom: 34, // Safe area
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: spacing.s,
        marginBottom: spacing.m,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.m,
        paddingBottom: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.s,
    },
    orderIdBadge: {
        backgroundColor: `${colors.primary}20`,
        paddingHorizontal: spacing.m,
        paddingVertical: 6,
        borderRadius: 10,
    },
    priceBadge: {
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.l,
        paddingVertical: spacing.s,
        borderRadius: 20,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: spacing.m,
        paddingTop: spacing.m,
    },
    section: {
        marginBottom: spacing.s,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.s,
        gap: spacing.s,
    },
    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationCard: {
        backgroundColor: '#F8F9FA',
        padding: spacing.m,
        borderRadius: 12,
        marginLeft: 36,
    },
    routeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 14,
        marginVertical: -spacing.xs,
    },
    routeLine: {
        flex: 1,
        height: 2,
        backgroundColor: colors.border,
    },
    locationHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    navigateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accent,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    routeArrow: {
        backgroundColor: colors.white,
        padding: 4,
    },
    callButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.s,
        backgroundColor: `${colors.accent}15`,
        paddingHorizontal: spacing.s,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    itemsCard: {
        backgroundColor: '#F8F9FA',
        padding: spacing.m,
        borderRadius: 12,
        marginLeft: 36,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    itemQuantity: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.s,
        paddingVertical: 2,
        borderRadius: 6,
        marginRight: spacing.s,
        minWidth: 32,
        alignItems: 'center',
    },
    priceSection: {
        backgroundColor: '#F8F9FA',
        padding: spacing.m,
        borderRadius: 12,
        marginBottom: spacing.m,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: spacing.s,
        marginTop: spacing.s,
        marginBottom: 0,
    },
    acceptButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        marginHorizontal: spacing.m,
        paddingVertical: spacing.m,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    acceptButtonDisabled: {
        opacity: 0.7,
    },
});
