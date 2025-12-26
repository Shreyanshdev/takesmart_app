import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Circle, Polyline, Line, Rect } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../shared/MonoText';
import { subscriptionService, Subscription } from '../../services/customer/subscription.service';
import { logger } from '../../utils/logger';

const { width } = Dimensions.get('window');

import { RescheduleModal } from '../../components/subscription/RescheduleModal';
import { SubscriptionExpiredBanner } from './SubscriptionExpiredBanner';

export const SubscriptionCalendarBanner = () => {
    const navigation = useNavigation<any>();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<any>(null);

    const fetchSubscription = useCallback(async () => {
        try {
            setLoading(true);
            const data = await subscriptionService.getMySubscription();
            setSubscription(data);
        } catch (error) {
            logger.log('No active subscription');
            setSubscription(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Re-fetch subscription every time the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchSubscription();
        }, [fetchSubscription])
    );

    // Show loading skeleton or nothing while loading
    if (loading) {
        return null;
    }

    // No subscription - Show Expired banner (Red)
    if (!subscription) {
        return <SubscriptionExpiredBanner />;
    }

    // Generate next 7 days
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        days.push(d);
    }

    const getStatusForDate = (date: Date) => {
        const dateStr = date.toDateString();
        const delivery = subscription.deliveries?.find(d => new Date(d.date).toDateString() === dateStr);

        if (!delivery) return { color: colors.disabled, status: 'none', label: 'No Delivery', delivery: null };

        switch (delivery.status) {
            case 'scheduled':
            case 'reaching':
                return { color: colors.primary, status: 'upcoming', label: 'Scheduled', delivery };
            case 'delivered':
            case 'awaitingCustomer':
                return { color: colors.success, status: 'delivered', label: 'Delivered', delivery };
            case 'canceled':
            case 'noResponse':
            case 'paused':
            case 'concession':
                return { color: colors.error, status: 'cancelled', label: 'Cancelled', delivery };
            default:
                return { color: colors.disabled, status: 'none', label: 'No Delivery', delivery: null };
        }
    };

    const handleDatePress = (delivery: any, isToday: boolean) => {
        if (!delivery) return;
        // Don't allow reschedule for today's delivery (same-day slot changes not supported)
        if (isToday) return;
        // Allow slot change only for scheduled items
        if (delivery.status === 'scheduled' || delivery.status === 'reaching') {
            setSelectedDelivery(delivery);
            setRescheduleModalVisible(true);
        }
    };

    const actionButtons = [
        {
            title: 'Live Farm View',
            icon: (
                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                    <Path d="M23 7l-7 5 7 5V7z" />
                    <Rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </Svg>
            ),
            onPress: () => logger.log('Navigate to Live Farm'),
        },
        {
            title: 'Health Updates',
            icon: (
                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                    <Path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </Svg>
            ),
            onPress: () => navigation.navigate('AnimalHealth'),
        },
        {
            title: 'Manage Deliveries',
            icon: (
                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2">
                    <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <Line x1="16" y1="2" x2="16" y2="6" />
                    <Line x1="8" y1="2" x2="8" y2="6" />
                    <Line x1="3" y1="10" x2="21" y2="10" />
                </Svg>
            ),
            onPress: () => navigation.navigate('SubscriptionCalendar'),
        },
    ];

    return (
        <LinearGradient
            colors={[colors.primary, colors.primary, '#FAFAFA']}
            locations={[0, 0.7, 1]}
            style={styles.container}
        >
            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <View>
                        <MonoText size="xl" weight="bold">My Subscription Schedule</MonoText>
                        <MonoText size="s" style={{ opacity: 0.8 }}>Upcoming 7 Days</MonoText>
                    </View>
                    <TouchableOpacity
                        style={styles.manageBtn}
                        onPress={() => navigation.navigate('SubscriptionCalendar')}
                    >
                        <MonoText size="xs" weight="bold">See All</MonoText>
                    </TouchableOpacity>
                </View>

                {/* Calendar Scroll */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.calendarContainer}
                    style={{ flexGrow: 0 }}
                >
                    {days.map((date, index) => {
                        const { color, status, delivery } = getStatusForDate(date);
                        const isToday = index === 0;
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                        const dayNum = date.getDate();

                        // Fix for visibility: Add border to dot if yellow (primary)
                        const dotStyle = [
                            styles.statusDot,
                            { backgroundColor: color },
                            status === 'upcoming' && { borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' }
                        ];

                        return (
                            <TouchableOpacity
                                key={index}
                                style={[styles.dayItem, isToday && styles.todayItem]}
                                onPress={() => handleDatePress(delivery, isToday)}
                                activeOpacity={delivery ? 0.7 : 1}
                            >
                                <MonoText size="xs" weight={isToday ? "bold" : "regular"} style={{ marginBottom: 4 }}>
                                    {dayName}
                                </MonoText>
                                <View style={dotStyle} />
                                <MonoText size="m" weight="bold" style={{ marginTop: 4 }}>
                                    {dayNum}
                                </MonoText>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Legend - Simplified based on request */}
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors.primary, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' }]} />
                        <MonoText size="xs">Upcoming</MonoText>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                        <MonoText size="xs">Delivered</MonoText>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                        <MonoText size="xs">Cancelled</MonoText>
                    </View>
                </View>

                {/* Today's Delivery Detail Card */}
                {(() => {
                    const todayStr = new Date().toDateString();
                    const todayDelivery = subscription.deliveries?.find(d => new Date(d.date).toDateString() === todayStr);

                    if (!todayDelivery || ['canceled', 'paused'].includes(todayDelivery.status)) return null;

                    const isAwaiting = todayDelivery.status === 'awaitingCustomer';

                    const handleConfirm = async () => {
                        try {
                            setLoading(true);
                            await subscriptionService.confirmDelivery(subscription._id, todayDelivery.date);
                            await fetchSubscription(); // Refresh to update status
                        } catch (error) {
                            logger.error('Error confirming delivery:', error);
                        } finally {
                            setLoading(false);
                        }
                    };

                    return (
                        <View style={styles.todayCard}>
                            <View style={styles.todayHeader}>
                                <MonoText size="m" weight="bold">Today's Delivery</MonoText>
                                <View style={[
                                    styles.todayStatusBadge,
                                    { backgroundColor: isAwaiting ? '#FFF9C4' : (todayDelivery.status === 'delivered' ? '#C8E6C9' : '#E3F2FD') }
                                ]}>
                                    <MonoText size="xs" weight="bold" color={isAwaiting ? '#FBC02D' : (todayDelivery.status === 'delivered' ? '#2E7D32' : '#1565C0')}>
                                        {isAwaiting ? 'Confirm Receipt' : todayDelivery.status.toUpperCase()}
                                    </MonoText>
                                </View>
                            </View>

                            <View style={styles.todayContent}>
                                <View style={styles.slotRow}>
                                    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                                        <Circle cx="12" cy="12" r="10" />
                                        <Polyline points="12 6 12 12 16 14" />
                                    </Svg>
                                    <MonoText size="s" color={colors.textLight} style={{ marginLeft: 6, textTransform: 'capitalize' }}>
                                        {todayDelivery.slot} Slot
                                    </MonoText>
                                </View>

                                <View style={styles.productList}>
                                    {todayDelivery.products && todayDelivery.products.length > 0 ? (
                                        todayDelivery.products.map((prod: any, idx: number) => (
                                            <MonoText key={idx} size="s" style={{ marginTop: 2 }}>
                                                • {prod.productName} x {prod.quantityValue}{prod.quantityUnit}
                                            </MonoText>
                                        ))
                                    ) : (
                                        // Fallback for older data structure or single product
                                        <MonoText size="s" style={{ marginTop: 2 }}>
                                            • {subscription.products[0]?.productName || 'Milk'} x {subscription.products[0]?.quantityValue}{subscription.products[0]?.quantityUnit}
                                        </MonoText>
                                    )}
                                </View>
                            </View>

                            {isAwaiting && (
                                <TouchableOpacity
                                    style={styles.confirmButton}
                                    onPress={handleConfirm}
                                    activeOpacity={0.8}
                                >
                                    <MonoText weight="bold" color={colors.white}>Confirm Delivery Received</MonoText>
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })()}

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    {actionButtons.map((btn, i) => (
                        <TouchableOpacity key={i} style={styles.actionBtn} onPress={btn.onPress} activeOpacity={0.8}>
                            <View style={styles.actionIcon}>
                                {btn.icon}
                            </View>
                            <MonoText size="xs" weight="bold" style={{ textAlign: 'center' }}>
                                {btn.title}
                            </MonoText>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Gradient Fade at Bottom - Improved Blending */}
                <LinearGradient
                    colors={['rgba(250, 250, 250, 0)', '#FAFAFA']}
                    style={styles.gradient}
                    pointerEvents="none"
                />

                {/* Reschedule/Slot Change Modal */}
                {subscription && selectedDelivery && (
                    <RescheduleModal
                        visible={rescheduleModalVisible}
                        onClose={() => setRescheduleModalVisible(false)}
                        delivery={selectedDelivery}
                        subscriptionId={subscription._id}
                        onUpdate={fetchSubscription}
                    />
                )}
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: spacing.l,
        paddingTop: 140, // Match Header Height logic
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    content: {
        paddingHorizontal: spacing.l,
        paddingBottom: spacing.l,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    manageBtn: {
        backgroundColor: 'rgba(255,255,255,0.4)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    calendarContainer: {
        paddingRight: spacing.l,
        gap: 12,
        marginBottom: 20,
    },
    dayItem: {
        width: 50,
        height: 80,
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    todayItem: {
        backgroundColor: colors.white,
        borderColor: colors.white,
        transform: [{ scale: 1.05 }],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 2,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginVertical: 4,
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 24,
        opacity: 0.8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 10,
    },
    actionBtn: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.4)', // Slightly transparent white
        padding: 12, // Reduced padding to fit 3 items row
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
        minHeight: 100, // Fixed height for uniformity
        justifyContent: 'center',
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
        zIndex: 1,
    },
    todayCard: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    todayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    todayStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    todayContent: {
        marginBottom: 12,
    },
    slotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    productList: {
        paddingLeft: 4,
    },
    confirmButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    // Promo Banner Styles
    promoContent: {
        alignItems: 'center',
        paddingTop: 20,
    },
    promoBtn: {
        backgroundColor: colors.white,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    promoActionBtn: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 12,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        minHeight: 100,
        justifyContent: 'center',
    }
});
