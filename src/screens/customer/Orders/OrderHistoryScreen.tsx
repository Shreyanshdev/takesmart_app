import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, FlatList, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { MonoText } from '../../../components/shared/MonoText';
import { api } from '../../../services/core/api';
import { useAuthStore } from '../../../store/authStore';
import { logger } from '../../../utils/logger';
import { BlurView } from '@react-native-community/blur';
import { SkeletonItem } from '../../../components/shared/SkeletonLoader';

const HEADER_CONTENT_HEIGHT = 56;

// Pulsing Orb Component for "Pending" status
const PulsingOrb = ({ color }: { color: string }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(scale, {
                        toValue: 1.5,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(scale, {
                        toValue: 1,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0.5,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        ).start();
    }, []);

    return (
        <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
                style={{
                    position: 'absolute',
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: color,
                    transform: [{ scale }],
                    opacity,
                }}
            />
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        </View>
    );
};

export const OrderHistoryScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
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
        navigation.navigate('OrderTracking', { orderId, from: 'history' });
    };

    const isActiveStatus = (status: string) =>
        ['pending', 'confirmed', 'accepted', 'preparing', 'out_for_delivery', 'awaitconfirmation', 'in-progress'].includes(status);

    const renderOrderItem = ({ item }: { item: any }) => {
        const isActive = isActiveStatus(item.status);
        const isDelivered = item.status === 'delivered';
        const isPending = item.status === 'pending' || item.status === 'placing_order';
        const isAwaitConfirmation = item.status === 'awaitconfirmation';

        const date = new Date(item.createdAt);
        const formattedDate = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const formattedTime = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        const firstItem = item.items?.[0];
        const totalItems = item.items?.length || 0;
        const itemCountText = `${totalItems} Item${totalItems !== 1 ? 's' : ''}`;

        // Status styling
        let statusText = item.status.replace(/_/g, ' ').replace(/-/g, ' ');

        // Map status to user-friendly labels
        const statusLabels: { [key: string]: string } = {
            'pending': 'Assigning Partner',
            'confirmed': 'Order Confirmed',
            'accepted': 'Partner Assigned',
            'preparing': 'Preparing',
            'out_for_delivery': 'On the Way',
            'in-progress': 'On the Way',
            'awaitconfirmation': 'Confirm Receipt',
            'delivered': 'Delivered',
            'cancelled': 'Cancelled',
        };

        statusText = statusLabels[item.status] || item.status;

        // Render Action Button based on Status
        const renderActionBtn = () => {
            if (isPending) {
                return (
                    <View style={styles.pendingContainer}>
                        <PulsingOrb color={colors.primary} />
                        <MonoText size="xs" color={colors.primary} weight="bold" style={{ marginLeft: 6 }}>
                            Assigning...
                        </MonoText>
                    </View>
                );
            }

            if (isDelivered) {
                return (
                    <TouchableOpacity style={styles.secondaryActionBtn}>
                        <MonoText size="xs" weight="bold" color={colors.text}>Receipt</MonoText>
                        <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" style={{ marginLeft: 4 }}>
                            <Path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </Svg>
                    </TouchableOpacity>
                );
            }

            if (isAwaitConfirmation) {
                return (
                    <TouchableOpacity
                        style={[styles.trackBtnFormatted, { backgroundColor: '#059669', paddingHorizontal: 12 }]}
                        onPress={() => navigateToTracking(item._id)}
                    >
                        <MonoText size="xs" weight="bold" color={colors.white}>Confirm</MonoText>
                        <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2.5" style={{ marginLeft: 4 }}>
                            <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <Polyline points="22 4 12 14.01 9 11.01" />
                        </Svg>
                    </TouchableOpacity>
                );
            }

            if (isActive) {
                return (
                    <TouchableOpacity onPress={() => navigateToTracking(item._id)} style={styles.trackBtnFormatted}>
                        <MonoText size="xs" weight="bold" color={colors.white}>Track</MonoText>
                        <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2.5" style={{ marginLeft: 4 }}>
                            <Path d="M5 12h14M12 5l7 7-7 7" />
                        </Svg>
                    </TouchableOpacity>
                );
            }

            // Default / Cancelled => Details
            return (
                <View style={styles.detailsLink}>
                    <MonoText size="xs" weight="bold" color={colors.textLight}>Details</MonoText>
                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" style={{ marginLeft: 2 }}>
                        <Path d="M9 18l6-6-6-6" />
                    </Svg>
                </View>
            );
        };

        return (
            <TouchableOpacity
                activeOpacity={0.85}
                style={styles.orderCard}
                onPress={() => navigateToTracking(item._id)}
            >
                {/* Glass Background */}
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={15}
                    reducedTransparencyFallbackColor="white"
                />

                {/* Content Container */}
                <View style={styles.cardInnerContent}>

                    {/* Top Section: Date & ID */}
                    <View style={styles.cardHeaderRow}>
                        <View style={styles.tagContainer}>
                            <MonoText size="xs" weight="bold" color={colors.textLight}>
                                #{item._id.slice(-6).toUpperCase()}
                            </MonoText>
                        </View>
                        <MonoText size="xs" color={colors.textLight}>
                            {formattedDate}, {formattedTime}
                        </MonoText>
                    </View>

                    {/* Main Content: Items & Price */}
                    <View style={styles.mainInfoRow}>
                        <View style={styles.itemInfo}>
                            <MonoText weight="bold" size="l" style={{ marginRight: 8 }}>
                                {itemCountText}
                            </MonoText>
                        </View>
                        <MonoText weight="bold" size="l" color={colors.black}>
                            ₹{item.totalPrice}
                        </MonoText>
                    </View>

                    {/* Divider */}
                    <View style={styles.cardDivider} />

                    {/* Bottom Section: Status & Action */}
                    <View style={styles.cardBottomRow}>
                        {/* Status Badge - Coupon Style */}
                        <View style={[
                            styles.statusBadgeNeoglass,
                            {
                                borderColor: isActive ? colors.primary : isDelivered ? '#10B981' : '#9CA3AF',
                                backgroundColor: isActive ? 'rgba(255, 71, 0, 0.05)' : isDelivered ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0)',
                                paddingVertical: 6, // Minimized
                                paddingHorizontal: 10 // Minimized
                            }
                        ]}>
                            {isActive && <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />}
                            <MonoText size="xs" weight="bold" color={isActive ? colors.primary : isDelivered ? '#10B981' : colors.textLight}>
                                {statusText.toUpperCase()}
                            </MonoText>
                        </View>

                        {/* Dynamic Action Button */}
                        {renderActionBtn()}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={[styles.header, { paddingTop: insets.top }]}>
                    <View style={styles.headerContent}>
                        <View style={styles.backBtn}>
                            <SkeletonItem width={24} height={24} borderRadius={12} />
                        </View>
                        <SkeletonItem width={120} height={24} borderRadius={4} style={{ marginLeft: 12 }} />
                    </View>
                </View>
                <View style={styles.listContent}>
                    {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={styles.skeletonOrderCard}>
                            <SkeletonItem width={4} height="100%" borderRadius={0} style={{ position: 'absolute', left: 0 }} />
                            <View style={{ flex: 1, padding: 16 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <SkeletonItem width="50%" height={20} borderRadius={4} />
                                    <SkeletonItem width="20%" height={20} borderRadius={4} />
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <SkeletonItem width="40%" height={14} borderRadius={4} />
                                    <SkeletonItem width="15%" height={14} borderRadius={4} />
                                </View>
                                <View style={{ height: 1, backgroundColor: '#F5F5F5', marginBottom: 14 }} />
                                <SkeletonItem width={100} height={30} borderRadius={15} />
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    const activeCount = orders.filter(o => isActiveStatus(o.status)).length;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={20}
                    reducedTransparencyFallbackColor="white"
                />
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2">
                            <Path d="M19 12H5M12 19l-7-7 7-7" />
                        </Svg>
                    </TouchableOpacity>
                    <MonoText size="l" weight="bold" style={styles.headerTitle}>My Orders</MonoText>
                    <View style={{ width: 40 }} />
                </View>
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
        position: 'relative',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        overflow: 'hidden',
    },
    headerContent: {
        height: HEADER_CONTENT_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    headerTitle: {
        flex: 1,
        marginLeft: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    listWrapper: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 16, // Minimized from 20
        paddingTop: 16,
        paddingBottom: 100,
    },
    orderCard: {
        borderRadius: 16, // Slightly reduced radius for compactness
        marginBottom: 12, // Reduced from 16
        overflow: 'hidden', // Essential for BlurView
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
        // Neoglass shadow
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
            },
            android: {
                elevation: 2,
            },
        }),
    },

    skeletonOrderCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    cardInnerContent: {
        padding: 16, // Minimized from 20
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10, // Minimized from 12
    },
    tagContainer: {
        backgroundColor: 'rgba(0,0,0,0.04)',
        paddingHorizontal: 6, // Minimized
        paddingVertical: 2, // Minimized
        borderRadius: 4,
    },
    mainInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12, // Minimized from 16
    },
    itemInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    cardDivider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.06)',
        marginBottom: 12, // Minimized from 16
    },
    cardBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusBadgeNeoglass: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    trackBtnFormatted: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 6, // Minimized
        paddingHorizontal: 12, // Minimized
        borderRadius: 10,
        ...Platform.select({
            ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    detailsLink: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    secondaryActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6, // Minimized
        paddingHorizontal: 10, // Minimized
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    pendingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
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
