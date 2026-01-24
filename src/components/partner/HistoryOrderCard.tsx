import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Modal from 'react-native-modal';
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
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Extract data
    const shortOrderId = order.orderId?.slice(-4).toUpperCase() || '----';
    const customerFirstName = order.customer?.name?.split(' ')[0] || 'Customer';
    const deliveryArea = order.deliveryLocation?.addressLine1 ||
        order.deliveryLocation?.address?.split(',')[0] || 'Unknown Area';
    const deliveryNote = order.deliveryLocation?.directions || null;
    const itemCount = order.items?.reduce((sum, item) => sum + (item.count || item.quantity || 0), 0) || 0;
    const isDelivered = order.status === 'delivered';
    const isCancelled = order.status === 'cancelled';
    const isCod = order.paymentDetails?.paymentMethod === 'cod';
    const codAmount = order.totalPrice || 0;

    // Calculate partner earnings (simplified: delivery fee)
    const partnerEarnings = order.deliveryFee || 0;

    // Calculate distance (from route data if available)
    const distanceText = order.routeData?.distance?.text || '--';

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
        }) + ', ' + date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).toUpperCase();
    };

    // Format time only
    const formatTime = (dateString?: string) => {
        if (!dateString) return '--';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).toUpperCase();
    };

    const getStatusInfo = () => {
        if (isDelivered) return { label: 'Delivered', color: colors.success, bgColor: `${colors.success}15` };
        if (isCancelled) return { label: 'Cancelled', color: colors.error, bgColor: `${colors.error}10` };
        return { label: 'No Response', color: colors.textLight, bgColor: '#F5F5F5' };
    };

    const statusInfo = getStatusInfo();

    const getHandlingColor = (type: string) => {
        if (type === 'cold') return '#3B82F6';
        if (type === 'fragile') return '#EF4444';
        if (type === 'heavy') return '#4B5563';
        return colors.primary;
    };

    return (
        <>
            <TouchableOpacity
                style={styles.container}
                onPress={() => setShowDetailModal(true)}
                activeOpacity={0.7}
            >
                {/* Top Row: Order ID + Status */}
                <View style={styles.topRow}>
                    <View style={styles.orderIdContainer}>
                        <MonoText size="m" weight="bold" color={colors.primary}>
                            Order #{shortOrderId}
                        </MonoText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                        {isDelivered && (
                            <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={statusInfo.color} strokeWidth="2.5">
                                <Path d="M20 6L9 17l-5-5" />
                            </Svg>
                        )}
                        {isCancelled && (
                            <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={statusInfo.color} strokeWidth="2">
                                <Path d="M18 6L6 18M6 6l12 12" />
                            </Svg>
                        )}
                        <MonoText size="xxs" weight="bold" color={statusInfo.color}>
                            {statusInfo.label}
                        </MonoText>
                    </View>
                </View>

                {/* Info Row: Date + Items + Distance */}
                <View style={styles.infoRow}>
                    <MonoText size="xs" color={colors.textLight}>
                        {formatDate(order.updatedAt || order.createdAt)}
                    </MonoText>
                    <View style={styles.dot} />
                    <MonoText size="xs" color={colors.textLight}>
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </MonoText>
                    <View style={styles.dot} />
                    <MonoText size="xs" color={colors.textLight}>
                        {distanceText}
                    </MonoText>
                </View>

                {/* Payment + Earnings Row */}
                <View style={styles.paymentRow}>
                    <View style={styles.paymentInfo}>
                        <View style={[styles.paymentBadge, { backgroundColor: isCod ? `${colors.warning}15` : `${colors.success}15` }]}>
                            <MonoText size="xs" weight="bold" color={isCod ? colors.warning : colors.success}>
                                {isCod ? `COD ₹${codAmount}` : 'PREPAID'}
                            </MonoText>
                        </View>
                    </View>
                    <View style={styles.earningsContainer}>
                        <MonoText size="xxs" color={colors.textLight}>Earnings</MonoText>
                        <MonoText size="m" weight="bold" color={isDelivered ? colors.accent : colors.textLight}>
                            ₹{partnerEarnings}
                        </MonoText>
                    </View>
                </View>

                {/* Invoice Button */}
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
                        <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <Path d="M14 2v6h6" />
                            <Path d="M12 18v-6" />
                            <Path d="M9 15l3 3 3-3" />
                        </Svg>
                        <MonoText size="xs" weight="bold" color="#D97706" style={{ marginLeft: 6 }}>
                            Invoice
                        </MonoText>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>

            {/* Order Detail Modal */}
            <Modal
                isVisible={showDetailModal}
                onBackdropPress={() => setShowDetailModal(false)}
                onSwipeComplete={() => setShowDetailModal(false)}
                swipeDirection={['down']}
                style={styles.modal}
                backdropOpacity={0.5}
                animationIn="slideInUp"
                animationOut="slideOutDown"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHandle} />

                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                        <MonoText size="l" weight="bold">Order #{shortOrderId}</MonoText>
                        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                            <MonoText size="xs" weight="bold" color={statusInfo.color}>
                                {statusInfo.label}
                            </MonoText>
                        </View>
                    </View>

                    {/* Timeline Section */}
                    <View style={styles.timelineSection}>
                        <MonoText size="xs" weight="bold" color={colors.textLight} style={styles.sectionLabel}>
                            TIMELINE
                        </MonoText>
                        <View style={styles.timelineRow}>
                            <View style={styles.timelineItem}>
                                <View style={[styles.timelineDot, { backgroundColor: colors.accent }]} />
                                <MonoText size="xs" color={colors.textLight}>Accepted</MonoText>
                                <MonoText size="s" weight="bold">{formatTime(order.createdAt)}</MonoText>
                            </View>
                            <View style={styles.timelineLine} />
                            <View style={styles.timelineItem}>
                                <View style={[styles.timelineDot, { backgroundColor: '#3B82F6' }]} />
                                <MonoText size="xs" color={colors.textLight}>Picked Up</MonoText>
                                <MonoText size="s" weight="bold">{formatTime(order.createdAt)}</MonoText>
                            </View>
                            <View style={styles.timelineLine} />
                            <View style={styles.timelineItem}>
                                <View style={[styles.timelineDot, { backgroundColor: isDelivered ? colors.success : colors.error }]} />
                                <MonoText size="xs" color={colors.textLight}>{isDelivered ? 'Delivered' : 'Ended'}</MonoText>
                                <MonoText size="s" weight="bold">{formatTime(order.updatedAt)}</MonoText>
                            </View>
                        </View>
                    </View>

                    {/* Customer Info (Masked) */}
                    <View style={styles.customerSection}>
                        <MonoText size="xs" weight="bold" color={colors.textLight} style={styles.sectionLabel}>
                            CUSTOMER
                        </MonoText>
                        <View style={styles.customerRow}>
                            <View style={styles.customerAvatar}>
                                <MonoText size="s" weight="bold" color={colors.white}>
                                    {customerFirstName.charAt(0).toUpperCase()}
                                </MonoText>
                            </View>
                            <View style={styles.customerInfo}>
                                <MonoText size="s" weight="bold">{customerFirstName}</MonoText>
                                <MonoText size="xs" color={colors.textLight}>Area: {deliveryArea}</MonoText>
                                {deliveryNote && (
                                    <MonoText size="xs" color={colors.primary} style={{ marginTop: 4 }}>
                                        Note: {deliveryNote}
                                    </MonoText>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Items Section (Limited) */}
                    <View style={styles.itemsSection}>
                        <MonoText size="xs" weight="bold" color={colors.textLight} style={styles.sectionLabel}>
                            ITEMS ({itemCount})
                        </MonoText>
                        {order.items?.slice(0, 5).map((item, index) => (
                            <View key={index} style={styles.itemRow}>
                                <View style={styles.itemIcon}>
                                    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.border} strokeWidth="1.5">
                                        <Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                    </Svg>
                                </View>
                                <View style={styles.itemInfo}>
                                    <MonoText size="s" numberOfLines={1}>{item.productName || item.item}</MonoText>
                                    <View style={styles.itemMeta}>
                                        <MonoText size="xxs" color={colors.textLight}>
                                            Qty: {item.count || item.quantity} • {item.packSize || 'Standard'}
                                        </MonoText>
                                        {item.handling?.cold && (
                                            <View style={[styles.handlingTag, { backgroundColor: getHandlingColor('cold') }]}>
                                                <MonoText size="xxs" weight="bold" color={colors.white}>COLD</MonoText>
                                            </View>
                                        )}
                                        {item.handling?.fragile && (
                                            <View style={[styles.handlingTag, { backgroundColor: getHandlingColor('fragile') }]}>
                                                <MonoText size="xxs" weight="bold" color={colors.white}>FRAGILE</MonoText>
                                            </View>
                                        )}
                                        {item.handling?.heavy && (
                                            <View style={[styles.handlingTag, { backgroundColor: getHandlingColor('heavy') }]}>
                                                <MonoText size="xxs" weight="bold" color={colors.white}>HEAVY</MonoText>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        ))}
                        {(order.items?.length || 0) > 5 && (
                            <MonoText size="xs" color={colors.textLight} style={{ marginTop: 8, textAlign: 'center' }}>
                                + {(order.items?.length || 0) - 5} more items
                            </MonoText>
                        )}
                    </View>

                    {/* Close Button */}
                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={() => setShowDetailModal(false)}
                    >
                        <MonoText size="s" weight="bold" color={colors.white}>Close</MonoText>
                    </TouchableOpacity>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.m,
        marginBottom: spacing.s,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderIdContainer: {
        flex: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.border,
        marginHorizontal: 8,
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.04)',
    },
    paymentInfo: {
        flex: 1,
    },
    paymentBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    earningsContainer: {
        alignItems: 'flex-end',
    },
    invoiceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        backgroundColor: 'rgba(251, 191, 36, 0.12)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.3)',
    },
    // Modal Styles
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    modalContainer: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingBottom: 30,
        maxHeight: '85%',
    },
    modalHandle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionLabel: {
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    timelineSection: {
        marginBottom: 20,
    },
    timelineRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    timelineItem: {
        alignItems: 'center',
        flex: 1,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginBottom: 6,
    },
    timelineLine: {
        height: 2,
        flex: 1,
        backgroundColor: '#E5E7EB',
        marginTop: 5,
        marginHorizontal: -10,
    },
    customerSection: {
        marginBottom: 20,
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    customerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    customerInfo: {
        flex: 1,
    },
    itemsSection: {
        marginBottom: 20,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.04)',
    },
    itemIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: 4,
        gap: 6,
    },
    handlingTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    closeBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 10,
    },
});
