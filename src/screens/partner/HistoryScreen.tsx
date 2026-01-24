import React, { useEffect, useCallback, useState } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    RefreshControl,
    StatusBar,
    Platform,
    TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MonoText } from '../../components/shared/MonoText';
import { SkeletonItem } from '../../components/shared/SkeletonLoader';
import { HistoryOrderCard } from '../../components/partner/HistoryOrderCard';
import { usePartnerStore } from '../../store/partnerStore';
import { useAuthStore } from '../../store/authStore';

type FilterType = 'all' | 'delivered' | 'cancelled';

export const HistoryScreen = () => {
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const {
        historyOrders,
        isLoadingHistory,
        fetchHistoryOrders,
    } = usePartnerStore();

    const partnerId = user?._id;
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');

    // Fetch history on mount
    useEffect(() => {
        if (partnerId) {
            fetchHistoryOrders(partnerId);
        }
    }, [partnerId]);

    // Handle refresh
    const handleRefresh = useCallback(() => {
        if (partnerId) {
            fetchHistoryOrders(partnerId);
        }
    }, [partnerId]);

    // Filter orders
    const filteredOrders = historyOrders.filter(order => {
        if (activeFilter === 'all') return true;
        return order.status === activeFilter;
    });

    // Calculate stats
    const deliveredCount = historyOrders.filter(o => o.status === 'delivered').length;
    const cancelledCount = historyOrders.filter(o => o.status === 'cancelled').length;
    const totalEarnings = historyOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
    const totalOrders = historyOrders.length;

    // Render empty state
    const renderEmpty = () => {
        if (isLoadingHistory) return null;

        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <Svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.border} strokeWidth="1.5">
                        <Circle cx="12" cy="12" r="10" />
                        <Path d="M12 6v6l4 2" />
                    </Svg>
                </View>
                <MonoText size="l" weight="bold" style={styles.emptyTitle}>
                    No Order History
                </MonoText>
                <MonoText size="s" color={colors.textLight} style={styles.emptySubtitle}>
                    Completed deliveries will{'\n'}appear here.
                </MonoText>
            </View>
        );
    };

    // Render stats section inside list
    const renderHeader = () => (
        <View style={styles.statsSection}>
            {/* Stats Cards Row */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, styles.statCardPrimary]}>
                    <MonoText size="xxl" weight="bold" color={colors.white}>
                        {deliveredCount}
                    </MonoText>
                    <MonoText size="xxs" color="rgba(255,255,255,0.8)">Delivered</MonoText>
                </View>

                <View style={[styles.statCard, styles.statCardAccent]}>
                    <MonoText size="xxl" weight="bold" color={colors.white}>
                        ₹{totalEarnings.toLocaleString()}
                    </MonoText>
                    <MonoText size="xxs" color="rgba(255,255,255,0.8)">Earnings</MonoText>
                </View>

                <View style={[styles.statCard, styles.statCardError]}>
                    <MonoText size="xxl" weight="bold" color={colors.white}>
                        {cancelledCount}
                    </MonoText>
                    <MonoText size="xxs" color="rgba(255,255,255,0.8)">Cancelled</MonoText>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

            {/* Fixed Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <MonoText size="xl" weight="bold" color={colors.text}>
                    Order History
                </MonoText>
                <MonoText size="xs" color={colors.textLight}>
                    {totalOrders} total orders
                </MonoText>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {(['all', 'delivered', 'cancelled'] as FilterType[]).map((filter) => (
                    <TouchableOpacity
                        key={filter}
                        style={[
                            styles.filterTab,
                            activeFilter === filter && styles.filterTabActive,
                        ]}
                        onPress={() => setActiveFilter(filter)}
                    >
                        <MonoText
                            size="xs"
                            weight={activeFilter === filter ? 'bold' : 'regular'}
                            color={activeFilter === filter ? colors.white : colors.text}
                        >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </MonoText>
                        {filter !== 'all' && (
                            <View style={[
                                styles.filterCount,
                                activeFilter === filter && styles.filterCountActive
                            ]}>
                                <MonoText
                                    size="xxs"
                                    weight="bold"
                                    color={activeFilter === filter ? colors.primary : colors.textLight}
                                >
                                    {filter === 'delivered' ? deliveredCount : cancelledCount}
                                </MonoText>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {/* History List */}
            {isLoadingHistory ? (
                <View style={styles.listContent}>
                    {renderHeader()}
                    {[1, 2, 3, 4, 5].map((i) => (
                        <View key={`skeleton-${i}`} style={styles.skeletonCard}>
                            <View style={styles.skeletonHeader}>
                                <SkeletonItem width={100} height={20} borderRadius={4} />
                                <SkeletonItem width={60} height={20} borderRadius={12} />
                            </View>
                            <View style={{ marginTop: 12 }}>
                                <SkeletonItem width={180} height={16} borderRadius={4} />
                            </View>
                            <View style={{ marginTop: 12 }}>
                                <SkeletonItem width={120} height={14} borderRadius={4} />
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filteredOrders}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => <HistoryOrderCard order={item} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={historyOrders.length > 0 ? renderHeader : null}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoadingHistory}
                            onRefresh={handleRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={renderEmpty}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        backgroundColor: colors.white,
        paddingHorizontal: spacing.m,
        paddingBottom: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.04)',
    },
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.s,
        gap: spacing.s,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
        gap: 6,
    },
    filterTabActive: {
        backgroundColor: colors.primary,
    },
    filterCount: {
        backgroundColor: colors.white,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    filterCountActive: {
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    statsSection: {
        marginBottom: spacing.m,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.s,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.m,
        paddingHorizontal: spacing.s,
        borderRadius: 14,
    },
    statCardPrimary: {
        backgroundColor: colors.primary,
    },
    statCardAccent: {
        backgroundColor: colors.accent,
    },
    statCardError: {
        backgroundColor: '#EF4444',
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
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F5F5F5',
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
    skeletonCard: {
        backgroundColor: colors.white,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    skeletonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
