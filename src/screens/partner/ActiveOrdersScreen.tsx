import React, { useEffect, useCallback, useState } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    RefreshControl,
    StatusBar,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { SkeletonItem } from '../../components/shared/SkeletonLoader';
import { ActiveOrderCard } from '../../components/partner/ActiveOrderCard';
import { PartnerHeader } from '../../components/partner/PartnerHeader';
import { usePartnerStore } from '../../store/partnerStore';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/core/socket.service';
import { PartnerOrder } from '../../types/partner';
import { logger } from '../../utils/logger';

export const ActiveOrdersScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const {
        activeOrders,
        isLoadingActive,
        fetchActiveOrders,
        pickupOrder,
        markDelivered,
        updateOrderInList,
        moveToHistory,
    } = usePartnerStore();

    const partnerId = user?._id;
    const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);

    // Fetch active orders
    useEffect(() => {
        if (partnerId) {
            fetchActiveOrders(partnerId);
        }
    }, [partnerId]);

    // Setup socket listeners for order updates
    useEffect(() => {
        if (!partnerId) return;

        // Join delivery partner room
        socketService.joinDeliveryPartnerRoom(partnerId);

        // Listen for order status updates
        socketService.on('orderStatusUpdated', (order: PartnerOrder) => {
            logger.log('Order status updated:', order._id, order.status);
            updateOrderInList(order);
        });

        // Listen for delivery confirmations
        socketService.on('deliveryConfirmed', (order: PartnerOrder) => {
            logger.log('Delivery confirmed by customer:', order._id);
            moveToHistory(order._id);
        });

        // Listen for order completion
        socketService.on('orderCompleted', (data: { orderId: string; status: string }) => {
            logger.log('Order completed:', data.orderId, data.status);
            moveToHistory(data.orderId);
        });

        return () => {
            socketService.off('orderStatusUpdated');
            socketService.off('deliveryConfirmed');
            socketService.off('orderCompleted');
        };
    }, [partnerId]);

    // Handle refresh
    const handleRefresh = useCallback(() => {
        if (partnerId) {
            fetchActiveOrders(partnerId);
        }
    }, [partnerId]);

    // Handle pickup
    const handlePickup = async (order: PartnerOrder) => {
        if (!partnerId) return;

        setLoadingOrderId(order._id);
        try {
            const success = await pickupOrder(order._id, partnerId);
            if (!success) {
                Alert.alert('Error', 'Failed to mark order as picked up. Please try again.');
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        }
        setLoadingOrderId(null);
    };

    // Handle mark delivered
    const handleDelivered = async (order: PartnerOrder) => {
        if (!partnerId) return;

        Alert.alert(
            'Mark as Delivered',
            'Are you sure you have delivered this order to the customer?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Delivered',
                    onPress: async () => {
                        setLoadingOrderId(order._id);
                        try {
                            const success = await markDelivered(order._id, partnerId);
                            if (!success) {
                                Alert.alert('Error', 'Failed to mark order as delivered. Please try again.');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Something went wrong. Please try again.');
                        }
                        setLoadingOrderId(null);
                    },
                },
            ]
        );
    };

    // Handle view details - navigate to tracking screen
    const handleViewDetails = (order: PartnerOrder) => {
        navigation.navigate('PartnerOrderTracking', { order });
    };

    // Render empty state
    const renderEmpty = () => {
        if (isLoadingActive) return null;

        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <Svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={colors.border} strokeWidth="1.5">
                        <Path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </Svg>
                </View>
                <MonoText size="l" weight="bold" style={styles.emptyTitle}>
                    No Active Orders
                </MonoText>
                <MonoText size="s" color={colors.textLight} style={styles.emptySubtitle}>
                    Accept orders from the Home tab{'\n'}to start delivering.
                </MonoText>
            </View>
        );
    };

    // Sort orders: in-progress (need to mark delivered) → accepted (need to pickup) → awaitconfirmation (waiting)
    const sortedOrders = [...activeOrders].sort((a, b) => {
        const statusOrder: Record<string, number> = {
            'in-progress': 0,  // Need to mark as delivered (most urgent)
            'accepted': 1,     // Need to pickup from branch
            'awaitconfirmation': 2, // Waiting for customer confirmation (least urgent)
        };
        const priorityA = statusOrder[a.status] ?? 3;
        const priorityB = statusOrder[b.status] ?? 3;
        return priorityA - priorityB;
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Premium Header */}
            <BlurView
                blurType="light"
                blurAmount={15}
                reducedTransparencyFallbackColor="white"
                style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'android' ? 10 : 0) }]}
            >
                <View style={styles.headerContent}>
                    <MonoText size="l" weight="bold">Active Orders</MonoText>
                    {isLoadingActive && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 10 }} />}
                </View>
            </BlurView>

            {/* Orders List */}
            <FlatList
                data={sortedOrders}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <ActiveOrderCard
                        order={item}
                        onPickup={handlePickup}
                        onDelivered={handleDelivered}
                        onViewDetails={handleViewDetails}
                        isLoading={loadingOrderId === item._id}
                    />
                )}
                contentContainerStyle={[styles.listContent, { paddingTop: insets.top + (Platform.OS === 'ios' ? 80 : 100) }]}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={() => (
                    <>
                        {/* Order Count Section */}
                        <View style={styles.orderCountSection}>
                            <View style={styles.counterCard}>
                                <View style={styles.counterMain}>
                                    <MonoText size="xxxl" weight="bold" color={colors.primary}>
                                        {activeOrders.length}
                                    </MonoText>
                                    <MonoText size="xs" weight="bold" color={colors.textLight} style={{ marginTop: -4 }}>
                                        CURRENTLY ACTIVE
                                    </MonoText>
                                </View>
                                {activeOrders.length > 0 && (
                                    <View style={styles.infoRow}>
                                        <View style={styles.infoDot} />
                                        <MonoText size="xxs" color={colors.textLight} weight="semiBold">
                                            {activeOrders.filter(o => o.status === 'in-progress').length} In Transit • {activeOrders.filter(o => o.status === 'accepted').length} To Pickup
                                        </MonoText>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Banner */}
                        {activeOrders.length > 0 && (
                            <View style={styles.infoBanner}>
                                <View style={styles.bannerIcon}>
                                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth="2.5">
                                        <Circle cx="12" cy="12" r="10" />
                                        <Path d="M12 16v-4M12 8h.01" />
                                    </Svg>
                                </View>
                                <MonoText size="xs" weight="semiBold" color={colors.black} style={{ flex: 1, marginLeft: 8 }}>
                                    Follow the steps to complete deliveries!
                                </MonoText>
                            </View>
                        )}

                        {isLoadingActive && (
                            <View>
                                {[1, 2, 3].map((i) => (
                                    <View key={`skeleton-${i}`} style={styles.skeletonCard}>
                                        <View style={styles.skeletonHeader}>
                                            <SkeletonItem width={120} height={20} borderRadius={4} />
                                            <SkeletonItem width={80} height={20} borderRadius={12} />
                                        </View>
                                        <View style={{ marginTop: 12 }}>
                                            <SkeletonItem width={200} height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                                            <SkeletonItem width={150} height={16} borderRadius={4} />
                                        </View>
                                        <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <SkeletonItem width={80} height={36} borderRadius={12} />
                                            <SkeletonItem width={80} height={36} borderRadius={12} />
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoadingActive}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                        progressViewOffset={insets.top + 80}
                    />
                }
                ListEmptyComponent={renderEmpty}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        paddingHorizontal: spacing.m,
    },
    orderCountSection: {
        paddingHorizontal: spacing.m,
        marginBottom: spacing.m,
        marginTop: spacing.s,
    },
    counterCard: {
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.03)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.05,
                shadowRadius: 20,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    counterMain: {
        alignItems: 'center',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    infoDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
        marginRight: 6,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        marginHorizontal: spacing.m,
        padding: 12,
        borderRadius: 16,
        marginBottom: spacing.m,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
    },
    bannerIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.black,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingHorizontal: spacing.m,
        paddingBottom: 100,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.l,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    emptyTitle: {
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        textAlign: 'center',
        lineHeight: 22,
    },
    skeletonCard: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    skeletonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
