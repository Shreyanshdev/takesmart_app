import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { MonoText } from '../../../components/shared/MonoText';
import { api } from '../../../services/core/api';
import { useAuthStore } from '../../../store/authStore';
import LinearGradient from 'react-native-linear-gradient';
import { logger } from '../../../utils/logger';

export const OrderHistoryScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);

    const fetchOrders = async () => {
        try {
            const response = await api.get('/orders/my-history');
            if (response.data && response.data.orders) {
                setOrders(response.data.orders);
            }
        } catch (error) {
            logger.error('Fetch orders error', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchOrders();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrders();
    };

    const navigateToTracking = (orderId: string) => {
        navigation.navigate('OrderTracking', { orderId });
    };

    const isActiveStatus = (status: string) =>
        ['pending', 'confirmed', 'accepted', 'preparing', 'out_for_delivery', 'awaitconfirmation', 'in-progress'].includes(status);

    const renderOrderItem = ({ item }: { item: any }) => {
        const isActive = isActiveStatus(item.status);
        const isDelivered = item.status === 'delivered';

        const date = new Date(item.createdAt);
        const formattedDate = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const formattedTime = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        const firstItem = item.items?.[0];
        const itemName = firstItem?.item || firstItem?.id?.name || 'Order';
        const moreCount = (item.items?.length || 1) - 1;

        // Status styling
        let statusGradient = ['#F3F4F6', '#E5E7EB'];
        let statusText = item.status.replace(/_/g, ' ').replace(/-/g, ' ');
        let statusTextColor: string = colors.textLight;

        // Map status to user-friendly labels
        const statusLabels: { [key: string]: string } = {
            'pending': 'Pending',
            'confirmed': 'Confirmed',
            'accepted': 'Accepted',
            'preparing': 'Preparing',
            'out_for_delivery': 'On the Way',
            'in-progress': 'On the Way',
            'awaitconfirmation': 'Confirm Receipt',
            'delivered': 'Delivered',
            'cancelled': 'Cancelled',
        };

        statusText = statusLabels[item.status] || item.status;

        if (isActive) {
            if (item.status === 'awaitconfirmation') {
                statusGradient = ['#D1FAE5', '#A7F3D0'];
                statusTextColor = '#065F46';
            } else if (item.status === 'out_for_delivery' || item.status === 'in-progress') {
                statusGradient = ['#DBEAFE', '#BFDBFE'];
                statusTextColor = '#1E40AF';
            } else {
                statusGradient = ['#FEF3C7', '#FDE68A'];
                statusTextColor = '#92400E';
            }
        } else if (isDelivered) {
            statusGradient = ['#D1FAE5', '#A7F3D0'];
            statusTextColor = '#065F46';
        }

        return (
            <TouchableOpacity
                activeOpacity={0.85}
                style={styles.orderCard}
                onPress={() => navigateToTracking(item._id)}
            >
                {/* Left accent bar */}
                <View style={[
                    styles.accentBar,
                    { backgroundColor: isActive ? colors.primary : isDelivered ? '#10B981' : '#9CA3AF' }
                ]} />

                <View style={styles.cardContent}>
                    {/* Top row */}
                    <View style={styles.topRow}>
                        <View style={styles.itemInfo}>
                            <MonoText weight="bold" size="m" numberOfLines={1} style={{ maxWidth: 180 }}>
                                {itemName}
                            </MonoText>
                            {moreCount > 0 && (
                                <View style={styles.moreBadge}>
                                    <MonoText size="xs" color={colors.textLight}>+{moreCount}</MonoText>
                                </View>
                            )}
                        </View>
                        <MonoText weight="bold" size="l" color={colors.black}>
                            ₹{item.totalPrice}
                        </MonoText>
                    </View>

                    {/* Middle row - date & order id */}
                    <View style={styles.middleRow}>
                        <MonoText size="s" color={colors.textLight}>
                            {formattedDate} at {formattedTime}
                        </MonoText>
                        <MonoText size="xs" color={colors.textLight} style={styles.orderId}>
                            #{item._id.slice(-6).toUpperCase()}
                        </MonoText>
                    </View>

                    {/* Bottom row - status */}
                    <View style={styles.bottomRow}>
                        <LinearGradient
                            colors={statusGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.statusPill}
                        >
                            {isActive && <View style={styles.liveDot} />}
                            <MonoText size="xs" weight="bold" color={statusTextColor}>
                                {statusText.toUpperCase()}
                            </MonoText>
                        </LinearGradient>

                        {isActive && (
                            <View style={styles.trackBtn}>
                                <MonoText size="xs" weight="bold" color={colors.primary}>Track</MonoText>
                                <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2.5">
                                    <Path d="M5 12h14M12 5l7 7-7 7" />
                                </Svg>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    const activeCount = orders.filter(o => isActiveStatus(o.status)).length;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2.5">
                        <Path d="M19 12H5M12 19l-7-7 7-7" />
                    </Svg>
                </TouchableOpacity>
                <View>
                    <MonoText size="l" weight="bold">My Orders</MonoText>
                    {activeCount > 0 && (
                        <MonoText size="xs" color={colors.primary}>{activeCount} active</MonoText>
                    )}
                </View>
                <View style={{ width: 44 }} />
            </View>

            {/* Orders List */}
            <View style={styles.listWrapper}>
                <FlatList
                    data={orders}
                    renderItem={renderOrderItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconWrap}>
                                <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="1.5">
                                    <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                    <Path d="M3 6h18" />
                                    <Path d="M16 10a4 4 0 0 1-8 0" />
                                </Svg>
                            </View>
                            <MonoText weight="bold" size="m" style={{ marginTop: 20 }}>No orders yet</MonoText>
                            <MonoText size="s" color={colors.textLight} style={{ marginTop: 8, textAlign: 'center' }}>
                                Your order history will appear here
                            </MonoText>
                            <TouchableOpacity
                                style={styles.shopNowBtn}
                                onPress={() => navigation.navigate('Home')}
                            >
                                <MonoText weight="bold" color={colors.white}>Shop Now</MonoText>
                            </TouchableOpacity>
                        </View>
                    }
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 44 : 56,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F8F9FA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    listWrapper: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 100,
    },
    orderCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 14,
        overflow: 'hidden',
        // Soft shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    accentBar: {
        width: 4,
    },
    cardContent: {
        flex: 1,
        padding: 16,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    itemInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    moreBadge: {
        marginLeft: 8,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    middleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    orderId: {
        fontFamily: 'monospace',
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#F59E0B',
        marginRight: 6,
    },
    trackBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        paddingHorizontal: 40,
    },
    emptyIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shopNowBtn: {
        marginTop: 28,
        backgroundColor: colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 25,
    },
});
