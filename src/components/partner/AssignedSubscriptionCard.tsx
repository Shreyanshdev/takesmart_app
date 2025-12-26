import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    Linking,
    Dimensions,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { invoiceService } from '../../services/customer/invoice.service';
import { PartnerSubscription } from '../../types/partner';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
    subscription: PartnerSubscription;
}

export const AssignedSubscriptionCard: React.FC<Props> = ({ subscription }) => {
    const [showDetails, setShowDetails] = useState(false);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return colors.success;
            case 'paused':
                return colors.warning;
            default:
                return colors.textLight;
        }
    };

    const getTodayStatusLabel = (status: string) => {
        switch (status) {
            case 'scheduled':
                return { label: 'Scheduled', color: colors.primary };
            case 'reaching':
                return { label: 'On Way', color: colors.warning };
            case 'delivered':
                return { label: 'Delivered', color: colors.success };
            case 'no_delivery_today':
                return { label: 'No Delivery', color: colors.textLight };
            default:
                return { label: status, color: colors.textLight };
        }
    };

    const todayStatus = getTodayStatusLabel(subscription.todayDeliveryStatus);

    return (
        <>
            <TouchableOpacity
                style={styles.card}
                onPress={() => setShowDetails(true)}
                activeOpacity={0.8}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.iconContainer}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                <Path d="M8 2v4M16 2v4" />
                                <Path d="M21 8.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.5" />
                                <Path d="M3 10h18" />
                            </Svg>
                        </View>
                        <View>
                            <MonoText size="m" weight="bold">
                                {subscription.subscriptionId}
                            </MonoText>
                            <MonoText size="xs" color={colors.textLight}>
                                {subscription.slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                            </MonoText>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription.status) + '20' }]}>
                        <MonoText size="xs" weight="bold" color={getStatusColor(subscription.status)}>
                            {subscription.status.toUpperCase()}
                        </MonoText>
                    </View>
                </View>

                {/* Customer Info */}
                <View style={styles.customerRow}>
                    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <Circle cx="12" cy="7" r="4" />
                    </Svg>
                    <MonoText size="s" style={styles.customerName}>
                        {subscription.customer.name}
                    </MonoText>
                </View>

                {/* Products Summary */}
                <View style={styles.productsRow}>
                    <MonoText size="xs" color={colors.textLight}>
                        {subscription.products.length} Product{subscription.products.length > 1 ? 's' : ''}: {' '}
                        {subscription.products.map(p => p.productName).join(', ')}
                    </MonoText>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <MonoText size="l" weight="bold" color={colors.primary}>
                            {subscription.remainingDeliveries}
                        </MonoText>
                        <MonoText size="xs" color={colors.textLight}>
                            Remaining
                        </MonoText>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <MonoText size="l" weight="bold" color={colors.success}>
                            {subscription.deliveredCount}
                        </MonoText>
                        <MonoText size="xs" color={colors.textLight}>
                            Delivered
                        </MonoText>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <View style={[styles.todayBadge, { backgroundColor: todayStatus.color + '20' }]}>
                            <MonoText size="xs" weight="bold" color={todayStatus.color}>
                                {todayStatus.label}
                            </MonoText>
                        </View>
                        <MonoText size="xs" color={colors.textLight}>
                            Today
                        </MonoText>
                    </View>
                </View>

                {/* View Details */}
                <View style={styles.viewDetailsRow}>
                    <MonoText size="xs" color={colors.primary} weight="bold">
                        Tap to view details
                    </MonoText>
                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                        <Path d="M9 18l6-6-6-6" />
                    </Svg>
                </View>
            </TouchableOpacity>

            {/* Details Modal */}
            <Modal
                visible={showDetails}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowDetails(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />

                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                            {/* Modal Header */}
                            <View style={styles.modalHeader}>
                                <View>
                                    <MonoText size="xl" weight="bold">
                                        {subscription.subscriptionId}
                                    </MonoText>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription.status) + '20', marginTop: 4 }]}>
                                        <MonoText size="xs" weight="bold" color={getStatusColor(subscription.status)}>
                                            {subscription.status.toUpperCase()}
                                        </MonoText>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => setShowDetails(false)} style={styles.closeBtn}>
                                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                        <Path d="M18 6L6 18M6 6l12 12" />
                                    </Svg>
                                </TouchableOpacity>
                            </View>

                            {/* Customer Section */}
                            <View style={styles.section}>
                                <MonoText size="s" weight="bold" style={styles.sectionTitle}>
                                    Customer Details
                                </MonoText>
                                <View style={styles.sectionCard}>
                                    <View style={styles.detailRow}>
                                        <MonoText size="s" color={colors.textLight}>Name</MonoText>
                                        <MonoText size="s" weight="bold">{subscription.customer.name}</MonoText>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <MonoText size="s" color={colors.textLight}>Phone</MonoText>
                                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${subscription.customer.phone}`)}>
                                            <MonoText size="s" weight="bold" color={colors.primary}>
                                                📞 {subscription.customer.phone}
                                            </MonoText>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <MonoText size="s" color={colors.textLight}>Address</MonoText>
                                        <MonoText size="s" weight="bold" style={{ flex: 1, textAlign: 'right' }}>
                                            {subscription.customer.address}
                                        </MonoText>
                                    </View>
                                </View>
                            </View>

                            {/* Delivery Schedule */}
                            <View style={styles.section}>
                                <MonoText size="s" weight="bold" style={styles.sectionTitle}>
                                    Delivery Schedule
                                </MonoText>
                                <View style={styles.sectionCard}>
                                    <View style={styles.detailRow}>
                                        <MonoText size="s" color={colors.textLight}>Slot</MonoText>
                                        <MonoText size="s" weight="bold">
                                            {subscription.slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                                        </MonoText>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <MonoText size="s" color={colors.textLight}>Start Date</MonoText>
                                        <MonoText size="s" weight="bold">{formatDate(subscription.startDate)}</MonoText>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <MonoText size="s" color={colors.textLight}>End Date</MonoText>
                                        <MonoText size="s" weight="bold">{formatDate(subscription.endDate)}</MonoText>
                                    </View>
                                </View>
                            </View>

                            {/* Delivery Stats */}
                            <View style={styles.section}>
                                <MonoText size="s" weight="bold" style={styles.sectionTitle}>
                                    Delivery Statistics
                                </MonoText>
                                <View style={styles.statsGrid}>
                                    <View style={styles.statBox}>
                                        <MonoText size="xxl" weight="bold" color={colors.primary}>
                                            {subscription.totalDeliveries}
                                        </MonoText>
                                        <MonoText size="xs" color={colors.textLight}>Total</MonoText>
                                    </View>
                                    <View style={styles.statBox}>
                                        <MonoText size="xxl" weight="bold" color={colors.success}>
                                            {subscription.deliveredCount}
                                        </MonoText>
                                        <MonoText size="xs" color={colors.textLight}>Delivered</MonoText>
                                    </View>
                                    <View style={styles.statBox}>
                                        <MonoText size="xxl" weight="bold" color={colors.warning}>
                                            {subscription.remainingDeliveries}
                                        </MonoText>
                                        <MonoText size="xs" color={colors.textLight}>Remaining</MonoText>
                                    </View>
                                </View>
                            </View>

                            {/* Products */}
                            <View style={styles.section}>
                                <MonoText size="s" weight="bold" style={styles.sectionTitle}>
                                    Products ({subscription.products.length})
                                </MonoText>
                                {subscription.products.map((product, index) => (
                                    <View key={index} style={styles.productCard}>
                                        <View style={styles.productHeader}>
                                            <MonoText size="m" weight="bold">{product.productName}</MonoText>
                                            <MonoText size="xs" color={colors.primary}>
                                                {product.deliveryFrequency}
                                            </MonoText>
                                        </View>
                                        <View style={styles.productDetails}>
                                            <View style={styles.productDetailItem}>
                                                <MonoText size="xs" color={colors.textLight}>Quantity</MonoText>
                                                <MonoText size="s" weight="bold">
                                                    {product.quantityValue} {product.quantityUnit}
                                                </MonoText>
                                            </View>
                                            <View style={styles.productDetailItem}>
                                                <MonoText size="xs" color={colors.textLight}>Price</MonoText>
                                                <MonoText size="s" weight="bold">₹{product.unitPrice}/unit</MonoText>
                                            </View>
                                            <View style={styles.productDetailItem}>
                                                <MonoText size="xs" color={colors.textLight}>Monthly</MonoText>
                                                <MonoText size="s" weight="bold" color={colors.primary}>₹{product.monthlyPrice}</MonoText>
                                            </View>
                                        </View>
                                        <View style={styles.productStats}>
                                            <View style={styles.productStatItem}>
                                                <MonoText size="l" weight="bold">{product.totalDeliveries}</MonoText>
                                                <MonoText size="xs" color={colors.textLight}>Total</MonoText>
                                            </View>
                                            <View style={styles.productStatDivider} />
                                            <View style={styles.productStatItem}>
                                                <MonoText size="l" weight="bold" color={colors.success}>{product.deliveredCount}</MonoText>
                                                <MonoText size="xs" color={colors.textLight}>Done</MonoText>
                                            </View>
                                            <View style={styles.productStatDivider} />
                                            <View style={styles.productStatItem}>
                                                <MonoText size="l" weight="bold" color={colors.warning}>{product.remainingDeliveries}</MonoText>
                                                <MonoText size="xs" color={colors.textLight}>Left</MonoText>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>

                            {/* Download Invoice Button */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: colors.black,
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    marginBottom: spacing.m
                                }}
                                onPress={async () => {
                                    await invoiceService.generateSubscriptionInvoice(subscription);
                                }}
                            >
                                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                                    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <Path d="M14 2v6h6" />
                                    <Path d="M12 18v-6" />
                                    <Path d="M9 15l3 3 3-3" />
                                </Svg>
                                <MonoText color={colors.white} weight="bold">Download Invoice</MonoText>
                            </TouchableOpacity>

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.m,
        marginBottom: spacing.m,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.s,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    customerName: {
        marginLeft: spacing.xs,
    },
    productsRow: {
        marginBottom: spacing.m,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: spacing.m,
        marginBottom: spacing.s,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.border,
    },
    todayBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    viewDetailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: spacing.s,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: SCREEN_HEIGHT * 0.85,
        paddingHorizontal: spacing.l,
        paddingBottom: spacing.l,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginVertical: spacing.m,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.l,
    },
    closeBtn: {
        padding: spacing.xs,
    },
    section: {
        marginBottom: spacing.l,
    },
    sectionTitle: {
        marginBottom: spacing.s,
    },
    sectionCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: spacing.m,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statBox: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: spacing.m,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    productCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: spacing.m,
        marginBottom: spacing.s,
    },
    productHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    productDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.m,
    },
    productDetailItem: {
        alignItems: 'center',
    },
    productStats: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: 8,
        padding: spacing.s,
    },
    productStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    productStatDivider: {
        width: 1,
        backgroundColor: colors.border,
    },
});
