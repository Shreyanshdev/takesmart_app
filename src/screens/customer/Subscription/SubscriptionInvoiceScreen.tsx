import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform, StatusBar, Alert, Share } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Svg, { Path, Circle, Polyline, Line, Rect } from 'react-native-svg';
import { MonoText } from '../../../components/shared/MonoText';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { subscriptionService } from '../../../services/customer/subscription.service';
import { invoiceService } from '../../../services/customer/invoice.service';
import { logger } from '../../../utils/logger';

type RouteParams = {
    params: {
        subscriptionId: string;
    };
};

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'active':
            return { bg: '#DCFCE7', text: '#166534', label: 'Active', icon: '✓' };
        case 'expired':
            return { bg: '#FEE2E2', text: '#991B1B', label: 'Expired', icon: '✕' };
        case 'cancelled':
            return { bg: '#FEF3C7', text: '#92400E', label: 'Cancelled', icon: '!' };
        case 'pending':
            return { bg: '#E0E7FF', text: '#3730A3', label: 'Pending Payment', icon: '⏳' };
        default:
            return { bg: '#F3F4F6', text: '#6B7280', label: status, icon: '•' };
    }
};

export const SubscriptionInvoiceScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'params'>>();
    const { subscriptionId } = route.params;

    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                setLoading(true);
                const response = await subscriptionService.getSubscriptionInvoice(subscriptionId);
                setInvoice(response.invoice);
            } catch (err: any) {
                logger.error('Failed to fetch invoice:', err);
                setError(err.message || 'Failed to load invoice');
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [subscriptionId]);

    const handleDownload = async () => {
        if (!invoice) return;
        await invoiceService.generateSubscriptionInvoice(invoice);
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <MonoText color={colors.textLight} style={{ marginTop: 12 }}>Loading invoice...</MonoText>
            </View>
        );
    }

    if (error || !invoice) {
        return (
            <View style={[styles.container, styles.centered]}>
                <View style={styles.errorIcon}>
                    <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="2">
                        <Circle cx="12" cy="12" r="10" />
                        <Path d="M12 8v4" />
                        <Path d="M12 16h.01" />
                    </Svg>
                </View>
                <MonoText size="m" weight="bold" style={{ marginTop: 16 }}>Invoice Not Found</MonoText>
                <MonoText color={colors.textLight} style={{ marginTop: 8, textAlign: 'center' }}>{error || 'Unable to load this invoice'}</MonoText>
                <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
                    <MonoText weight="bold" color={colors.primary}>Go Back</MonoText>
                </TouchableOpacity>
            </View>
        );
    }

    const statusConfig = getStatusConfig(invoice.status);
    const progressPercent = invoice.totalDeliveries > 0 ? Math.round(((invoice.deliveredCount || 0) / invoice.totalDeliveries) * 100) : 0;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2">
                        <Path d="M19 12H5" />
                        <Path d="M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <MonoText size="l" weight="bold">Invoice</MonoText>
                    <MonoText size="xs" color={colors.primary}>#{invoice.subscriptionId}</MonoText>
                </View>
                <TouchableOpacity onPress={handleDownload} style={styles.headerBtn}>
                    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <Polyline points="7 10 12 15 17 10" />
                        <Line x1="12" y1="15" x2="12" y2="3" />
                    </Svg>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Status Banner */}
                <View style={[styles.statusBanner, { backgroundColor: statusConfig.bg }]}>
                    <View style={styles.statusContent}>
                        <MonoText size="xl" weight="bold" color={statusConfig.text}>{statusConfig.label}</MonoText>
                        <MonoText size="xs" color={statusConfig.text} style={{ marginTop: 2 }}>
                            {invoice.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
                        </MonoText>
                    </View>
                    <View style={[styles.statusIcon, { backgroundColor: statusConfig.text + '20' }]}>
                        <MonoText size="xl">{statusConfig.icon}</MonoText>
                    </View>
                </View>

                {/* Progress Section */}
                <View style={styles.section}>
                    <MonoText weight="bold" size="m" style={styles.sectionTitle}>Delivery Progress</MonoText>

                    <View style={styles.progressStats}>
                        <View style={styles.progressStat}>
                            <MonoText size="xxl" weight="bold" color={colors.success}>{invoice.deliveredCount || 0}</MonoText>
                            <MonoText size="xs" color={colors.textLight}>Delivered</MonoText>
                        </View>
                        <View style={styles.progressDivider} />
                        <View style={styles.progressStat}>
                            <MonoText size="xxl" weight="bold" color={colors.warning}>{invoice.remainingDeliveries || 0}</MonoText>
                            <MonoText size="xs" color={colors.textLight}>Remaining</MonoText>
                        </View>
                        <View style={styles.progressDivider} />
                        <View style={styles.progressStat}>
                            <MonoText size="xxl" weight="bold" color={colors.text}>{invoice.totalDeliveries || 0}</MonoText>
                            <MonoText size="xs" color={colors.textLight}>Total</MonoText>
                        </View>
                    </View>

                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                        </View>
                        <MonoText size="xs" color={colors.textLight} style={{ marginTop: 6 }}>{progressPercent}% complete</MonoText>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Subscription Period */}
                <View style={styles.section}>
                    <MonoText weight="bold" size="m" style={styles.sectionTitle}>Subscription Period</MonoText>
                    <View style={styles.periodRow}>
                        <View style={styles.periodItem}>
                            <View style={styles.periodIcon}>
                                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2">
                                    <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <Line x1="16" y1="2" x2="16" y2="6" />
                                    <Line x1="8" y1="2" x2="8" y2="6" />
                                    <Line x1="3" y1="10" x2="21" y2="10" />
                                </Svg>
                            </View>
                            <View>
                                <MonoText size="xs" color={colors.textLight}>Started</MonoText>
                                <MonoText weight="bold">{new Date(invoice.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</MonoText>
                            </View>
                        </View>
                        <View style={styles.periodArrow}>
                            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                <Path d="M5 12h14" />
                                <Path d="M12 5l7 7-7 7" />
                            </Svg>
                        </View>
                        <View style={styles.periodItem}>
                            <View style={[styles.periodIcon, { backgroundColor: '#FEF2F2' }]}>
                                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="2">
                                    <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <Line x1="16" y1="2" x2="16" y2="6" />
                                    <Line x1="8" y1="2" x2="8" y2="6" />
                                    <Line x1="3" y1="10" x2="21" y2="10" />
                                </Svg>
                            </View>
                            <View>
                                <MonoText size="xs" color={colors.textLight}>Ends</MonoText>
                                <MonoText weight="bold">{new Date(invoice.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</MonoText>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Products */}
                <View style={styles.section}>
                    <MonoText weight="bold" size="m" style={styles.sectionTitle}>Products</MonoText>
                    {invoice.products?.map((product: any, index: number) => (
                        <View key={index} style={styles.productItem}>
                            <View style={styles.productIcon}>
                                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                    <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                    <Line x1="3" y1="6" x2="21" y2="6" />
                                    <Path d="M16 10a4 4 0 0 1-8 0" />
                                </Svg>
                            </View>
                            <View style={styles.productInfo}>
                                <MonoText weight="bold">{product.productName}</MonoText>
                                <MonoText size="xs" color={colors.textLight}>
                                    {product.quantityValue}{product.quantityUnit} • {product.deliveredCount || 0}/{product.totalDeliveries || 0} delivered
                                </MonoText>
                            </View>
                            <MonoText weight="bold" color={colors.primary}>₹{product.monthlyPrice || 0}</MonoText>
                        </View>
                    ))}
                </View>

                <View style={styles.divider} />

                {/* Delivery Address */}
                {invoice.deliveryAddress && (
                    <>
                        <View style={styles.section}>
                            <MonoText weight="bold" size="m" style={styles.sectionTitle}>Delivery Address</MonoText>
                            <View style={styles.addressRow}>
                                <View style={styles.addressIcon}>
                                    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                                        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <Circle cx="12" cy="10" r="3" />
                                    </Svg>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <MonoText size="s" weight="bold">{invoice.deliveryAddress.addressLine1}</MonoText>
                                    {invoice.deliveryAddress.addressLine2 && (
                                        <MonoText size="s" color={colors.textLight}>{invoice.deliveryAddress.addressLine2}</MonoText>
                                    )}
                                    <MonoText size="s" color={colors.textLight}>
                                        {invoice.deliveryAddress.city}, {invoice.deliveryAddress.state} - {invoice.deliveryAddress.zipCode}
                                    </MonoText>
                                </View>
                            </View>
                        </View>
                        <View style={styles.divider} />
                    </>
                )}

                {/* Total Amount */}
                <View style={styles.totalSection}>
                    <View style={styles.totalRow}>
                        <MonoText color={colors.textLight}>Subtotal</MonoText>
                        <MonoText>₹{invoice.bill}</MonoText>
                    </View>
                    <View style={styles.totalRow}>
                        <MonoText color={colors.textLight}>Delivery</MonoText>
                        <MonoText color={colors.success}>FREE</MonoText>
                    </View>
                    <View style={styles.totalDivider} />
                    <View style={styles.totalRow}>
                        <MonoText size="l" weight="bold">Total Amount</MonoText>
                        <MonoText size="xl" weight="bold" color={colors.primary}>₹{invoice.bill}</MonoText>
                    </View>
                    <View style={[styles.paymentBadge, { backgroundColor: invoice.paymentMethod === 'cod' ? '#FEF3C7' : '#DCFCE7' }]}>
                        <MonoText size="xs" weight="bold" color={invoice.paymentMethod === 'cod' ? '#92400E' : '#166534'}>
                            {invoice.paymentMethod === 'cod' ? '💵 To be collected on delivery' : '✓ Payment completed'}
                        </MonoText>
                    </View>
                </View>

                {/* Footer - Company Info */}
                <View style={styles.footer}>
                    <View style={styles.footerLogo}>
                        <MonoText size="m" weight="bold" color={colors.primary}>LUSH & PURE</MonoText>
                    </View>
                    <MonoText size="xs" color={colors.textLight} style={{ textAlign: 'center', marginTop: 4 }}>
                        Fresh Dairy Delivered Daily
                    </MonoText>
                    <MonoText size="xs" color={colors.textLight} style={{ textAlign: 'center', marginTop: 6 }}>
                        📞 +91 7017877512 | 📧 contact@lushandpures.com
                    </MonoText>
                    <MonoText size="xs" color={colors.textLight} style={{ textAlign: 'center', marginTop: 2 }}>
                        📍 Kasera, Mathura, Uttar Pradesh - 281202
                    </MonoText>
                    <MonoText size="xs" color={colors.textLight} style={{ textAlign: 'center', marginTop: 8 }}>
                        Invoice generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </MonoText>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.m,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 60,
        paddingBottom: spacing.m,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingTop: spacing.m,
    },
    statusBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: spacing.m,
        padding: spacing.l,
        borderRadius: 16,
        marginBottom: spacing.m,
    },
    statusContent: {},
    statusIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: {
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
    },
    sectionTitle: {
        marginBottom: spacing.m,
    },
    progressStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    progressStat: {
        alignItems: 'center',
        flex: 1,
    },
    progressDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#E5E7EB',
    },
    progressBarContainer: {
        alignItems: 'center',
    },
    progressBarBg: {
        width: '100%',
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginHorizontal: spacing.m,
        marginVertical: spacing.s,
    },
    periodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    periodItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    periodIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.s,
    },
    periodArrow: {
        paddingHorizontal: spacing.s,
    },
    productItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    productIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F0FDF4',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.m,
    },
    productInfo: {
        flex: 1,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    addressIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.m,
    },
    totalSection: {
        backgroundColor: colors.white,
        marginHorizontal: spacing.m,
        borderRadius: 16,
        padding: spacing.l,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    totalDivider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: spacing.m,
    },
    paymentBadge: {
        alignItems: 'center',
        padding: spacing.s,
        borderRadius: 8,
        marginTop: spacing.s,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        marginTop: spacing.l,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        marginHorizontal: spacing.m,
    },
    footerLogo: {
        paddingVertical: spacing.s,
        paddingHorizontal: spacing.l,
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: 8,
    },
    errorIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    retryBtn: {
        marginTop: spacing.l,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.m,
        backgroundColor: '#E0F2FE',
        borderRadius: 12,
    },
});
