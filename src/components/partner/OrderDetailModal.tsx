import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Alert,
} from 'react-native';
import Modal from 'react-native-modal';
import Svg, { Path, Circle } from 'react-native-svg';
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

    const branchName = order.branch?.name || 'Branch';
    const branchAddress = order.branch?.address || 'Branch Address';
    const deliveryAddress = order.deliveryLocation.address;
    const itemCount = order.itemCount ?? (order.items?.reduce((sum, item) => sum + (item.quantity || item.count || 0), 0) || 0);
    const paymentMethod = order.paymentDetails?.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Online Payment';

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
            backdropOpacity={0.6}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            useNativeDriverForBackdrop
            hideModalContentWhileAnimating
        >
            <View style={styles.container}>
                {/* Handle bar */}
                <View style={styles.handleBar} />

                <View style={styles.header}>
                    <View style={styles.orderIdBadgeNeoglass}>
                        <MonoText size="s" weight="bold" color={colors.primary}>
                            #{order.orderId}
                        </MonoText>
                    </View>

                    {/* Payment Status In Header */}
                    <View style={order.paymentDetails?.paymentMethod === 'cod' ? styles.codBadge : styles.prepaidBadge}>
                        <MonoText size="xs" weight="bold" color={order.paymentDetails?.paymentMethod === 'cod' ? colors.warning : colors.success}>
                            {order.paymentDetails?.paymentMethod === 'cod' ? `COD Collect ₹${order.totalPrice}` : (order.paymentDetails?.paymentMethod === 'online' ? 'ONLINE PREPAID' : 'PREPAID')}
                        </MonoText>
                    </View>
                </View>

                {/* Content Section */}
                <View style={styles.content}>

                    {/* Pickup Section */}
                    <View style={styles.infoRow}>
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 71, 0, 0.1)' }]}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <Path d="M9 22V12h6v10" />
                            </Svg>
                        </View>
                        <View style={styles.infoText}>
                            <MonoText size="xs" weight="bold" color={colors.textLight} style={styles.label}>PICKUP FROM</MonoText>
                            <MonoText size="m" weight="bold">{branchName}</MonoText>
                            <MonoText size="s" color={colors.textLight} numberOfLines={2}>{branchAddress}</MonoText>
                        </View>
                    </View>

                    {/* Delivery Section */}
                    <View style={styles.infoRow}>
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 122, 0, 0.1)' }]}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2">
                                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <Circle cx="12" cy="10" r="3" />
                            </Svg>
                        </View>
                        <View style={styles.infoText}>
                            <MonoText size="xs" weight="bold" color={colors.textLight} style={styles.label}>DELIVER TO</MonoText>
                            <MonoText size="s" color={colors.text} numberOfLines={3}>{deliveryAddress}</MonoText>
                        </View>
                    </View>

                    {/* Order Details Flat Row (Items & Payment) */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <MonoText size="xs" weight="bold" color={colors.textLight} style={styles.label}>TOTAL ITEMS</MonoText>
                            <MonoText size="m" weight="bold">{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</MonoText>
                        </View>
                        <View style={styles.statBox}>
                            <MonoText size="xs" weight="bold" color={colors.textLight} style={styles.label}>PAYMENT</MonoText>
                            <MonoText size="s" weight="bold" color={order.paymentDetails?.paymentMethod === 'cod' ? colors.warning : colors.success}>
                                {paymentMethod}
                            </MonoText>
                        </View>
                    </View>
                </View>

                {/* Accept Button Overlay */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.acceptButton, isAccepting && styles.acceptButtonDisabled]}
                        onPress={handleAccept}
                        disabled={isAccepting}
                        activeOpacity={0.8}
                    >
                        {isAccepting ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <>
                                <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="3">
                                    <Path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                                <MonoText size="l" weight="bold" color={colors.white} style={{ marginLeft: 12 }}>
                                    Accept Delivery
                                </MonoText>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
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
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: spacing.xl,
    },
    handleBar: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    codBadge: {
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(234, 179, 8, 0.2)',
    },
    prepaidBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.2)',
    },
    orderIdBadgeNeoglass: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        backgroundColor: 'rgba(255, 71, 0, 0.05)',
    },
    content: {
        padding: 24,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    infoText: {
        flex: 1,
    },
    label: {
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
    },
    statBox: {
        flex: 1,
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.05)',
    },
    acceptButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingVertical: 20,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptButtonDisabled: {
        opacity: 0.7,
    },
});
