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
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { ActiveOrderCard } from '../../components/partner/ActiveOrderCard';
import { PartnerHeader } from '../../components/partner/PartnerHeader';
import { usePartnerStore } from '../../store/partnerStore';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/core/socket.service';
import { PartnerOrder } from '../../types/partner';
import { logger } from '../../utils/logger';

export const ActiveOrdersScreen = () => {
    const navigation = useNavigation<any>();
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
            <StatusBar barStyle="dark-content" backgroundColor={colors.accent} />

            {/* Header */}
            <PartnerHeader title="Active Orders" showProfile={false} variant="white" />

            {/* Order Count Section - Matching PartnerHomeScreen style */}
            <View style={styles.orderCountSection}>
                <View style={styles.orderCountBadge}>
                    <MonoText size="xxl" weight="bold" color={colors.accent}>
                        {activeOrders.length}
                    </MonoText>
                    <MonoText size="xxs" color={colors.textLight}>
                        ACTIVE
                    </MonoText>
                </View>
            </View>

            {/* Info Banner */}
            {activeOrders.length > 0 && (
                <View style={styles.infoBanner}>
                    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2">
                        <Circle cx="12" cy="12" r="10" />
                        <Path d="M12 16v-4M12 8h.01" />
                    </Svg>
                    <MonoText size="xs" color={colors.accent} style={{ marginLeft: spacing.xs, flex: 1 }}>
                        Pick up → Deliver → Wait for confirmation
                    </MonoText>
                </View>
            )}

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
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoadingActive}
                        onRefresh={handleRefresh}
                        colors={[colors.accent]}
                        tintColor={colors.accent}
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
        backgroundColor: '#FAFAFA',
    },
    orderCountSection: {
        alignItems: 'center',
        marginTop: -spacing.l,
        marginBottom: spacing.s,
    },
    orderCountBadge: {
        backgroundColor: colors.white,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.accent}15`,
        marginHorizontal: spacing.m,
        padding: spacing.s,
        borderRadius: 10,
        marginBottom: spacing.s,
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
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.m,
    },
    emptyTitle: {
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        textAlign: 'center',
        lineHeight: 22,
    },
});
