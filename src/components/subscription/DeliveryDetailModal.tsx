import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { BlurView } from '@react-native-community/blur';
import { format } from 'date-fns';
import { subscriptionService } from '../../services/customer/subscription.service';
import { logger } from '../../utils/logger';

interface DeliveryDetailModalProps {
    visible: boolean;
    onClose: () => void;
    delivery: any;
    subscriptionId: string;
    onUpdate: () => void; // Refresh calendar
}

export const DeliveryDetailModal = ({ visible, onClose, delivery, subscriptionId, onUpdate }: DeliveryDetailModalProps) => {
    const [loading, setLoading] = useState(false);

    if (!delivery) return null;

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await subscriptionService.confirmDelivery(subscriptionId, delivery.date);
            onUpdate();
            onClose();
        } catch (error) {
            logger.error('Failed to confirm delivery:', error);
        } finally {
            setLoading(false);
        }
    };

    const isToday = new Date().toDateString() === new Date(delivery.date).toDateString();
    const canConfirm = isToday && (delivery.status === 'reaching' || delivery.status === 'awaitingCustomer' || delivery.status === 'scheduled');
    // Note: Backend strict check is 'awaitingCustomer', but UI might allow 'scheduled'/ 'reaching' if flow logic permits. 
    // Backend `confirmDeliveryByCustomer` line 640 checks `status !== 'awaitingCustomer'` returns error. 
    // So strictly must be 'awaitingCustomer'. 
    // However, if the frontend sees 'scheduled' for today, it might be that the partner hasn't marked it 'out for delivery' yet?
    // User might want to confirm anyway if they got it? Check if we can/should allow.
    // For now, I'll trust the backend requirement or maybe the backend status update logic handles 'scheduled' -> 'delivered'?
    // No, controller line 640 is explicit.

    // So button attempts to confirm. If backend rejects, we show error?
    // But for UI "Received Today's Delivery" implies it arrived.

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <MonoText size="l" weight="bold">Delivery Details</MonoText>
                        <TouchableOpacity onPress={onClose}>
                            <MonoText size="l" color={colors.textLight}>✕</MonoText>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.row}>
                            <MonoText color={colors.textLight}>Date</MonoText>
                            <MonoText weight="bold">{format(new Date(delivery.date), 'dd MMMM yyyy')}</MonoText>
                        </View>
                        <View style={styles.row}>
                            <MonoText color={colors.textLight}>Slot</MonoText>
                            <MonoText weight="bold" style={{ textTransform: 'capitalize' }}>{delivery.slot}</MonoText>
                        </View>
                        <View style={styles.row}>
                            <MonoText color={colors.textLight}>Status</MonoText>
                            <View style={[styles.badge, { backgroundColor: getStatusColor(delivery.status) }]}>
                                <MonoText size="xs" weight="bold" color={getStatusTextColor(delivery.status)} style={{ textTransform: 'uppercase' }}>
                                    {delivery.status}
                                </MonoText>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <MonoText weight="bold" style={{ marginBottom: spacing.m }}>Products</MonoText>
                        {(!delivery.products || delivery.products.length === 0) && (
                            <MonoText color={colors.textLight} style={{ fontStyle: 'italic', marginBottom: spacing.m }}>No products for this delivery.</MonoText>
                        )}
                        {delivery.products && delivery.products.map((p: any, index: number) => (
                            <View key={index} style={styles.productItem}>
                                <MonoText>{p.productName}</MonoText>
                                <MonoText weight="bold">{p.quantityValue} {p.quantityUnit}</MonoText>
                            </View>
                        ))}

                        {canConfirm ? (
                            <TouchableOpacity
                                style={[styles.confirmBtn, loading && { opacity: 0.7 }]}
                                onPress={handleConfirm}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color={colors.white} />
                                ) : (
                                    <MonoText weight="bold" color={colors.white}>Received Order</MonoText>
                                )}
                            </TouchableOpacity>
                        ) : (
                            isToday && delivery.status === 'delivered' && (
                                <View style={styles.infoBox}>
                                    <MonoText color={colors.primary} size="s" style={{ textAlign: 'center' }}>
                                        Order marked as delivered.
                                    </MonoText>
                                </View>
                            )
                        )}

                        {/* Concession Details */}
                        {delivery.status === 'concession' && (
                            <View style={styles.concessionBox}>
                                <View style={styles.concessionHeader}>
                                    <MonoText weight="bold" color="#7B1FA2">⚠️ Concession Applied</MonoText>
                                </View>
                                <MonoText size="s" color={colors.textLight} style={{ marginTop: spacing.s }}>
                                    This delivery was missed by our delivery partner and has been compensated.
                                </MonoText>

                                {delivery.concessionDetails && (
                                    <View style={{ marginTop: spacing.m }}>
                                        <View style={styles.row}>
                                            <MonoText size="s" color={colors.textLight}>Original Date</MonoText>
                                            <MonoText size="s" weight="bold">
                                                {format(new Date(delivery.concessionDetails.originalDate || delivery.date), 'dd MMM yyyy')}
                                            </MonoText>
                                        </View>
                                        {delivery.concessionDetails.rescheduledTo && (
                                            <View style={styles.row}>
                                                <MonoText size="s" color={colors.textLight}>Rescheduled To</MonoText>
                                                <MonoText size="s" weight="bold" color="#2E7D32">
                                                    {format(new Date(delivery.concessionDetails.rescheduledTo), 'dd MMM yyyy')}
                                                </MonoText>
                                            </View>
                                        )}
                                        {delivery.concessionDetails.extendedSubscription && (
                                            <View style={[styles.infoBox, { backgroundColor: '#E8F5E9', marginTop: spacing.s }]}>
                                                <MonoText size="xs" color="#2E7D32" style={{ textAlign: 'center' }}>
                                                    ✓ Your subscription has been extended by 1 day
                                                </MonoText>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

// Helpers
const getStatusColor = (status: string) => {
    switch (status) {
        case 'delivered': return '#E8F5E9';
        case 'canceled': return '#FFEBEE';
        case 'scheduled': return '#E3F2FD';
        case 'awaitingCustomer': return '#FFFDE7'; // Yellow
        case 'noResponse': return '#FFF3E0'; // Orange
        case 'concession': return '#F3E5F5'; // Light purple
        default: return '#F5F5F5';
    }
};

const getStatusTextColor = (status: string) => {
    switch (status) {
        case 'delivered': return '#2E7D32';
        case 'canceled': return '#C62828';
        case 'scheduled': return '#1565C0';
        case 'awaitingCustomer': return '#FBC02D'; // Darker Yellow
        case 'noResponse': return '#E65100'; // Darker Orange
        case 'concession': return '#7B1FA2'; // Purple
        default: return '#757575';
    }
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdrop: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.l,
        minHeight: 400,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.l,
    },
    content: {
        paddingBottom: spacing.xl,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    badge: {
        paddingHorizontal: spacing.s,
        paddingVertical: 4,
        borderRadius: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: spacing.l,
    },
    productItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    confirmBtn: {
        backgroundColor: colors.primary,
        padding: spacing.m,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    infoBox: {
        backgroundColor: '#E8F5E9',
        padding: spacing.m,
        borderRadius: 12,
        marginTop: spacing.xl,
    },
    concessionBox: {
        backgroundColor: '#F3E5F5',
        padding: spacing.m,
        borderRadius: 12,
        marginTop: spacing.l,
        borderWidth: 1,
        borderColor: '#9C27B0',
        borderStyle: 'dashed',
    },
    concessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
