import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, StatusBar, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import { MonoText } from '../../../components/shared/MonoText';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { subscriptionService } from '../../../services/customer/subscription.service';
import { logger } from '../../../utils/logger';

interface SubscriptionSummary {
    _id: string;
    subscriptionId: string;
    status: 'active' | 'expired' | 'cancelled' | 'pending';
    products: Array<{
        productName: string;
        quantityValue: number;
        quantityUnit: string;
    }>;
    startDate: string;
    endDate: string;
    bill: number;
    totalDeliveries: number;
    deliveredCount: number;
    paymentDetails?: {
        paymentMethod?: 'online' | 'cod';
    };
}

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'active':
            return { bg: '#DCFCE7', text: '#166534', label: 'Active' };
        case 'expired':
            return { bg: '#FEE2E2', text: '#991B1B', label: 'Expired' };
        case 'cancelled':
            return { bg: '#FEF3C7', text: '#92400E', label: 'Cancelled' };
        case 'pending':
            return { bg: '#E0E7FF', text: '#3730A3', label: 'Pending' };
        default:
            return { bg: '#F3F4F6', text: '#6B7280', label: status };
    }
};

export const SubscriptionHistoryScreen = () => {
    const navigation = useNavigation<any>();
    const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSubscriptions = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await subscriptionService.getSubscriptionHistory();
            setSubscriptions(response.subscriptions || []);
        } catch (err: any) {
            logger.error('Failed to fetch subscriptions:', err);
            setError(err.message || 'Failed to load subscription history');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchSubscriptions();
        }, [])
    );

    const renderItem = ({ item }: { item: SubscriptionSummary }) => {
        const statusConfig = getStatusConfig(item.status);
        const paymentMethod = item.paymentDetails?.paymentMethod === 'cod' ? 'COD' : 'Paid';

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('SubscriptionInvoice', { subscriptionId: item._id })}
            >
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View>
                        <MonoText size="xs" color={colors.textLight}>Subscription ID</MonoText>
                        <MonoText size="s" weight="bold">#{item.subscriptionId}</MonoText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                        <MonoText size="xs" weight="bold" color={statusConfig.text}>
                            {statusConfig.label}
                        </MonoText>
                    </View>
                </View>

                {/* Products */}
                <View style={styles.productsRow}>
                    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                        <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        <Path d="M3 6h18" />
                        <Path d="M16 10a4 4 0 0 1-8 0" />
                    </Svg>
                    <MonoText size="s" color={colors.text} style={{ flex: 1, marginLeft: 8 }} numberOfLines={1}>
                        {item.products.map(p => `${p.productName}`).join(', ')}
                    </MonoText>
                </View>

                {/* Dates & Info */}
                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <MonoText size="xs" color={colors.textLight}>Duration</MonoText>
                        <MonoText size="xs" weight="bold">
                            {new Date(item.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - {new Date(item.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </MonoText>
                    </View>
                    <View style={styles.infoItem}>
                        <MonoText size="xs" color={colors.textLight}>Deliveries</MonoText>
                        <MonoText size="xs" weight="bold">{item.deliveredCount || 0}/{item.totalDeliveries || 0}</MonoText>
                    </View>
                    <View style={styles.infoItem}>
                        <MonoText size="xs" color={colors.textLight}>Payment</MonoText>
                        <MonoText size="xs" weight="bold" color={paymentMethod === 'COD' ? colors.warning : colors.success}>
                            {paymentMethod}
                        </MonoText>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                    <MonoText size="m" weight="bold" color={colors.primary}>₹{item.bill}</MonoText>
                    <View style={styles.viewInvoice}>
                        <MonoText size="xs" weight="bold" color={colors.primary}>View Invoice</MonoText>
                        <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <Polyline points="9 18 15 12 9 6" />
                        </Svg>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2">
                        <Path d="M19 12H5" />
                        <Path d="M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>
                <MonoText size="l" weight="bold">Subscription History</MonoText>
                <View style={{ width: 40 }} />
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <MonoText color={colors.textLight} style={{ marginTop: 12 }}>Loading...</MonoText>
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1">
                        <Circle cx="12" cy="12" r="10" />
                        <Path d="M12 8v4" />
                        <Path d="M12 16h.01" />
                    </Svg>
                    <MonoText color={colors.textLight} style={{ marginTop: 12, textAlign: 'center' }}>{error}</MonoText>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchSubscriptions}>
                        <MonoText weight="bold" color={colors.primary}>Retry</MonoText>
                    </TouchableOpacity>
                </View>
            ) : subscriptions.length === 0 ? (
                <View style={styles.centered}>
                    <Svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1">
                        <Circle cx="12" cy="12" r="10" />
                        <Path d="M12 6v6l4 2" />
                    </Svg>
                    <MonoText size="m" weight="bold" style={{ marginTop: 16 }}>No Subscriptions Yet</MonoText>
                    <MonoText color={colors.textLight} style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: spacing.l }}>
                        Start a subscription to get fresh dairy delivered daily!
                    </MonoText>
                    <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('Home')}>
                        <MonoText weight="bold" color={colors.white}>Browse Products</MonoText>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={subscriptions}
                    renderItem={renderItem}
                    keyExtractor={(item: any) => item._id}
                    contentContainerStyle={{ padding: spacing.m }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
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
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.m,
        marginBottom: spacing.m,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.s,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    productsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: spacing.s,
        borderRadius: 8,
        marginBottom: spacing.s,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.s,
    },
    infoItem: {
        alignItems: 'center',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.s,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    viewInvoice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    retryBtn: {
        marginTop: spacing.m,
        paddingHorizontal: spacing.l,
        paddingVertical: spacing.s,
        backgroundColor: '#E0F2FE',
        borderRadius: 8,
    },
    startBtn: {
        marginTop: spacing.l,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.m,
        backgroundColor: colors.primary,
        borderRadius: 12,
    },
});
