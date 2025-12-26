import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    RefreshControl,
    StatusBar,
    Platform,
    Alert,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { TodaysDeliveryCard } from '../../components/partner/TodaysDeliveryCard';
import { AssignedSubscriptionCard } from '../../components/partner/AssignedSubscriptionCard';
import { PartnerHeader } from '../../components/partner/PartnerHeader';
import { usePartnerStore } from '../../store/partnerStore';
import { useAuthStore } from '../../store/authStore';
import { partnerService } from '../../services/partner/partner.service';
import { SubscriptionDelivery, PartnerSubscription } from '../../types/partner';

type TabType = 'today' | 'upcoming' | 'assigned';

export const SubscriptionDeliveriesScreen = () => {
    const { user } = useAuthStore();
    const {
        todayDeliveries,
        upcomingDeliveries,
        activeSubscriptions,
        isLoadingSubscriptions,
        subscriptionError,
        fetchDailyDeliveries,
        fetchActiveSubscriptions,
    } = usePartnerStore();

    const partnerId = user?._id;
    const [activeTab, setActiveTab] = useState<TabType>('today');
    const [loadingDeliveryId, setLoadingDeliveryId] = useState<string | null>(null);
    const [localDeliveries, setLocalDeliveries] = useState<SubscriptionDelivery[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null); // null = show all

    // Get unique dates from upcoming deliveries
    const availableDates = useMemo(() => {
        const dates = new Set<string>();
        upcomingDeliveries.forEach(d => {
            const date = new Date(d.date);
            date.setHours(0, 0, 0, 0);
            dates.add(date.toISOString());
        });
        return Array.from(dates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    }, [upcomingDeliveries]);

    // Filter upcoming by selected date
    const filteredUpcoming = useMemo(() => {
        if (!selectedDate) return upcomingDeliveries;
        return upcomingDeliveries.filter(d => {
            const date = new Date(d.date);
            date.setHours(0, 0, 0, 0);
            return date.toISOString() === selectedDate;
        });
    }, [upcomingDeliveries, selectedDate]);

    // Fetch deliveries and subscriptions
    useEffect(() => {
        if (partnerId) {
            fetchDailyDeliveries(partnerId);
            fetchActiveSubscriptions(partnerId);
        }
    }, [partnerId]);

    // Update local state when store updates
    useEffect(() => {
        if (activeTab === 'today') {
            setLocalDeliveries(todayDeliveries);
        } else if (activeTab === 'upcoming') {
            setLocalDeliveries(filteredUpcoming);
        }
    }, [todayDeliveries, filteredUpcoming, activeTab]);

    // Handle refresh
    const handleRefresh = useCallback(() => {
        if (partnerId) {
            fetchDailyDeliveries(partnerId);
            if (activeTab === 'assigned') {
                fetchActiveSubscriptions(partnerId);
            }
        }
    }, [partnerId, activeTab]);

    // Handle start delivery
    const handleStartDelivery = async (delivery: SubscriptionDelivery) => {
        if (!partnerId) return;

        setLoadingDeliveryId(delivery._id);
        try {
            await partnerService.startDeliveryJourney({
                subscriptionId: delivery.subscriptionId,
                deliveryDate: delivery.date,
                deliveryPartnerId: partnerId,
            });

            // Update local state
            setLocalDeliveries(prev =>
                prev.map(d =>
                    d._id === delivery._id
                        ? { ...d, status: 'reaching' as const }
                        : d
                )
            );

            // Refresh from server
            fetchDailyDeliveries(partnerId);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to start delivery');
        }
        setLoadingDeliveryId(null);
    };

    // Handle mark delivered
    const handleMarkDelivered = async (delivery: SubscriptionDelivery) => {
        if (!partnerId) return;

        Alert.alert(
            'Mark as Delivered',
            'Customer will be notified to confirm receipt. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Delivered',
                    onPress: async () => {
                        setLoadingDeliveryId(delivery._id);
                        try {
                            await partnerService.markSubscriptionDelivered({
                                subscriptionId: delivery.subscriptionId,
                                deliveryDate: delivery.date,
                                deliveryPartnerId: partnerId,
                            });

                            // Update local state
                            setLocalDeliveries(prev =>
                                prev.map(d =>
                                    d._id === delivery._id
                                        ? { ...d, status: 'awaitingCustomer' as const }
                                        : d
                                )
                            );

                            fetchDailyDeliveries(partnerId);
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.message || 'Failed to mark as delivered');
                        }
                        setLoadingDeliveryId(null);
                    },
                },
            ]
        );
    };

    // Handle no response
    const handleNoResponse = async (delivery: SubscriptionDelivery) => {
        if (!partnerId) return;

        Alert.alert(
            'No Response',
            'Mark this delivery as "No Response"? The customer was not available and will not receive a concession.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    style: 'destructive',
                    onPress: async () => {
                        setLoadingDeliveryId(delivery._id);
                        try {
                            await partnerService.markDeliveryNoResponse({
                                subscriptionId: delivery.subscriptionId,
                                deliveryDate: delivery.date,
                                deliveryPartnerId: partnerId,
                            });

                            // Update local state
                            setLocalDeliveries(prev =>
                                prev.map(d =>
                                    d._id === delivery._id
                                        ? { ...d, status: 'noResponse' as const }
                                        : d
                                )
                            );

                            fetchDailyDeliveries(partnerId);
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.message || 'Failed to mark as no response');
                        }
                        setLoadingDeliveryId(null);
                    },
                },
            ]
        );
    };

    // Render empty state
    const renderEmpty = () => {
        if (isLoadingSubscriptions) return null;

        const emptyMessages = {
            today: {
                title: 'No Deliveries Today',
                subtitle: "You don't have any subscription\ndeliveries scheduled for today.",
            },
            upcoming: {
                title: 'No Upcoming Deliveries',
                subtitle: "No upcoming subscription\ndeliveries assigned to you.",
            },
            assigned: {
                title: 'No Subscriptions Assigned',
                subtitle: "You don't have any active\nsubscriptions assigned to you.",
            },
        };

        const { title, subtitle } = emptyMessages[activeTab];

        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <Svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={colors.border} strokeWidth="1.5">
                        <Path d="M8 2v4M16 2v4" />
                        <Path d="M3 10h18" />
                        <Path d="M21 8.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6.5" />
                        <Circle cx="17" cy="17" r="3" />
                        <Path d="M18.5 18.5L21 21" />
                    </Svg>
                </View>
                <MonoText size="l" weight="bold" style={styles.emptyTitle}>
                    {title}
                </MonoText>
                <MonoText size="s" color={colors.textLight} style={styles.emptySubtitle}>
                    {subtitle}
                </MonoText>
            </View>
        );
    };

    // Sort deliveries: active ones first (scheduled, reaching), completed ones at bottom (delivered, noResponse)
    const sortedDeliveries = useMemo(() => {
        const statusPriority: Record<string, number> = {
            'scheduled': 0,
            'pending': 0,
            'reaching': 1,
            'awaitingCustomer': 2,
            'delivered': 3,
            'noResponse': 3,
            'canceled': 4,
        };
        return [...localDeliveries].sort((a, b) => {
            const priorityA = statusPriority[a.status] ?? 2;
            const priorityB = statusPriority[b.status] ?? 2;
            return priorityA - priorityB;
        });
    }, [localDeliveries]);

    // Refresh hint component
    const RefreshHint = () => (
        <View style={styles.refreshHintContainer}>
            <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2">
                <Path d="M1 4v6h6M23 20v-6h-6" />
                <Path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </Svg>
            <MonoText size="xs" color={colors.textLight} style={{ marginLeft: 6 }}>Pull down to refresh</MonoText>
        </View>
    );

    // Render today's delivery item (with action buttons)
    const renderTodayDeliveryItem = ({ item }: { item: SubscriptionDelivery }) => (
        <TodaysDeliveryCard
            delivery={item}
            onStartDelivery={handleStartDelivery}
            onMarkDelivered={handleMarkDelivered}
            onNoResponse={handleNoResponse}
            isLoading={loadingDeliveryId === item._id}
            readOnly={false}
            showDate={false}
        />
    );

    // Render upcoming delivery item (read-only, with date)
    const renderUpcomingDeliveryItem = ({ item }: { item: SubscriptionDelivery }) => (
        <TodaysDeliveryCard
            delivery={item}
            readOnly={true}
            showDate={true}
        />
    );

    // Render subscription item
    const renderSubscriptionItem = ({ item }: { item: PartnerSubscription }) => (
        <AssignedSubscriptionCard subscription={item} />
    );

    // Format date for chips
    const formatDateChip = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

            {/* Header with Logout */}
            <PartnerHeader title="Subscriptions" showProfile={false} variant="white" />

            {/* Tab Selector */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'today' && styles.tabActive]}
                    onPress={() => setActiveTab('today')}
                >
                    <MonoText
                        size="xs"
                        weight={activeTab === 'today' ? 'bold' : 'regular'}
                        color={activeTab === 'today' ? colors.primary : colors.textLight}
                    >
                        Today ({todayDeliveries.length})
                    </MonoText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
                    onPress={() => setActiveTab('upcoming')}
                >
                    <MonoText
                        size="xs"
                        weight={activeTab === 'upcoming' ? 'bold' : 'regular'}
                        color={activeTab === 'upcoming' ? colors.primary : colors.textLight}
                    >
                        Upcoming ({upcomingDeliveries.length})
                    </MonoText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'assigned' && styles.tabActive]}
                    onPress={() => setActiveTab('assigned')}
                >
                    <MonoText
                        size="xs"
                        weight={activeTab === 'assigned' ? 'bold' : 'regular'}
                        color={activeTab === 'assigned' ? colors.primary : colors.textLight}
                    >
                        Assigned ({activeSubscriptions.length})
                    </MonoText>
                </TouchableOpacity>
            </View>

            {/* Date Filter for Upcoming Tab */}
            {activeTab === 'upcoming' && availableDates.length > 0 && (
                <View style={styles.dateFilterContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.dateFilterContent}
                    >
                        <TouchableOpacity
                            style={[
                                styles.dateChip,
                                selectedDate === null && styles.dateChipActive
                            ]}
                            onPress={() => setSelectedDate(null)}
                        >
                            <MonoText
                                size="xs"
                                weight={selectedDate === null ? 'bold' : 'regular'}
                                color={selectedDate === null ? colors.white : colors.text}
                            >
                                All
                            </MonoText>
                        </TouchableOpacity>
                        {availableDates.map((dateStr) => (
                            <TouchableOpacity
                                key={dateStr}
                                style={[
                                    styles.dateChip,
                                    selectedDate === dateStr && styles.dateChipActive
                                ]}
                                onPress={() => setSelectedDate(dateStr)}
                            >
                                <MonoText
                                    size="xs"
                                    weight={selectedDate === dateStr ? 'bold' : 'regular'}
                                    color={selectedDate === dateStr ? colors.white : colors.text}
                                >
                                    {formatDateChip(dateStr)}
                                </MonoText>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Content based on active tab */}
            {activeTab === 'assigned' ? (
                <FlatList
                    data={activeSubscriptions}
                    keyExtractor={(item) => item._id}
                    renderItem={renderSubscriptionItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoadingSubscriptions}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    ListHeaderComponent={<RefreshHint />}
                    ListEmptyComponent={renderEmpty}
                />
            ) : activeTab === 'upcoming' ? (
                <FlatList
                    data={filteredUpcoming}
                    keyExtractor={(item) => item._id}
                    renderItem={renderUpcomingDeliveryItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoadingSubscriptions}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    ListHeaderComponent={<RefreshHint />}
                    ListEmptyComponent={renderEmpty}
                />
            ) : (
                <FlatList
                    data={sortedDeliveries}
                    keyExtractor={(item) => item._id}
                    renderItem={renderTodayDeliveryItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoadingSubscriptions}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    ListHeaderComponent={<RefreshHint />}
                    ListEmptyComponent={renderEmpty}
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
        backgroundColor: colors.white,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + spacing.m : 50,
        paddingBottom: spacing.m,
        paddingHorizontal: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        paddingHorizontal: spacing.m,
        paddingBottom: spacing.s,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.s,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: colors.primary,
    },
    dateFilterContainer: {
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dateFilterContent: {
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        gap: spacing.s,
    },
    dateChip: {
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.xs,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
        marginRight: spacing.xs,
    },
    dateChipActive: {
        backgroundColor: colors.primary,
    },
    listContent: {
        padding: spacing.m,
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
    refreshHintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xs,
        marginBottom: spacing.s,
    },
});
