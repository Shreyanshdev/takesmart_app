import React, { useEffect, useCallback, useState } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    RefreshControl,
    StatusBar,
    Platform,
    ActivityIndicator,
    TouchableOpacity,
    PermissionsAndroid,
    Linking,
    Alert,
} from 'react-native';
import GetLocation from 'react-native-get-location';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { AvailableOrderCard } from '../../components/partner/AvailableOrderCard';
import { OrderDetailModal } from '../../components/partner/OrderDetailModal';
import { PartnerHeader } from '../../components/partner/PartnerHeader';
import { LocationPermissionModal } from '../../components/shared/LocationPermissionModal';
import { usePartnerStore } from '../../store/partnerStore';
import { useAuthStore } from '../../store/authStore';
import { socketService } from '../../services/core/socket.service';
import { PartnerOrder } from '../../types/partner';
import { DeliveryPartner } from '../../types/auth';
import { logger } from '../../utils/logger';

export const PartnerHomeScreen = () => {
    const { user } = useAuthStore();
    const {
        availableOrders,
        isLoadingAvailable,
        availableError,
        fetchAvailableOrders,
        addAvailableOrder,
        removeAvailableOrder,
        selectedOrder,
        isModalVisible,
        setSelectedOrder,
        setModalVisible,
        acceptOrder,
    } = usePartnerStore();

    const [showLocationModal, setShowLocationModal] = useState(false);

    // Get branch ID from user (delivery partner should have branch assigned)
    const partnerUser = user as DeliveryPartner | null;
    const branchId = partnerUser?.branch;
    const partnerId = user?._id;
    const partnerName = user?.name || 'Partner';

    // Debug log to help identify issues
    useEffect(() => {
        logger.debug('Partner', 'User Data:', JSON.stringify(user, null, 2));
        logger.debug('Partner', 'Branch ID:', branchId);
    }, [user, branchId]);

    // Fetch orders on mount
    useEffect(() => {
        if (branchId) {
            logger.log('Fetching available orders for branch:', branchId);
            fetchAvailableOrders(branchId);
        } else {
            logger.warn('No branch ID found - cannot fetch available orders');
        }
    }, [branchId]);

    // Setup socket connection
    useEffect(() => {
        if (!branchId || !partnerId) return;

        const socket = socketService.connect();

        // Join branch room for available orders
        socketService.joinBranchRoom(branchId);
        socketService.joinDeliveryPartnerRoom(partnerId);

        // Listen for new orders
        socketService.on('newOrderAvailable', (order: PartnerOrder) => {
            logger.log('New order available:', order.orderId);
            addAvailableOrder(order);
        });

        // Listen for orders accepted by other partners
        socketService.on('orderAcceptedByOther', (orderId: string) => {
            logger.log('Order accepted by another partner:', orderId);
            removeAvailableOrder(orderId);
        });

        return () => {
            socketService.off('newOrderAvailable');
            socketService.off('orderAcceptedByOther');
        };
    }, [branchId, partnerId]);

    // Handle refresh
    const handleRefresh = useCallback(() => {
        if (branchId) {
            fetchAvailableOrders(branchId);
        }
    }, [branchId]);

    // Handle order press
    const handleOrderPress = (order: PartnerOrder) => {
        setSelectedOrder(order);
        setModalVisible(true);
    };

    // Handle accept order
    const handleAcceptOrder = async (order: PartnerOrder): Promise<boolean> => {
        if (!partnerId) return false;

        // Check location permission before accepting
        try {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    setShowLocationModal(true);
                    return false;
                }
            }

            // Check if location is actually enabled
            try {
                await GetLocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 5000,
                });
            } catch (err) {
                setShowLocationModal(true);
                return false;
            }

            return await acceptOrder(order._id, partnerId);
        } catch (error) {
            logger.error('handleAcceptOrder error', error);
            setShowLocationModal(true);
            return false;
        }
    };

    const handleEnableLocation = async () => {
        if (Platform.OS === 'android') {
            await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
        } else {
            Linking.openSettings();
        }
        setShowLocationModal(false);
    };

    // Handle modal close
    const handleModalClose = () => {
        setModalVisible(false);
        setSelectedOrder(null);
    };

    // Render empty state
    const renderEmpty = () => {
        if (isLoadingAvailable) return null;

        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <Svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={colors.border} strokeWidth="1.5">
                        <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        <Path d="M3 6h18" />
                        <Path d="M16 10a4 4 0 0 1-8 0" />
                    </Svg>
                </View>
                <MonoText size="l" weight="bold" style={styles.emptyTitle}>
                    No Orders Available
                </MonoText>
                <MonoText size="s" color={colors.textLight} style={styles.emptySubtitle}>
                    New orders will appear here.{'\n'}Pull down to refresh.
                </MonoText>
            </View>
        );
    };

    // Render error state
    if (availableError && availableOrders.length === 0) {
        return (
            <View style={[styles.container, styles.center]}>
                <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />
                <MonoText size="l" weight="bold" color={colors.error} style={{ marginBottom: spacing.s }}>
                    Oops!
                </MonoText>
                <MonoText size="s" color={colors.text} style={{ textAlign: 'center', marginBottom: spacing.l }}>
                    {availableError}
                </MonoText>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleRefresh}
                >
                    <MonoText size="s" weight="bold" color={colors.black}>Try Again</MonoText>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

            {/* Header with Logout */}
            <PartnerHeader variant="primary" />

            {/* Order Count Badge */}
            <View style={styles.orderCountSection}>
                <View style={styles.orderCountBadge}>
                    <MonoText size="xxl" weight="bold" color={colors.primary}>
                        {availableOrders.length}
                    </MonoText>
                    <MonoText size="xxs" color={colors.textLight}>
                        AVAILABLE
                    </MonoText>
                </View>
            </View>

            {/* Section Title */}
            <View style={styles.sectionHeader}>
                <MonoText size="m" weight="bold">Available Orders</MonoText>
                {isLoadingAvailable && (
                    <ActivityIndicator size="small" color={colors.primary} />
                )}
            </View>

            {/* Orders List */}
            <FlatList
                data={availableOrders}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <AvailableOrderCard order={item} onPress={handleOrderPress} />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoadingAvailable}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={renderEmpty}
            />

            {/* Order Detail Modal */}
            <OrderDetailModal
                visible={isModalVisible}
                order={selectedOrder}
                onClose={handleModalClose}
                onAccept={handleAcceptOrder}
            />

            {/* Location Permission Modal */}
            <LocationPermissionModal
                visible={showLocationModal}
                onRequestPermission={handleEnableLocation}
                onClose={() => setShowLocationModal(false)}
            />
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
        padding: spacing.l,
    },
    header: {
        backgroundColor: colors.primary,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + spacing.m : 50,
        paddingBottom: spacing.l,
        paddingHorizontal: spacing.m,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.s,
        borderWidth: 2,
        borderColor: colors.white,
    },
    greetingText: {
        justifyContent: 'center',
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
    orderCountSection: {
        alignItems: 'center',
        marginTop: -spacing.l,
        marginBottom: spacing.s,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.m,
        paddingTop: spacing.m,
        paddingBottom: spacing.s,
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
    retryButton: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
});
